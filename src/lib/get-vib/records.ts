import type { Entity } from "@/lib/coordinator/types";
import type { PendingGetVibRecord } from "@/lib/get-vib/pendingRecords";

export type GetVibRecordStatus =
  | "submitted"
  | "finalized_pending"
  | "allocation_pending"
  | "allocated"
  | "allocated_pending_launch"
  | "claimable"
  | "claimed"
  | "failed";

export interface GetVibTableRecord {
  id: string;
  type: "exchange";
  paymentAmount: string;
  receivedVib: string;
  time: string;
  status: GetVibRecordStatus;
  txHash: string;
}

export function mergeGetVibRecords(input: {
  pending: PendingGetVibRecord[];
  remote?: Entity;
  claimEnabled?: boolean;
}): GetVibTableRecord[] {
  const relayDeposits = entities(input.remote?.relayDeposits);
  const deposits = entities(input.remote?.deposits);
  const allocations = entities(input.remote?.allocations);
  const claims = entities(input.remote?.claims);
  const allocatedBySource = new Map(allocations.map((item) => [text(item.sourceId), item]));
  const claimed = claims.some((item) => text(item.status) === "confirmed");

  const remoteTxHashes = new Set<string>();
  const remoteRows = relayDeposits.map((relay) => {
    const sourceId = text(relay.sourceId);
    const allocation = allocatedBySource.get(sourceId);
    const deposit = deposits.find((item) => text(item.sourceId) === sourceId);
    const txHash = text(relay.extrinsicHash) || text(relay.sourceId);
    if (txHash) remoteTxHashes.add(txHash);
    return {
      id: sourceId || txHash,
      type: "exchange" as const,
      paymentAmount: text(relay.dotAmount) || text(relay.paymentAmount) || text(deposit?.dotAmount),
      receivedVib: text(allocation?.vibAmount) || text(deposit?.quotedVibAmount) || "0",
      time: text(relay.finalizedAt) || text(relay.observedAt),
      status: statusFromRemote(text(relay.status), Boolean(allocation), claimed, input.claimEnabled !== false),
      txHash,
    };
  });

  const pendingRows = input.pending
    .filter((item) => !remoteTxHashes.has(item.txHash) && !hasMatchingRemotePayment(item, remoteRows))
    .map((item) => ({
      id: item.txHash,
      type: "exchange" as const,
      paymentAmount: item.paymentAmount,
      receivedVib: item.estimatedVib,
      time: item.submittedAt,
      status: item.status,
      txHash: item.txHash,
    }));

  return [...pendingRows, ...remoteRows].sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
}

export function paginateRecords<T>(records: T[], page: number, pageSize: number): { page: number; pageCount: number; items: T[] } {
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(records.length / safePageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    page: safePage,
    pageCount,
    items: records.slice((safePage - 1) * safePageSize, safePage * safePageSize),
  };
}

function statusFromRemote(relayStatus: string, hasAllocation: boolean, claimed: boolean, claimEnabled: boolean): GetVibRecordStatus {
  if (relayStatus === "failed") return "failed";
  if (claimed && hasAllocation) return "claimed";
  if (hasAllocation) return claimEnabled ? "claimable" : "allocated_pending_launch";
  if (relayStatus === "confirmed") return "allocated";
  return "allocation_pending";
}

function hasMatchingRemotePayment(
  pending: PendingGetVibRecord,
  remoteRows: Array<{ paymentAmount: string; time: string; status: GetVibRecordStatus }>,
): boolean {
  const pendingAmount = Number(pending.paymentAmount);
  const pendingTime = new Date(pending.submittedAt).getTime();
  if (!Number.isFinite(pendingAmount) || !Number.isFinite(pendingTime)) return false;
  return remoteRows.some((row) => {
    const remoteAmount = Number(row.paymentAmount);
    const remoteTime = new Date(row.time).getTime();
    if (!Number.isFinite(remoteAmount) || Math.abs(remoteAmount - pendingAmount) > 0.0000000001) return false;
    if (Number.isFinite(remoteTime) && remoteTime + 10 * 60_000 < pendingTime) return false;
    return row.status !== "failed";
  });
}

function entities(value: unknown): Entity[] {
  return Array.isArray(value) ? value.filter((item): item is Entity => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
