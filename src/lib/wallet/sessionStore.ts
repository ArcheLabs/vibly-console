"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let walletSessionToken: string | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readWalletSessionToken(): string | null {
  return walletSessionToken;
}

export function setWalletSessionToken(token: string): void {
  walletSessionToken = token;
  emit();
}

export function clearWalletSessionToken(): void {
  walletSessionToken = null;
  emit();
}

export function useWalletSessionToken(): string | null {
  return useSyncExternalStore(subscribe, readWalletSessionToken, () => null);
}
