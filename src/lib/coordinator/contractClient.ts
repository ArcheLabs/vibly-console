/**
 * Adapter that builds a `@vibly-ai/coordinator-http-contract` client matching
 * the console's `AuthState` (direct vs proxy URL building, optional Bearer
 * token).
 *
 * Production runs in `proxy` mode: the browser only ever talks to
 * `/api/coordinator/*` on the same origin and forwards the Auth.js
 * session cookie via the default fetch credentials. The Coordinator
 * URL and API token are resolved server-side and injected as a Bearer
 * `Authorization` header by the proxy route handler.
 *
 * `direct` mode is retained for unit tests / dev-only flows that still
 * need to call a Coordinator without going through the proxy. It accepts
 * an explicit `apiToken` purely as a transport credential and never
 * persists it.
 */
import { createCoordinatorClient } from "@vibly-ai/coordinator-http-contract/client";
import type { CoordinatorClient as ContractClient } from "@vibly-ai/coordinator-http-contract/client";
import type { AuthState } from "./types";
import { readWalletSessionToken } from "@/lib/wallet/sessionStore";

const PROXY_BASE_PATH = "/api/coordinator";

export type ConsoleContractClient = ContractClient;

export function createConsoleContractClient(auth: AuthState, networkId?: string, walletSessionToken?: string | null): ConsoleContractClient {
  const proxy = auth.mode === "proxy";
  const baseUrl = proxy
    ? // Browsers resolve relative URLs against window.location.origin; on the
      // server side `window` is undefined so we provide a stable origin and
      // strip later. openapi-fetch only joins baseUrl + path.
      typeof window === "undefined"
        ? `http://localhost:3000${PROXY_BASE_PATH}`
        : `${window.location.origin}${PROXY_BASE_PATH}`
    : auth.coordinatorUrl.replace(/\/$/, "");

  const headers: Record<string, string> = {};
  if (!proxy && auth.apiToken) headers.Authorization = `Bearer ${auth.apiToken}`;
  const walletSession = walletSessionToken ?? readWalletSessionToken();
  if (walletSession) headers["x-wallet-session"] = walletSession;
  if (networkId) headers["X-Vibly-Network-Id"] = networkId;

  return createCoordinatorClient({ baseUrl, headers });
}
