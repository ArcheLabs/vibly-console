"use client";

import { useSyncExternalStore } from "react";
import { appConfig } from "@/lib/config/env";

export interface NetworkProfile {
  id: string;
  label: string;
  stage?: "local" | "testnet" | "mainnet" | string;
  status?: "active" | "prelaunch" | "maintenance" | "deprecated" | string;
  manifestVersion?: number;
  updatedAt?: string;
  ttlSeconds?: number;
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
  chains?: {
    payment?: NetworkChainManifest;
    vibly?: NetworkChainManifest;
  };
  features?: NetworkFeatureFlags;
  messages?: Record<string, string>;
}

const STORAGE_KEY = "vibly-console.network-profile";
const listeners = new Set<() => void>();
let runtimeProfiles: NetworkProfile[] | null = null;
let runtimeLoadStarted = false;

interface NetworkChainManifest {
  chainId: string;
  genesisHash?: string;
  rpcUrls?: string[];
  tokenSymbol?: string;
  tokenDecimals?: number;
  explorerTxUrl?: string;
  status?: string;
}

interface NetworkFeatureFlags {
  agentJoin: boolean;
  daemon: boolean;
  staking: boolean;
  rewards: boolean;
  rootIdentityRegistration: boolean;
  getVibConversion: boolean;
  getVibClaim: boolean;
}

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
  const chains = record.chains && typeof record.chains === "object" ? record.chains as { payment?: NetworkChainManifest; vibly?: NetworkChainManifest } : {};
  const paymentRpcUrls = stringArray(record.paymentRpcUrls)
    .concat(stringArray(chains.payment?.rpcUrls))
    .concat(stringArray(record.paymentRpcUrl), stringArray(record.polkadotRpcUrl), stringArray(record.polkadotEndpoint));
  const viblyRpcUrls = stringArray(record.viblyRpcUrls)
    .concat(stringArray(chains.vibly?.rpcUrls))
    .concat(stringArray(record.viblyRpcUrl), stringArray(record.viblyChainEndpoint));
  const features = record.features && typeof record.features === "object" ? record.features as NetworkFeatureFlags : undefined;
  return {
    id,
    label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : id,
    stage: typeof record.stage === "string" ? record.stage : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    manifestVersion: typeof record.manifestVersion === "number" ? record.manifestVersion : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    ttlSeconds: typeof record.ttlSeconds === "number" ? record.ttlSeconds : undefined,
    coordinatorUrl: coordinatorUrls[0],
    coordinatorUrls,
    coordinatorEndpoint: coordinatorUrls[0],
    paymentRpcUrl: paymentRpcUrls[0],
    paymentRpcUrls,
    paymentTokenSymbol: typeof record.paymentTokenSymbol === "string"
      ? record.paymentTokenSymbol
      : typeof chains.payment?.tokenSymbol === "string"
        ? chains.payment.tokenSymbol
      : typeof record.relayTokenSymbol === "string"
        ? record.relayTokenSymbol
        : undefined,
    paymentTokenDecimals: typeof record.paymentTokenDecimals === "number" && Number.isFinite(record.paymentTokenDecimals)
      ? record.paymentTokenDecimals
      : typeof chains.payment?.tokenDecimals === "number"
        ? chains.payment.tokenDecimals
        : undefined,
    paymentGenesisHash: typeof record.paymentGenesisHash === "string" ? record.paymentGenesisHash : chains.payment?.genesisHash,
    explorerTxUrl: typeof record.explorerTxUrl === "string" ? record.explorerTxUrl : undefined,
    explorerAddressUrl: typeof record.explorerAddressUrl === "string" ? record.explorerAddressUrl : undefined,
    polkadotRpcUrl: paymentRpcUrls[0],
    polkadotEndpoint: paymentRpcUrls[0],
    viblyRpcUrl: viblyRpcUrls[0],
    viblyRpcUrls,
    viblyChainEndpoint: viblyRpcUrls[0],
    viblyGenesisHash: typeof record.viblyGenesisHash === "string" ? record.viblyGenesisHash : chains.vibly?.genesisHash,
    relayTokenSymbol: typeof record.relayTokenSymbol === "string" ? record.relayTokenSymbol : undefined,
    chains,
    features,
    messages: record.messages && typeof record.messages === "object" ? record.messages as Record<string, string> : undefined,
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

const fallbackNetworkProfiles: NetworkProfile[] = uniqueProfiles([
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
    stage: "testnet",
    status: "prelaunch",
    coordinatorUrl: appConfig.defaultCoordinatorUrl,
    coordinatorUrls: [appConfig.defaultCoordinatorUrl].filter(Boolean),
    paymentRpcUrl: POLKADOT_PAYMENT_RPC_URLS[0],
    paymentRpcUrls: POLKADOT_PAYMENT_RPC_URLS,
    polkadotRpcUrl: POLKADOT_PAYMENT_RPC_URLS[0],
    polkadotEndpoint: POLKADOT_PAYMENT_RPC_URLS[0],
    features: {
      agentJoin: false,
      daemon: false,
      staking: false,
      rewards: false,
      rootIdentityRegistration: false,
      getVibConversion: true,
      getVibClaim: false,
    },
    messages: {
      getVibClaim: "VIB claim to incentivized testnet is not live yet.",
      prelaunch: "Incentivized testnet agent onboarding will open after the network launch.",
    },
  },
]);

export function networkProfiles(): NetworkProfile[] {
  return runtimeProfiles?.length ? runtimeProfiles : fallbackNetworkProfiles;
}

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
  void ensureRuntimeProfiles();
  return networkProfiles()[0] ?? { id: "substrate:vibly-solo", label: "Local", stage: "local" };
}

export function readActiveNetworkProfile(): NetworkProfile {
  void ensureRuntimeProfiles();
  if (typeof window === "undefined") return getDefaultNetworkProfile();
  const selectedId = window.localStorage.getItem(STORAGE_KEY);
  return networkProfiles().find((profile) => profile.id === selectedId) ?? getDefaultNetworkProfile();
}

export function selectNetworkProfile(networkId: string): void {
  if (typeof window === "undefined") return;
  const next = networkProfiles().find((profile) => profile.id === networkId) ?? getDefaultNetworkProfile();
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

export function useNetworkProfiles(): NetworkProfile[] {
  return useSyncExternalStore(subscribe, networkProfiles, () => fallbackNetworkProfiles);
}

async function ensureRuntimeProfiles(): Promise<void> {
  if (typeof window === "undefined" || runtimeLoadStarted) return;
  runtimeLoadStarted = true;
  const loaded = await fetchProfiles(appConfig.defaultCoordinatorUrl.replace(/\/$/, "") + "/networks")
    .catch(() => fetchProfiles(appConfig.networkManifestUrl))
    .catch(() => []);
  if (loaded.length) {
    runtimeProfiles = uniqueProfiles([...loaded, ...fallbackNetworkProfiles]);
    for (const listener of listeners) listener();
  }
}

async function fetchProfiles(url: string): Promise<NetworkProfile[]> {
  const response = await fetch(url);
  if (!response.ok) return [];
  const json = await response.json() as unknown;
  const record = json && typeof json === "object" ? json as Record<string, unknown> : {};
  const networks = Array.isArray(json)
    ? json
    : Array.isArray(record.networks)
      ? record.networks
      : Array.isArray((record.data as Record<string, unknown> | undefined)?.networks)
        ? ((record.data as Record<string, unknown>).networks as unknown[])
        : [];
  return networks.map(normalizeProfile).filter((profile): profile is NetworkProfile => Boolean(profile));
}
