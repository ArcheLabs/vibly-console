import { createConfig, http, fallback } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

function createEvmConfig() {
  // Note: injected() connector omitted for now to avoid SSR issues
  // It will be added dynamically on client-side if needed
  return createConfig({
    chains: [mainnet, sepolia],
    connectors: [],
    transports: {
      [mainnet.id]: fallback([http()]),
      [sepolia.id]: fallback([http()]),
    },
    ssr: false,
  });
}

let evmConfig: ReturnType<typeof createConfig> | null = null;

export function getEvmConfig() {
  if (!evmConfig) {
    evmConfig = createEvmConfig();
  }
  return evmConfig;
}
