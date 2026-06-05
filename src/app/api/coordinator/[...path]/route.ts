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
const NETWORK_QUERY_KEY = "__networkId";
const RESERVED_QUERY_KEYS = ["__coordinatorUrl", "__apiToken", NETWORK_QUERY_KEY];

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

function bodyWithWalletPrincipal(body: string, walletPrincipalId: string): { body?: string; error?: NextResponse } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { error: jsonError(400, "INVALID_ACTION_INTENT_BODY", "ActionIntent body must be valid JSON.") };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: jsonError(400, "INVALID_ACTION_INTENT_BODY", "ActionIntent body must be a JSON object.") };
  }
  return {
    body: JSON.stringify({
      ...(parsed as Record<string, unknown>),
      principalId: walletPrincipalId,
    }),
  };
}

function assertWalletBodyField(
  body: string,
  field: string,
  expected: string,
  messages: {
    invalidCode: string;
    invalidMessage: string;
    parseMessage: string;
    mismatchCode: string;
    mismatchMessage: string;
  },
): NextResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return jsonError(400, messages.invalidCode, messages.parseMessage);
  }
  if (!parsed || typeof parsed !== "object") {
    return jsonError(400, messages.invalidCode, messages.invalidMessage);
  }
  const actual = (parsed as Record<string, unknown>)[field];
  if (actual !== expected) {
    return jsonError(403, messages.mismatchCode, messages.mismatchMessage);
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
  const incoming = new URL(request.url);
  const requestedNetworkId = request.headers.get("x-vibly-network-id") ?? incoming.searchParams.get(NETWORK_QUERY_KEY);
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
  const allowWalletGetVibOrder =
    request.method === "POST" && routePath === "/get-vib/orders" && Boolean(walletSession);
  const allowWalletGetVibPaymentSubmit =
    request.method === "POST" && routePath === "/get-vib/curve/submit-payment" && Boolean(walletSession);
  const allowGetVibQuote =
    request.method === "POST" && routePath === "/get-vib/curve/quote";
  const allowAnonymous =
    allowAnonymousRead ||
    allowAnonymousWalletAuth ||
    allowWalletSessionDelete ||
    allowWalletActionIntent ||
    allowWalletGetVibOrder ||
    allowWalletGetVibPaymentSubmit ||
    allowGetVibQuote;
  const requiresWalletPrincipal = (allowWalletActionIntent || allowWalletGetVibOrder || allowWalletGetVibPaymentSubmit) && Boolean(walletSession);
  // GET requests to /streams/* are SSE endpoints that may be used without a
  // console session (wallet-only users). The server-side API token is still
  // injected so the coordinator can enforce auth on its side; it is never
  // visible to the browser.
  const allowServerTokenForStream = allowAnonymousRead && routePath.startsWith("/streams/");

  let credentials;
  let walletPrincipalId: string | null = null;
  try {
    if (requiresWalletPrincipal && walletSession) {
      const anonymousCredentials = await resolveCoordinatorCredentials(session, {
        allowAnonymous: true,
        networkId: requestedNetworkId,
      });
      walletPrincipalId = await validateWalletSession(anonymousCredentials.baseUrl, walletSession);
      if (!walletPrincipalId) {
        return jsonError(401, "INVALID_WALLET_SESSION", "A valid wallet session is required for wallet-scoped writes.");
      }
    }
    credentials = await resolveCoordinatorCredentials(session, {
      allowAnonymous,
      allowServerTokenWithoutSession: allowWalletActionIntent || allowWalletGetVibOrder || allowWalletGetVibPaymentSubmit || allowServerTokenForStream,
      networkId: requestedNetworkId,
    });
  } catch (e) {
    if (e instanceof CoordinatorSessionError) {
      return jsonError(e.status, e.code, e.message);
    }
    return jsonError(500, "COORDINATOR_PROXY_ERROR", String(e));
  }
  for (const key of RESERVED_QUERY_KEYS) incoming.searchParams.delete(key);

  const targets = credentials.baseUrls.map((baseUrl) => {
    const target = new URL(`/${path.join("/")}`, baseUrl);
    incoming.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value);
    });
    return target;
  });

  const headers: HeadersInit = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const accept = request.headers.get("accept");
  if (accept) headers["Accept"] = accept;
  if (walletSession) headers["x-wallet-session"] = walletSession;
  const networkId = requestedNetworkId;
  if (networkId) headers["X-Vibly-Network-Id"] = networkId;
  if (credentials.token) headers["Authorization"] = `Bearer ${credentials.token}`;

  const isBodyless = request.method === "GET" || request.method === "HEAD";
  let body = isBodyless ? undefined : await request.text();
  if (allowWalletActionIntent && body && walletPrincipalId) {
    const rewritten = bodyWithWalletPrincipal(body, walletPrincipalId);
    if (rewritten.error) return rewritten.error;
    body = rewritten.body;
  }
  if (allowWalletGetVibOrder && body && walletPrincipalId) {
    const accountError = assertWalletBodyField(body, "accountId", walletPrincipalId, {
      invalidCode: "INVALID_GET_VIB_ORDER_BODY",
      invalidMessage: "Get VIB order body must be a JSON object.",
      parseMessage: "Get VIB order body must be valid JSON.",
      mismatchCode: "WALLET_ACCOUNT_MISMATCH",
      mismatchMessage: "Get VIB order accountId must match the wallet session address.",
    });
    if (accountError) return accountError;
  }

  let upstream: Response | undefined;
  let lastTarget = targets[0] ?? new URL(`/${path.join("/")}`, credentials.baseUrl);
  try {
    let lastError: unknown;
    for (const target of targets) {
      lastTarget = target;
      try {
        upstream = await fetchCoordinator(target, {
          method: request.method,
          headers,
          body,
        });
        lastError = undefined;
        break;
      } catch (cause) {
        lastError = cause;
      }
    }
    if (!upstream) throw lastError;
  } catch (cause) {
    return upstreamUnavailable(lastTarget, cause);
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
