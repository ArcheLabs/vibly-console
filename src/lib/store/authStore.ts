"use client";

import { useSyncExternalStore } from "react";
import { appConfig } from "../config/env";
import type { AuthState } from "../coordinator/types";

const AUTH_KEY = "vibly-console.auth";
const listeners = new Set<() => void>();

export const defaultAuthState: AuthState = {
  coordinatorUrl: appConfig.defaultCoordinatorUrl,
  apiToken: "",
  mode: "direct",
  connected: false,
};

function emit() {
  for (const listener of listeners) listener();
}

export function readAuthState(): AuthState {
  if (typeof window === "undefined") return defaultAuthState;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return defaultAuthState;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      coordinatorUrl: parsed.coordinatorUrl || defaultAuthState.coordinatorUrl,
      apiToken: parsed.apiToken || "",
      mode: parsed.mode === "proxy" ? "proxy" : "direct",
      connected: Boolean(parsed.connected),
    };
  } catch {
    return defaultAuthState;
  }
}

export function writeAuthState(next: AuthState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  emit();
}

export function clearAuthState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, readAuthState, () => defaultAuthState);
}
