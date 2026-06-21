type ApiModules = typeof import("@polkadot/api");
const CHAIN_RPC_TIMEOUT_MS = 30_000;

export async function queryChainBalance(input: {
  rpcUrl: string | string[];
  accountId: string;
  decimals: number;
  label?: string;
}): Promise<{ freeBaseUnits: string; free: string }> {
  const modules = await import("@polkadot/api");
  const { api } = await connectChainApi(modules, input.rpcUrl, input.label);
  try {
    const account = await api.query.system.account(input.accountId);
    const free = (account as unknown as { data?: { free?: { toString(): string } } }).data?.free?.toString() ?? "0";
    return {
      freeBaseUnits: free,
      free: baseUnitsToDecimal(free, input.decimals, 4),
    };
  } finally {
    await api.disconnect().catch(() => {});
  }
}

async function connectChainApi(modules: ApiModules, rpcUrl: string | string[], label = "chain RPC") {
  const endpoints = rpcUrls(rpcUrl);
  if (endpoints.length === 0) throw new Error("Chain RPC is not configured.");
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const provider = new modules.WsProvider(endpoint);
    try {
      const api = await withTimeout(
        modules.ApiPromise.create({ provider }),
        CHAIN_RPC_TIMEOUT_MS,
        `Timed out connecting to ${label} ${endpoint}`,
      );
      return { api, endpoint };
    } catch (cause) {
      lastError = cause;
      try {
        await provider.disconnect();
      } catch {
        // ignore disconnect failures while trying the next fallback endpoint
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to connect to chain RPC.");
}

function baseUnitsToDecimal(value: string | bigint, decimals: number, precision = 4): string {
  const raw = typeof value === "bigint" ? value : BigInt(value || "0");
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = raw % scale;
  if (fraction === 0n) return whole.toString();
  const padded = fraction.toString().padStart(decimals, "0").slice(0, precision);
  return `${whole}.${padded}`.replace(/\.?0+$/, "");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function rpcUrls(value: string | string[]): string[] {
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((item) => item.trim()).filter(Boolean);
}
