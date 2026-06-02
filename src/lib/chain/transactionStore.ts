"use client";

import { useSyncExternalStore } from "react";

export type ChainTransactionPhase =
  | "awaiting_signature"
  | "broadcast"
  | "in_block"
  | "finalized"
  | "waiting_sync"
  | "completed"
  | "failed";

export interface ChainTransactionRecord {
  id: string;
  title: string;
  body?: string;
  phase: ChainTransactionPhase;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const listeners = new Set<() => void>();
let records: ChainTransactionRecord[] = [];

function emit() {
  for (const listener of listeners) listener();
}

function trim(next: ChainTransactionRecord[]) {
  return next.slice(0, 8);
}

export function createChainTransaction(input: {
  title: string;
  body?: string;
  phase?: ChainTransactionPhase;
}): ChainTransactionRecord {
  const now = new Date().toISOString();
  const record: ChainTransactionRecord = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    body: input.body,
    phase: input.phase ?? "awaiting_signature",
    createdAt: now,
    updatedAt: now,
  };
  records = trim([record, ...records]);
  emit();
  return record;
}

export function updateChainTransaction(
  id: string,
  patch: Partial<Omit<ChainTransactionRecord, "id" | "createdAt">>,
): ChainTransactionRecord | null {
  let updated: ChainTransactionRecord | null = null;
  records = trim(records.map((record) => {
    if (record.id !== id) return record;
    updated = {
      ...record,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  }));
  if (updated) emit();
  return updated;
}

export function dismissChainTransaction(id: string) {
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) return;
  records = next;
  emit();
}

export function readChainTransactions(): ChainTransactionRecord[] {
  return records;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChainTransactions(): ChainTransactionRecord[] {
  return useSyncExternalStore(subscribe, readChainTransactions, () => []);
}
