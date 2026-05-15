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
  const allowAnonymous = allowAnonymousRead || allowAnonymousWalletAuth;

  let credentials;
  try {
    credentials = await resolveCoordinatorCredentials(session, { allowAnonymous });
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
  const walletSession = request.headers.get("x-wallet-session");
  if (walletSession) headers["x-wallet-session"] = walletSession;
  if (credentials.token) headers["Authorization"] = `Bearer ${credentials.token}`;

  const isBodyless = request.method === "GET" || request.method === "HEAD";
  const body = isBodyless ? undefined : await request.text();

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
  });

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
