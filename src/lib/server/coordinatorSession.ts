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
  baseUrls: string[];
  token: string | null;
}

export interface ResolveCoordinatorCredentialOptions {
  allowAnonymous?: boolean;
  allowServerTokenWithoutSession?: boolean;
  networkId?: string | null;
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

interface CoordinatorNetworkProfile {
  id: string;
  coordinatorUrl: string;
  coordinatorUrls: string[];
  apiToken?: string;
}

function normalizeNetworkId(value: string | null | undefined): string | null {
  const id = value?.trim();
  if (!id || !/^[a-zA-Z0-9:_./-]{1,128}$/.test(id)) return null;
  return id;
}

function normalizeCoordinatorNetworkProfile(value: unknown): CoordinatorNetworkProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? normalizeNetworkId(record.id) : null;
  const coordinatorUrls = [
    ...(Array.isArray(record.coordinatorUrls) ? record.coordinatorUrls : []),
    record.coordinatorUrl,
    record.coordinatorEndpoint,
  ]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  const coordinatorUrl = coordinatorUrls[0] ?? "";
  if (!id || !coordinatorUrl) return null;
  return {
    id,
    coordinatorUrl,
    coordinatorUrls,
    apiToken: typeof record.apiToken === "string" && record.apiToken.trim() ? record.apiToken.trim() : undefined,
  };
}

function readCoordinatorNetworkProfiles(): CoordinatorNetworkProfile[] {
  const raw = readEnv("VIBLY_COORDINATOR_NETWORK_PROFILES") ?? readEnv("COORDINATOR_NETWORK_PROFILES");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeCoordinatorNetworkProfile)
      .filter((profile): profile is CoordinatorNetworkProfile => Boolean(profile));
  } catch {
    return [];
  }
}

/**
 * Resolve the upstream Coordinator base URL.
 *
 * Console may expose multiple public network profiles, but the upstream
 * Coordinator URL is still resolved server-side from a profile allowlist.
 */
function resolveCoordinatorTarget(networkId: string | null | undefined): CoordinatorNetworkProfile {
  const requestedNetworkId = normalizeNetworkId(networkId);
  const profiles = readCoordinatorNetworkProfiles();
  if (profiles.length > 0) {
    const profile = requestedNetworkId ? profiles.find((item) => item.id === requestedNetworkId) : profiles[0];
    if (profile) return profile;
    // Requested network is not in the explicit allowlist — fall through to the
    // default COORDINATOR_URL rather than hard-erroring, so built-in profiles
    // (testnet, incentivized-testnet) that share the same coordinator still work.
  }

  const fromEnv = readEnv("COORDINATOR_URL") ?? readEnv("NEXT_PUBLIC_COORDINATOR_URL");
  if (!fromEnv) {
    throw new CoordinatorSessionError(
      503,
      "COORDINATOR_NOT_CONFIGURED",
      "COORDINATOR_URL is not set on the server.",
    );
  }
  return { id: requestedNetworkId ?? "default", coordinatorUrl: fromEnv, coordinatorUrls: [fromEnv] };
}

export async function resolveCoordinatorCredentials(
  session: Session | null,
  options: ResolveCoordinatorCredentialOptions = {},
): Promise<CoordinatorCredentials> {
  if (!session && !options.allowAnonymous) {
    throw new CoordinatorSessionError(
      401,
      "UNAUTHORIZED",
      "A signed-in Console session is required to access the Coordinator proxy.",
    );
  }
  const target = resolveCoordinatorTarget(options.networkId);
  return {
    baseUrl: target.coordinatorUrl.replace(/\/$/, ""),
    baseUrls: target.coordinatorUrls.map((url) => url.replace(/\/$/, "")),
    token: session || options.allowServerTokenWithoutSession ? (target.apiToken ?? readEnv("COORDINATOR_API_TOKEN") ?? null) : null,
  };
}
