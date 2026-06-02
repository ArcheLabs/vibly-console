import { submitSubstrateTransaction, type SubstrateTransactionStatus } from "@/lib/chain/substrateTx";

export async function registerRootIdentityOnChain(input: {
  rpcUrl: string | string[];
  accountId: string;
  onStatus?(status: SubstrateTransactionStatus): void;
}): Promise<string> {
  return await submitSubstrateTransaction({
    rpcUrl: input.rpcUrl,
    accountId: input.accountId,
    onStatus: input.onStatus,
    buildTx: (api) => api.tx.identityCore.registerIdentity(null, null, null, null, null),
  });
}
