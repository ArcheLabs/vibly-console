import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  CoordinatorSessionError,
  resolveCoordinatorCredentials,
} from "@/lib/server/coordinatorSession";

// Reserved query keys whose presence on a request hints at a legacy
// transport (token/target in the URL). They are stripped before the
// request reaches the upstream Coordinator and never honoured for
// credential or routing decisions.
const RESERVED_QUERY_KEYS = ["__coordinatorUrl", "__apiToken"];

function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function upstreamUnavailable(target: URL, cause: unknown): NextResponse {
  const message = cause instanceof Error ? cause.message : String(cause);
  return jsonError(
    502,
    "COORDINATOR_UPSTREAM_UNAVAILABLE",
    `Unable to reach Coordinator at ${target.origin}: ${message}`,
  );
}

function readEnvelopeData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const data = (value as Record<string, unknown>).data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
}

async function validateWalletSession(baseUrl: string, walletSession: string): Promise<string | null> {
  const target = new URL("/wallet/session", baseUrl);
  const response = await fetchCoordinator(target, {
    method: "GET",
    headers: { "x-wallet-session": walletSession },
  });
  if (!response.ok) return null;
  const data = readEnvelopeData(await response.json().catch(() => null));
  const session = data?.session;
  if (!session || typeof session !== "object") return null;
  const address = (session as Record<string, unknown>).address;
  return typeof address === "string" && address.length > 0 ? address : null;
}

function assertWalletPrincipal(body: string, walletPrincipalId: string): NextResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return jsonError(400, "INVALID_ACTION_INTENT_BODY", "ActionIntent body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    return jsonError(400, "INVALID_ACTION_INTENT_BODY", "ActionIntent body must be a JSON object.");
  }
  const principalId = (parsed as Record<string, unknown>).principalId;
  if (principalId !== walletPrincipalId) {
    return jsonError(403, "WALLET_PRINCIPAL_MISMATCH", "ActionIntent principalId must match the wallet session address.");
  }
  return null;
}

async function fetchCoordinator(target: URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(target, init);
  } catch (cause) {
    if (target.hostname !== "localhost") throw cause;
    const fallback = new URL(target);
    fallback.hostname = "127.0.0.1";
    try {
      return await fetch(fallback, init);
    } catch {
      throw cause;
    }
  }
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const routePath = `/${path.join("/")}`;
  const session = await auth();
  const allowAnonymousRead = request.method === "GET" || request.method === "HEAD";
  const allowAnonymousWalletAuth =
    request.method === "POST" &&
    (routePath === "/wallet/challenges" || routePath === "/wallet/sessions");
  const walletSession = request.headers.get("x-wallet-session");
  const allowWalletSessionDelete =
    request.method === "DELETE" && routePath === "/wallet/session" && Boolean(walletSession);
  const allowWalletActionIntent =
    request.method === "POST" && routePath === "/action-intents" && Boolean(walletSession);
  const allowAnonymous = allowAnonymousRead || allowAnonymousWalletAuth || allowWalletSessionDelete || allowWalletActionIntent;

  let credentials;
  let walletPrincipalId: string | null = null;
  try {
    if (allowWalletActionIntent && walletSession) {
      const anonymousCredentials = await resolveCoordinatorCredentials(session, { allowAnonymous: true });
      walletPrincipalId = await validateWalletSession(anonymousCredentials.baseUrl, walletSession);
      if (!walletPrincipalId) {
        return jsonError(401, "INVALID_WALLET_SESSION", "A valid wallet session is required for ActionIntent writes.");
      }
    }
    credentials = await resolveCoordinatorCredentials(session, {
      allowAnonymous,
      allowServerTokenWithoutSession: allowWalletActionIntent,
    });
  } catch (e) {
    if (e instanceof CoordinatorSessionError) {
      return jsonError(e.status, e.code, e.message);
    }
    return jsonError(500, "COORDINATOR_PROXY_ERROR", String(e));
  }
  const incoming = new URL(request.url);
  for (const key of RESERVED_QUERY_KEYS) incoming.searchParams.delete(key);

  const target = new URL(`/${path.join("/")}`, credentials.baseUrl);
  incoming.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const headers: HeadersInit = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const accept = request.headers.get("accept");
  if (accept) headers["Accept"] = accept;
  if (walletSession) headers["x-wallet-session"] = walletSession;
  const networkId = request.headers.get("x-vibly-network-id");
  if (networkId) headers["X-Vibly-Network-Id"] = networkId;
  if (credentials.token) headers["Authorization"] = `Bearer ${credentials.token}`;

  const isBodyless = request.method === "GET" || request.method === "HEAD";
  const body = isBodyless ? undefined : await request.text();
  if (allowWalletActionIntent && body && walletPrincipalId) {
    const principalError = assertWalletPrincipal(body, walletPrincipalId);
    if (principalError) return principalError;
  }

  let upstream: Response;
  try {
    upstream = await fetchCoordinator(target, {
      method: request.method,
      headers,
      body,
    });
  } catch (cause) {
    return upstreamUnavailable(target, cause);
  }

  const upstreamContentType = upstream.headers.get("content-type") ?? "application/json";
  const isStream = upstreamContentType.startsWith("text/event-stream");

  if (isStream) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        "Content-Type": upstreamContentType,
        "Cache-Control": "no-store, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      "Content-Type": upstreamContentType,
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
