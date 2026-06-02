import { submitSubstrateTransaction, type SubstrateTransactionStatus } from "@/lib/chain/substrateTx";

export interface RootIdentityRegistrationReceipt {
  txHash: string;
  identityId?: string;
}

export async function registerRootIdentityOnChain(input: {
  rpcUrl: string | string[];
  accountId: string;
  onStatus?(status: SubstrateTransactionStatus): void;
}): Promise<RootIdentityRegistrationReceipt> {
  let identityId: string | undefined;
  const txHash = await submitSubstrateTransaction({
    rpcUrl: input.rpcUrl,
    accountId: input.accountId,
    onStatus: (status) => {
      if (status.phase === "finalized") {
        identityId = extractIdentityId(status.events) ?? identityId;
      }
      input.onStatus?.(status);
    },
    buildTx: (api) => api.tx.identityCore.registerIdentity(null, null, null, null, null),
  });
  return { txHash, identityId };
}

function extractIdentityId(events: unknown[] | undefined): string | undefined {
  for (const item of events ?? []) {
    const event = asRecord(asRecord(item).event);
    const section = String(event.section ?? "").toLowerCase();
    const method = String(event.method ?? "").toLowerCase();
    if (section !== "identitycore" || method !== "identityregistered") continue;
    const data = asRecord(event.data);
    if (typeof data.identityId === "string") return data.identityId;
    if (Array.isArray(event.data) && event.data[0] != null) return String(event.data[0]);
    if (typeof event.data?.toJSON === "function") {
      const json = event.data.toJSON() as unknown;
      const record = asRecord(json);
      if (typeof record.identityId === "string") return record.identityId;
      if (Array.isArray(json) && json[0] != null) return String(json[0]);
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? value as Record<string, any> : {};
}
