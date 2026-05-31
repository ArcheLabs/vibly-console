"use client";

import { useSyncExternalStore } from "react";
import { appConfig } from "@/lib/config/env";

export interface NetworkProfile {
  id: string;
  label: string;
  stage?: "local" | "testnet" | "mainnet" | string;
  coordinatorUrl?: string;
  coordinatorUrls?: string[];
  coordinatorEndpoint?: string;
  paymentRpcUrl?: string;
  paymentRpcUrls?: string[];
  paymentTokenSymbol?: string;
  paymentTokenDecimals?: number;
  paymentGenesisHash?: string;
  explorerTxUrl?: string;
  explorerAddressUrl?: string;
  polkadotRpcUrl?: string;
  polkadotEndpoint?: string;
  viblyRpcUrl?: string;
  viblyRpcUrls?: string[];
  viblyChainEndpoint?: string;
  viblyGenesisHash?: string;
  relayTokenSymbol?: string;
}

const STORAGE_KEY = "vibly-console.network-profile";
const listeners = new Set<() => void>();

const PASEO_PAYMENT_RPC_URLS = [
  "wss://rpc.ibp.network/paseo",
  "wss://paseo.dotters.network",
  "wss://paseo-rpc.dwellir.com",
];

const POLKADOT_PAYMENT_RPC_URLS = [
  "wss://rpc.polkadot.io",
  "wss://polkadot.api.onfinality.io/public-ws",
  "wss://polkadot-rpc.dwellir.com",
];

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
  }
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeProfile(value: unknown): NetworkProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) return null;
  const coordinatorUrls = stringArray(record.coordinatorUrls).concat(stringArray(record.coordinatorUrl), stringArray(record.coordinatorEndpoint));
  const paymentRpcUrls = stringArray(record.paymentRpcUrls)
    .concat(stringArray(record.paymentRpcUrl), stringArray(record.polkadotRpcUrl), stringArray(record.polkadotEndpoint));
  const viblyRpcUrls = stringArray(record.viblyRpcUrls)
    .concat(stringArray(record.viblyRpcUrl), stringArray(record.viblyChainEndpoint));
  return {
    id,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : id,
    stage: typeof record.stage === "string" ? record.stage : undefined,
    coordinatorUrl: coordinatorUrls[0],
    coordinatorUrls,
    coordinatorEndpoint: coordinatorUrls[0],
    paymentRpcUrl: paymentRpcUrls[0],
    paymentRpcUrls,
    paymentTokenSymbol: typeof record.paymentTokenSymbol === "string"
      ? record.paymentTokenSymbol
      : typeof record.relayTokenSymbol === "string"
        ? record.relayTokenSymbol
        : undefined,
    paymentTokenDecimals: typeof record.paymentTokenDecimals === "number" && Number.isFinite(record.paymentTokenDecimals) ? record.paymentTokenDecimals : undefined,
    paymentGenesisHash: typeof record.paymentGenesisHash === "string" ? record.paymentGenesisHash : undefined,
    explorerTxUrl: typeof record.explorerTxUrl === "string" ? record.explorerTxUrl : undefined,
    explorerAddressUrl: typeof record.explorerAddressUrl === "string" ? record.explorerAddressUrl : undefined,
    polkadotRpcUrl: paymentRpcUrls[0],
    polkadotEndpoint: paymentRpcUrls[0],
    viblyRpcUrl: viblyRpcUrls[0],
    viblyRpcUrls,
    viblyChainEndpoint: viblyRpcUrls[0],
    viblyGenesisHash: typeof record.viblyGenesisHash === "string" ? record.viblyGenesisHash : undefined,
    relayTokenSymbol: typeof record.relayTokenSymbol === "string" ? record.relayTokenSymbol : undefined,
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
    coordinatorUrls: [appConfig.defaultCoordinatorUrl].filter(Boolean),
    viblyRpcUrl: appConfig.viblyRpcUrl ?? "ws://127.0.0.1:9944",
    viblyRpcUrls: [appConfig.viblyRpcUrl ?? "ws://127.0.0.1:9944"],
    viblyChainEndpoint: appConfig.viblyRpcUrl ?? "ws://127.0.0.1:9944",
    paymentRpcUrl: appConfig.paymentRpcUrl ?? appConfig.polkadotRpcUrl ?? "ws://127.0.0.1:9945",
    paymentRpcUrls: [appConfig.paymentRpcUrl ?? appConfig.polkadotRpcUrl ?? "ws://127.0.0.1:9945"],
    polkadotRpcUrl: appConfig.polkadotRpcUrl ?? appConfig.paymentRpcUrl ?? "ws://127.0.0.1:9945",
    polkadotEndpoint: appConfig.polkadotRpcUrl ?? appConfig.paymentRpcUrl ?? "ws://127.0.0.1:9945",
  },
  {
    id: "substrate:vibly-testnet",
    label: "Testnet",
    stage: "testnet",
    coordinatorUrl: appConfig.defaultCoordinatorUrl,
    coordinatorUrls: [appConfig.defaultCoordinatorUrl].filter(Boolean),
    paymentRpcUrl: PASEO_PAYMENT_RPC_URLS[0],
    paymentRpcUrls: PASEO_PAYMENT_RPC_URLS,
    polkadotRpcUrl: PASEO_PAYMENT_RPC_URLS[0],
    polkadotEndpoint: PASEO_PAYMENT_RPC_URLS[0],
  },
  {
    id: "substrate:vibly-incentivized-testnet",
    label: "Incentivized Testnet",
    stage: "mainnet",
    coordinatorUrl: appConfig.defaultCoordinatorUrl,
    coordinatorUrls: [appConfig.defaultCoordinatorUrl].filter(Boolean),
    paymentRpcUrl: POLKADOT_PAYMENT_RPC_URLS[0],
    paymentRpcUrls: POLKADOT_PAYMENT_RPC_URLS,
    polkadotRpcUrl: POLKADOT_PAYMENT_RPC_URLS[0],
    polkadotEndpoint: POLKADOT_PAYMENT_RPC_URLS[0],
  },
]);

export function networkCoordinatorUrls(profile: NetworkProfile): string[] {
  return profile.coordinatorUrls?.length ? profile.coordinatorUrls : [profile.coordinatorUrl, profile.coordinatorEndpoint].filter(Boolean) as string[];
}

export function networkPaymentRpcUrls(profile: NetworkProfile): string[] {
  return profile.paymentRpcUrls?.length ? profile.paymentRpcUrls : [profile.paymentRpcUrl, profile.polkadotRpcUrl, profile.polkadotEndpoint].filter(Boolean) as string[];
}

export function networkViblyRpcUrls(profile: NetworkProfile): string[] {
  return profile.viblyRpcUrls?.length ? profile.viblyRpcUrls : [profile.viblyRpcUrl, profile.viblyChainEndpoint].filter(Boolean) as string[];
}

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
