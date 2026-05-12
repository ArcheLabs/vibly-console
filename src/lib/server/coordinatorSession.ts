import type { Session } from "next-auth";

// This module is server-only by convention: it lives under `src/lib/server/`
// and is imported exclusively from Next.js Route Handlers and Server
// Components. Do NOT import it from `"use client"` modules.

/**
 * Server-side credentials for forwarding to the Vibly Coordinator.
 *
 * Both `baseUrl` and `token` are derived exclusively from server config
 * (env / allowlist / future OIDC token exchange). The browser never
 * supplies them — that is the whole point of the proxy boundary.
 */
export interface CoordinatorCredentials {
  baseUrl: string;
  token: string | null;
}

export class CoordinatorSessionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CoordinatorSessionError";
    this.status = status;
    this.code = code;
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Resolve the upstream Coordinator base URL.
 *
 * Phase 1: a single coordinator per Console deployment, configured via
 * `COORDINATOR_URL` (or the dev fallback `NEXT_PUBLIC_COORDINATOR_URL`,
 * useful only in local development). Future phases can swap this for a
 * per-tenant allowlist (`COORDINATOR_ALLOWED_ORIGINS`) without changing
 * any caller — the resolver still hides the choice.
 */
function resolveCoordinatorBaseUrl(): string {
  const fromEnv = readEnv("COORDINATOR_URL") ?? readEnv("NEXT_PUBLIC_COORDINATOR_URL");
  if (!fromEnv) {
    throw new CoordinatorSessionError(
      503,
      "COORDINATOR_NOT_CONFIGURED",
      "COORDINATOR_URL is not set on the server.",
    );
  }
  return fromEnv.replace(/\/$/, "");
}

export async function resolveCoordinatorCredentials(
  session: Session | null,
): Promise<CoordinatorCredentials> {
  if (!session) {
    throw new CoordinatorSessionError(
      401,
      "UNAUTHORIZED",
      "A signed-in Console session is required to access the Coordinator proxy.",
    );
  }
  return {
    baseUrl: resolveCoordinatorBaseUrl(),
    token: readEnv("COORDINATOR_API_TOKEN") ?? null,
  };
}
