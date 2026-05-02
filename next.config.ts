import { createRequire } from "node:module";
import path from "node:path";

import type { NextConfig } from "next";

/**
 * Turbopack root is set so `pnpm dev:turbo` can work when Next respects it.
 * Default `pnpm dev` uses webpack (`next dev --webpack`) because with pnpm hoisting,
 * Turbopack may mis-infer `./src/app` as the workspace root (symlinked `next`).
 */
const requireFromConfig = createRequire(import.meta.url);
const turbopackRoot = path.dirname(requireFromConfig.resolve("./package.json"));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
