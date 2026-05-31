"use client";

import { useSyncExternalStore } from "react";

export interface PaymentChainInfo {
  tokenSymbol?: string;
  tokenDecimals?: number;
  rpcUrl?: string;
}

// Module-level cache — survives re-renders, shared across all components.
let cached: PaymentChainInfo | null = null;
let currentKey = "";
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function cacheKey(rpcUrls: string[]): string {
  return [...rpcUrls].sort().join(",");
}

/**
 * Trigger a fetch of payment chain properties for the given RPC URLs.
 * Results are stored in module-level state and exposed via `usePaymentChainInfo()`.
 * Safe to call on every render — repeated calls with the same key are no-ops.
 */
export function refreshPaymentChainInfo(rpcUrls: string[]): void {
  const key = cacheKey(rpcUrls.filter(Boolean));
  if (!key) {
    if (currentKey !== "" || cached !== null) {
      currentKey = "";
      cached = null;
      notify();
    }
    return;
  }
  if (currentKey === key) return; // already fetching or fetched for this key
  currentKey = key;
  cached = null;
  notify();

  import("@/lib/get-vib/paymentTransfer")
    .then(({ queryPaymentChainInfo }) => queryPaymentChainInfo(rpcUrls))
    .then((info) => {
      if (currentKey !== key) return; // stale
      cached = info;
      notify();
    })
    .catch(() => {
      if (currentKey !== key) return;
      cached = {};
      notify();
    });
}

/** Returns the cached payment chain info, or null while loading. */
export function usePaymentChainInfo(): PaymentChainInfo | null {
  return useSyncExternalStore(subscribe, () => cached, () => null);
}
