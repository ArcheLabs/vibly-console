"use client";

import { CheckCircle2, ExternalLink, Info, Loader2, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  dismissChainTransaction,
  useChainTransactions,
  type ChainTransactionPhase,
} from "@/lib/chain/transactionStore";

export function ChainTransactionTray() {
  const items = useChainTransactions();
  if (!items.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[190] grid w-[min(28rem,calc(100vw-2rem))] gap-3">
      {items.map((item) => (
        <ChainTransactionCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ChainTransactionCard({
  item,
}: {
  item: ReturnType<typeof useChainTransactions>[number];
}) {
  const t = useTranslations("chainTx");
  const meta = phaseMeta(item.phase, t);
  const Icon = meta.icon;

  return (
    <div className={`rounded-2xl border p-4 shadow-[var(--shadow)] ${meta.tone}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-4 w-4 ${meta.spin ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="text-xs opacity-75">{meta.label}</div>
          </div>
          {item.body ? <div className="mt-1 text-xs leading-5 opacity-85">{item.body}</div> : null}
          {item.txHash ? <div className="mt-2 break-all font-mono text-[11px] opacity-80">{item.txHash}</div> : null}
          <div className="mt-3 flex items-center gap-3 text-xs">
            {item.explorerUrl ? (
              <a
                href={item.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 opacity-85 hover:opacity-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("viewExplorer")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => dismissChainTransaction(item.id)}
              className="inline-flex items-center gap-1 opacity-75 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
              {t("dismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function phaseMeta(phase: ChainTransactionPhase, t: ReturnType<typeof useTranslations<"chainTx">>) {
  switch (phase) {
    case "awaiting_signature":
      return {
        icon: Loader2,
        label: t("awaitingSignature"),
        tone: "border-[var(--warning)]/30 bg-[var(--warning-surface)] text-[var(--warning)]",
        spin: true,
      };
    case "broadcast":
      return {
        icon: Loader2,
        label: t("broadcast"),
        tone: "border-[var(--warning)]/30 bg-[var(--warning-surface)] text-[var(--warning)]",
        spin: true,
      };
    case "in_block":
      return {
        icon: Loader2,
        label: t("inBlock"),
        tone: "border-[var(--accent)]/30 bg-[var(--surface-raised)] text-[var(--accent)]",
        spin: true,
      };
    case "finalized":
      return {
        icon: Info,
        label: t("finalized"),
        tone: "border-[var(--accent)]/30 bg-[var(--surface-raised)] text-[var(--accent)]",
        spin: false,
      };
    case "waiting_sync":
      return {
        icon: Loader2,
        label: t("waitingSync"),
        tone: "border-[var(--accent)]/30 bg-[var(--surface-raised)] text-[var(--accent)]",
        spin: true,
      };
    case "completed":
      return {
        icon: CheckCircle2,
        label: t("completed"),
        tone: "border-[var(--accent)]/30 bg-[var(--success-surface)] text-[var(--accent)]",
        spin: false,
      };
    case "failed":
      return {
        icon: XCircle,
        label: t("failed"),
        tone: "border-[var(--danger)]/30 bg-[var(--danger-surface)] text-[var(--danger)]",
        spin: false,
      };
  }
}
