export type PendingGetVibStatus = "submitted" | "finalized_pending" | "allocation_pending";

export interface PendingGetVibRecord {
  txHash: string;
  paymentAmount: string;
  estimatedVib: string;
  estimatedSlippage: string;
  submittedAt: string;
  status: PendingGetVibStatus;
}

const PREFIX = "vibly-console.get-vib.pending";

export function pendingGetVibKey(networkId: string, accountId: string): string {
  return `${PREFIX}.${networkId}.${accountId}`;
}

export function readPendingGetVibRecords(networkId: string, accountId: string): PendingGetVibRecord[] {
  if (typeof window === "undefined" || !networkId || !accountId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(pendingGetVibKey(networkId, accountId)) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isPendingRecord) : [];
  } catch {
    return [];
  }
}

export function writePendingGetVibRecords(networkId: string, accountId: string, records: PendingGetVibRecord[]): void {
  if (typeof window === "undefined" || !networkId || !accountId) return;
  window.localStorage.setItem(pendingGetVibKey(networkId, accountId), JSON.stringify(records.slice(0, 50)));
}

export function addPendingGetVibRecord(networkId: string, accountId: string, record: PendingGetVibRecord): PendingGetVibRecord[] {
  const existing = readPendingGetVibRecords(networkId, accountId).filter((item) => item.txHash !== record.txHash);
  const next = [record, ...existing];
  writePendingGetVibRecords(networkId, accountId, next);
  return next;
}

export function reconcilePendingGetVibRecords(
  pending: PendingGetVibRecord[],
  confirmedTxHashes: string[],
): PendingGetVibRecord[] {
  const confirmed = new Set(confirmedTxHashes.filter(Boolean));
  return pending.filter((record) => !confirmed.has(record.txHash));
}

function isPendingRecord(value: unknown): value is PendingGetVibRecord {
  const record = value as PendingGetVibRecord;
  return Boolean(
    record &&
      typeof record === "object" &&
      typeof record.txHash === "string" &&
      typeof record.paymentAmount === "string" &&
      typeof record.estimatedVib === "string" &&
      typeof record.estimatedSlippage === "string" &&
      typeof record.submittedAt === "string" &&
      (record.status === "submitted" || record.status === "finalized_pending" || record.status === "allocation_pending"),
  );
}
