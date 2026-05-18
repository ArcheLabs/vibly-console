"use client";

import { useSyncExternalStore } from "react";
import { appConfig } from "../config/env";
import type { AuthState } from "../coordinator/types";

/**
 * Lightweight client-side mirror of the browser's connection state.
 *
 * Production console authenticates via Auth.js (HttpOnly session cookie),
 * not via a token persisted in `localStorage`. This store therefore
 * only persists `mode` and a `connected` flag for UI affordances and
 * proactive deep-link routing decisions. It MUST NOT carry credentials:
 * `apiToken` is intentionally omitted from the persisted shape.
 */
const AUTH_KEY = "vibly-console.auth";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedState: AuthState | null = null;

export const defaultAuthState: AuthState = {
  coordinatorUrl: appConfig.defaultCoordinatorUrl,
  mode: "proxy",
  connected: false,
};

function emit() {
  for (const listener of listeners) listener();
}

export function readAuthState(): AuthState {
  if (typeof window === "undefined") return defaultAuthState;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) {
    cachedRaw = null;
    cachedState = defaultAuthState;
    return defaultAuthState;
  }
  if (raw === cachedRaw && cachedState) return cachedState;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    cachedRaw = raw;
    cachedState = {
      coordinatorUrl: parsed.coordinatorUrl || defaultAuthState.coordinatorUrl,
      mode: parsed.mode === "direct" ? "direct" : "proxy",
      connected: Boolean(parsed.connected),
    };
    return cachedState;
  } catch {
    cachedRaw = null;
    cachedState = defaultAuthState;
    return defaultAuthState;
  }
}

export function writeAuthState(next: AuthState): void {
  if (typeof window === "undefined") return;
  // Strip transport credentials before persisting: even if a caller
  // passes a transient `apiToken`, it must never enter localStorage.
  const sanitized: AuthState = {
    coordinatorUrl: next.coordinatorUrl,
    mode: next.mode,
    connected: next.connected,
  };
  const raw = JSON.stringify(sanitized);
  cachedRaw = raw;
  cachedState = sanitized;
  window.localStorage.setItem(AUTH_KEY, raw);
  emit();
}

export function clearAuthState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  cachedRaw = null;
  cachedState = defaultAuthState;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, readAuthState, () => defaultAuthState);
}
