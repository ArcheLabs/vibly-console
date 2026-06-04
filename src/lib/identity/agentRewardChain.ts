import { submitSubstrateTransaction, type SubstrateTransactionStatus } from "@/lib/chain/substrateTx";

export async function claimAgentRewardsOnChain(input: {
  rpcUrl: string | string[];
  accountId: string;
  identityId: string;
  agentId: string;
  onStatus?(status: SubstrateTransactionStatus): void;
}): Promise<{ txHash: string }> {
  const txHash = await submitSubstrateTransaction({
    rpcUrl: input.rpcUrl,
    accountId: input.accountId,
    onStatus: input.onStatus,
    buildTx: (api) => api.tx.agentIncentives.claimAgentRewards(input.identityId, input.agentId),
  });
  return { txHash };
}
