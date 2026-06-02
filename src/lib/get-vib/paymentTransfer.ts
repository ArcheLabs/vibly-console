import { decimalToBaseUnits, baseUnitsToDecimal } from "@/lib/get-vib/amounts";
import { submitSubstrateTransaction, type SubstrateTransactionStatus } from "@/lib/chain/substrateTx";

export interface PaymentTransferInput {
  rpcUrl: string | string[];
  accountId: string;
  depositAddress: string;
  amount: string;
  decimals: number;
  onStatus?(status: SubstrateTransactionStatus): void;
}

export interface PaymentChainInfo {
  rpcUrl: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

type ApiModules = typeof import("@polkadot/api");

export async function queryPaymentBalance(input: {
  rpcUrl: string | string[];
  accountId: string;
  decimals: number;
}): Promise<{ freeBaseUnits: string; free: string }> {
  const modules = await import("@polkadot/api");
  const { api } = await connectPaymentApi(modules, input.rpcUrl);
  try {
    const account = await api.query.system.account(input.accountId);
    const free = (account as unknown as { data?: { free?: { toString(): string } } }).data?.free?.toString() ?? "0";
    return {
      freeBaseUnits: free,
      free: baseUnitsToDecimal(free, input.decimals, 4),
    };
  } finally {
    await api.disconnect();
  }
}

export async function submitPaymentTransfer(input: PaymentTransferInput): Promise<string> {
  if (rpcUrls(input.rpcUrl).length === 0) throw new Error("Payment network RPC is not configured.");
  if (!input.accountId) throw new Error("Connect a Polkadot wallet before transferring.");
  if (!input.depositAddress) throw new Error("Deposit address is not configured.");
  const amountBaseUnits = decimalToBaseUnits(input.amount, input.decimals);
  if (amountBaseUnits <= 0n) throw new Error("Payment amount must be greater than zero.");

  const modules = await import("@polkadot/api");
  const { api } = await connectPaymentApi(modules, input.rpcUrl);
  try {
    const account = await api.query.system.account(input.accountId);
    const free = BigInt((account as unknown as { data?: { free?: { toString(): string } } }).data?.free?.toString() ?? "0");
    if (free <= amountBaseUnits) throw new Error("Insufficient payment token balance.");
  } finally {
    await api.disconnect();
  }
  return await submitSubstrateTransaction({
    rpcUrl: input.rpcUrl,
    accountId: input.accountId,
    onStatus: input.onStatus,
    buildTx: async (api) => api.tx.balances.transferKeepAlive(input.depositAddress, amountBaseUnits.toString()),
  });
}

export async function queryPaymentChainInfo(rpcUrl: string | string[]): Promise<PaymentChainInfo> {
  const modules = await import("@polkadot/api");
  const { api, endpoint } = await connectPaymentApi(modules, rpcUrl);
  try {
    const properties = await api.rpc.system.properties();
    const json = properties.toJSON() as { tokenSymbol?: unknown; tokenDecimals?: unknown };
    const symbol = Array.isArray(json.tokenSymbol) ? json.tokenSymbol[0] : json.tokenSymbol;
    const decimals = Array.isArray(json.tokenDecimals) ? json.tokenDecimals[0] : json.tokenDecimals;
    return {
      rpcUrl: endpoint,
      tokenSymbol: typeof symbol === "string" ? symbol : undefined,
      tokenDecimals: typeof decimals === "number" ? decimals : undefined,
    };
  } finally {
    await api.disconnect();
  }
}

async function connectPaymentApi(modules: ApiModules, rpcUrl: string | string[]) {
  const endpoints = rpcUrls(rpcUrl);
  if (endpoints.length === 0) throw new Error("Payment network RPC is not configured.");
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const provider = new modules.WsProvider(endpoint);
    try {
      const api = await modules.ApiPromise.create({ provider });
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
  throw lastError instanceof Error ? lastError : new Error("Unable to connect to payment network RPC.");
}

function rpcUrls(value: string | string[]): string[] {
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((item) => item.trim()).filter(Boolean);
}
