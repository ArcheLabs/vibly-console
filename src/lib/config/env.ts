export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Vibly Console",
  defaultCoordinatorUrl: process.env.NEXT_PUBLIC_COORDINATOR_URL ?? "http://localhost:8787",
  demoApiToken: process.env.NEXT_PUBLIC_DEMO_API_TOKEN ?? "dev-token",
  devToolsEnabled: process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS !== "false",
  defaultNetworkId: process.env.NEXT_PUBLIC_VIBLY_NETWORK_ID ?? "substrate:vibly-solo",
  defaultNetworkName: process.env.NEXT_PUBLIC_VIBLY_NETWORK_NAME ?? "Local",
  viblyRpcUrl: process.env.NEXT_PUBLIC_VIBLY_RPC_URL ?? process.env.NEXT_PUBLIC_SUBSTRATE_RPC_URL,
  polkadotRpcUrl: process.env.NEXT_PUBLIC_POLKADOT_RPC_URL,
  paymentRpcUrl: process.env.NEXT_PUBLIC_PAYMENT_RPC_URL,
  networkProfilesJson: process.env.NEXT_PUBLIC_VIBLY_NETWORK_PROFILES,
  networkManifestUrl: process.env.NEXT_PUBLIC_VIBLY_NETWORK_MANIFEST_URL ?? "https://vibly.network/networks.json",
};
