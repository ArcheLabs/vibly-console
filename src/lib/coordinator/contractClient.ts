/**
 * Adapter that builds a `@vibly/coordinator-http-contract` client matching
 * the console's `AuthState` (direct vs proxy URL building, optional Bearer
 * token). Only the fetch + URL strategy lives here; all path strings,
 * request/response shapes, and the JSON envelope come from the contract
 * package.
 */
import { createCoordinatorClient } from "@vibly/coordinator-http-contract/client";
import type { CoordinatorClient as ContractClient } from "@vibly/coordinator-http-contract/client";
import type { AuthState } from "./types";

const PROXY_BASE_PATH = "/api/coordinator";

export type ConsoleContractClient = ContractClient;

export function createConsoleContractClient(auth: AuthState): ConsoleContractClient {
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

  const client = createCoordinatorClient({ baseUrl, headers });

  if (proxy) {
    // Append the same `__coordinatorUrl` / `__apiToken` query the existing
    // proxy expects. This stays here (not in the contract package) because
    // it is a console-specific transport detail.
    client.use({
      async onRequest({ request }) {
        const url = new URL(request.url);
        url.searchParams.set("__coordinatorUrl", auth.coordinatorUrl);
        if (auth.apiToken) url.searchParams.set("__apiToken", auth.apiToken);
        return new Request(url.toString(), request);
      },
    });
  }

  return client;
}
