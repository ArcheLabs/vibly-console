export type ConsoleMode = "direct" | "proxy";

/**
 * Console runtime auth descriptor.
 *
 * In production the Console runs in `proxy` mode: the browser holds NO
 * Coordinator credentials. `coordinatorUrl` is kept here only for UI
 * display (header chrome) and is sourced from a server-injected public
 * env value, not from user input.
 *
 * `direct` mode is a development/testing escape hatch where the browser
 * talks straight to a Coordinator with a Bearer token. `apiToken` is
 * therefore optional and only meaningful in `direct` mode; never persist
 * it to localStorage in production.
 */
export interface AuthState {
  coordinatorUrl: string;
  mode: ConsoleMode;
  connected: boolean;
  apiToken?: string;
}

export interface PageInput {
  limit?: number;
  cursor?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface Page<T> {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
}

export interface ApiResponse<T> {
  ok: true;
  data: T;
  meta?: { requestId?: string };
}

export interface ApiListResponse<T> {
  ok: true;
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
  meta?: { requestId?: string };
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: { requestId?: string };
}

export type ApiEnvelope<T> = ApiResponse<T> | ApiListResponse<T> | ApiFailure;

export type Entity = Record<string, unknown>;

export interface EventEnvelope {
  id?: string;
  type: string;
  payload?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}
