"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const storageKey = "vibly-wallet-session";

export interface WalletSessionTokenRecord {
  token: string;
  expiresAt?: string;
}

let memoryRecord: WalletSessionTokenRecord | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readWalletSessionToken(): string | null {
  return readWalletSessionRecord()?.token ?? null;
}

export function readWalletSessionRecord(): WalletSessionTokenRecord | null {
  if (typeof window === "undefined") return memoryRecord;
  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) {
    memoryRecord = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as WalletSessionTokenRecord;
    if (!parsed.token) throw new Error("missing token");
    if (parsed.expiresAt && Number.isFinite(Date.parse(parsed.expiresAt)) && Date.parse(parsed.expiresAt) <= Date.now()) {
      clearWalletSessionToken();
      return null;
    }
    memoryRecord = parsed;
    return parsed;
  } catch {
    clearWalletSessionToken();
    return null;
  }
}

export function setWalletSessionToken(token: string, expiresAt?: string): void {
  memoryRecord = { token, expiresAt };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, JSON.stringify(memoryRecord));
  }
  emit();
}

export function clearWalletSessionToken(): void {
  memoryRecord = null;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(storageKey);
  }
  emit();
}

export function useWalletSessionToken(): string | null {
  return useSyncExternalStore(subscribe, readWalletSessionToken, () => null);
}
