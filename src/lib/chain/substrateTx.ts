import { getAuthorizedPolkadotInjector } from "@/lib/wallet/polkadotExtension";

type ApiModules = typeof import("@polkadot/api");

export interface SubstrateTransactionStatus {
  phase: "awaiting_signature" | "broadcast" | "in_block" | "finalized";
  txHash?: string;
  blockHash?: string;
  events?: unknown[];
}

/**
 * When to resolve the transaction promise.
 * - `"broadcast"`: resolve as soon as the transaction is broadcast.
 * - `"in_block"`: resolve as soon as the transaction is included in a block.
 * - `"finalized"`: wait until the block is finalized (default).
 */
export type ResolveOn = "broadcast" | "in_block" | "finalized";

export async function submitSubstrateTransaction(input: {
  rpcUrl: string | string[];
  accountId: string;
  buildTx(api: import("@polkadot/api").ApiPromise): Promise<{ signAndSend: Function; hash: { toHex(): string } }> | { signAndSend: Function; hash: { toHex(): string } };
  onStatus?(status: SubstrateTransactionStatus): void;
  resolveOn?: ResolveOn;
}): Promise<string> {
  const endpoints = rpcUrls(input.rpcUrl);
  if (endpoints.length === 0) throw new Error("Chain RPC is not configured.");
  if (!input.accountId) throw new Error("Connect a Polkadot wallet before submitting this transaction.");

  const [modules, injector] = await Promise.all([
    import("@polkadot/api"),
    getAuthorizedPolkadotInjector(input.accountId),
  ]);
  if (!injector.signer) throw new Error("Current wallet does not expose a Polkadot signer.");

  const { api } = await connectApi(modules, endpoints);
  try {
    const tx = await input.buildTx(api);
    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      let unsub: (() => void) | undefined;
      let lastTxHash = tx.hash.toHex();

      input.onStatus?.({ phase: "awaiting_signature", txHash: lastTxHash });

      void tx.signAndSend(input.accountId, { signer: injector.signer }, (result: {
        dispatchError?: unknown;
        status: {
          isBroadcast?: boolean;
          isInBlock?: boolean;
          isFinalized?: boolean;
          asInBlock?: { toHex(): string };
          asFinalized?: { toHex(): string };
        };
        txHash?: { toHex(): string };
        events?: unknown[];
      }) => {
        if (settled) return;
        const txHash = result.txHash?.toHex?.() || lastTxHash;
        lastTxHash = txHash;
        if (result.dispatchError) {
          settled = true;
          reject(formatDispatchError(api, result.dispatchError));
          unsub?.();
          return;
        }
        if (result.status.isBroadcast) {
          input.onStatus?.({ phase: "broadcast", txHash });
        }
        if (result.status.isInBlock) {
          input.onStatus?.({
            phase: "in_block",
            txHash,
            blockHash: result.status.asInBlock?.toHex?.(),
          });
          if (input.resolveOn === "broadcast" || input.resolveOn === "in_block") {
            settled = true;
            resolve(txHash);
            unsub?.();
            return;
          }
        }
        if (result.status.isFinalized) {
          settled = true;
          input.onStatus?.({
            phase: "finalized",
            txHash,
            blockHash: result.status.asFinalized?.toHex?.(),
            events: result.events,
          });
          resolve(txHash);
          unsub?.();
        }
      }).then((fn: () => void) => {
        unsub = fn;
      }).catch((cause: unknown) => {
        settled = true;
        reject(cause);
      });
    });
  } finally {
    await api.disconnect().catch(() => {});
  }
}

async function connectApi(modules: ApiModules, endpoints: string[]) {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const provider = new modules.WsProvider(endpoint);
    try {
      const api = await modules.ApiPromise.create({ provider });
      await api.isReady;
      return { api, endpoint };
    } catch (cause) {
      lastError = cause;
      try {
        await provider.disconnect();
      } catch {
        // ignore disconnect failures while trying the next endpoint
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to connect to chain RPC.");
}

function formatDispatchError(api: import("@polkadot/api").ApiPromise, dispatchError: unknown): Error {
  const value = dispatchError as {
    isModule?: boolean;
    asModule?: { index: number; error: number };
    toString(): string;
  };
  if (value?.isModule && value.asModule) {
    try {
      const meta = api.registry.findMetaError(value.asModule as never);
      return new Error(`${meta.section}.${meta.name}: ${meta.docs.join(" ")}`.trim());
    } catch {
      // fall through to default string formatting
    }
  }
  return new Error(value?.toString?.() || "Transaction failed.");
}

function rpcUrls(value: string | string[]): string[] {
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((item) => item.trim()).filter(Boolean);
}
