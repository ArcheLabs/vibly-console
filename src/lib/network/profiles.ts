"use client";

import { useSyncExternalStore } from "react";
import { appConfig } from "@/lib/config/env";

export interface NetworkProfile {
  id: string;
  label: string;
  stage?: "local" | "testnet" | "mainnet" | string;
  coordinatorUrl?: string;
  viblyRpcUrl?: string;
  viblyGenesisHash?: string;
}

const STORAGE_KEY = "vibly-console.network-profile";
const listeners = new Set<() => void>();

function normalizeProfile(value: unknown): NetworkProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) return null;
  return {
    id,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : id,
    stage: typeof record.stage === "string" ? record.stage : undefined,
    coordinatorUrl: typeof record.coordinatorUrl === "string" ? record.coordinatorUrl : undefined,
    viblyRpcUrl: typeof record.viblyRpcUrl === "string" ? record.viblyRpcUrl : undefined,
    viblyGenesisHash: typeof record.viblyGenesisHash === "string" ? record.viblyGenesisHash : undefined,
  };
}

function parseConfiguredProfiles(): NetworkProfile[] {
  if (!appConfig.networkProfilesJson) return [];
  try {
    const parsed = JSON.parse(appConfig.networkProfilesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProfile).filter((profile): profile is NetworkProfile => Boolean(profile));
  } catch {
    return [];
  }
}

function uniqueProfiles(profiles: NetworkProfile[]): NetworkProfile[] {
  const seen = new Set<string>();
  return profiles.filter((profile) => {
    if (seen.has(profile.id)) return false;
    seen.add(profile.id);
    return true;
  });
}

export const networkProfiles: NetworkProfile[] = uniqueProfiles([
  ...parseConfiguredProfiles(),
  {
    id: appConfig.defaultNetworkId,
    label: appConfig.defaultNetworkName,
    stage: "local",
    coordinatorUrl: appConfig.defaultCoordinatorUrl,
    viblyRpcUrl: appConfig.viblyRpcUrl ?? "ws://127.0.0.1:9944",
  },
  {
    id: "substrate:vibly-incentivized-testnet",
    label: "Incentivized Testnet",
    stage: "testnet",
  },
]);

export function getDefaultNetworkProfile(): NetworkProfile {
  return networkProfiles[0] ?? { id: "substrate:vibly-solo", label: "Local", stage: "local" };
}

export function readActiveNetworkProfile(): NetworkProfile {
  if (typeof window === "undefined") return getDefaultNetworkProfile();
  const selectedId = window.localStorage.getItem(STORAGE_KEY);
  return networkProfiles.find((profile) => profile.id === selectedId) ?? getDefaultNetworkProfile();
}

export function selectNetworkProfile(networkId: string): void {
  if (typeof window === "undefined") return;
  const next = networkProfiles.find((profile) => profile.id === networkId) ?? getDefaultNetworkProfile();
  window.localStorage.setItem(STORAGE_KEY, next.id);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActiveNetworkProfile(): NetworkProfile {
  return useSyncExternalStore(subscribe, readActiveNetworkProfile, getDefaultNetworkProfile);
}
