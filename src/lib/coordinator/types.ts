export type ConsoleMode = "direct" | "proxy";

export interface AuthState {
  coordinatorUrl: string;
  apiToken: string;
  mode: ConsoleMode;
  connected: boolean;
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
