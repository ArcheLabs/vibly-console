import type { Entity } from "@/lib/coordinator/types";
import type { PendingGetVibRecord } from "@/lib/get-vib/pendingRecords";

export type GetVibRecordStatus =
  | "submitted"
  | "finalized_pending"
  | "allocation_pending"
  | "allocated"
  | "claimable"
  | "claimed"
  | "failed";

export interface GetVibTableRecord {
  id: string;
  type: "exchange";
  paymentAmount: string;
  receivedVib: string;
  slippage: string;
  time: string;
  status: GetVibRecordStatus;
  txHash: string;
}

export function mergeGetVibRecords(input: {
  pending: PendingGetVibRecord[];
  remote?: Entity;
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
      slippage: slippageFromPrices(allocation ?? deposit),
      time: text(relay.finalizedAt) || text(relay.observedAt),
      status: statusFromRemote(text(relay.status), Boolean(allocation), claimed),
      txHash,
    };
  });

  const pendingRows = input.pending
    .filter((item) => !remoteTxHashes.has(item.txHash))
    .map((item) => ({
      id: item.txHash,
      type: "exchange" as const,
      paymentAmount: item.paymentAmount,
      receivedVib: item.estimatedVib,
      slippage: item.estimatedSlippage,
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

function statusFromRemote(relayStatus: string, hasAllocation: boolean, claimed: boolean): GetVibRecordStatus {
  if (relayStatus === "failed") return "failed";
  if (claimed && hasAllocation) return "claimed";
  if (hasAllocation) return "claimable";
  if (relayStatus === "confirmed") return "allocated";
  return "allocation_pending";
}

function slippageFromPrices(record: Entity | undefined): string {
  const start = Number(record?.startPriceUsd);
  const average = Number(record?.averagePriceUsd);
  if (!Number.isFinite(start) || !Number.isFinite(average) || start <= 0) return "0%";
  const value = ((average - start) / start) * 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function entities(value: unknown): Entity[] {
  return Array.isArray(value) ? value.filter((item): item is Entity => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
