import { getAuthorizedPolkadotInjector } from "@/lib/wallet/polkadotExtension";

type ApiModules = typeof import("@polkadot/api");

export async function registerRootIdentityOnChain(input: {
  rpcUrl: string | string[];
  accountId: string;
}): Promise<string> {
  const endpoints = Array.isArray(input.rpcUrl) ? input.rpcUrl.filter(Boolean) : [input.rpcUrl].filter(Boolean);
  if (endpoints.length === 0) throw new Error("Vibly chain RPC is not configured.");
  if (!input.accountId) throw new Error("Connect a Polkadot root wallet before registering identity.");

  const [modules, injector] = await Promise.all([
    import("@polkadot/api"),
    getAuthorizedPolkadotInjector(input.accountId),
  ]);
  if (!injector.signer) throw new Error("Current wallet does not expose a Polkadot signer.");
  const { api } = await connectApi(modules, endpoints);
  try {
    const tx = api.tx.identityCore.registerIdentity(null, null, null, null, null);
    return await new Promise<string>((resolve, reject) => {
      let settled = false;
      let unsub: (() => void) | undefined;
      tx.signAndSend(input.accountId, { signer: injector.signer }, (result) => {
        if (settled) return;
        if (result.dispatchError) {
          settled = true;
          reject(new Error(result.dispatchError.toString()));
          unsub?.();
          return;
        }
        if (result.status.isBroadcast || result.status.isInBlock || result.status.isFinalized) {
          settled = true;
          resolve(tx.hash.toHex());
          unsub?.();
        }
      }).then((fn) => {
        unsub = fn;
      }).catch((cause) => {
        settled = true;
        reject(cause);
      });
    });
  } finally {
    await api.disconnect();
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
      try { await provider.disconnect(); } catch {}
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to connect to Vibly chain RPC.");
}
