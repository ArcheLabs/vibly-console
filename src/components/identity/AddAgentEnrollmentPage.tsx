"use client";

import { useEffect, useState } from "react";
import { Bot, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { WalletConnectPanel } from "@/components/wallet/WalletConnectPanel";
import { LoadingState } from "@/components/common/States";
import { AddAgentFlow, decodeEnrollmentDescriptor } from "@/components/identity/AddAgentFlow";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";
import type { Entity } from "@/lib/coordinator/types";

export function AddAgentEnrollmentPage() {
  const t = useTranslations("personalCenter");
  const wallet = useWalletAuth();
  const [descriptor, setDescriptor] = useState<Entity | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const encoded = params.get("enrollment");
    if (!encoded) return;
    try {
      setDescriptor(decodeEnrollmentDescriptor(encoded));
      setDecodeError(null);
    } catch (cause) {
      setDescriptor(null);
      setDecodeError(cause instanceof Error ? cause.message : t("addAgentDialog.invalidDescriptor"));
    }
  }, [t]);

  if (wallet.initializing) {
    return <div className="p-8"><LoadingState label="Loading wallet session..." /></div>;
  }

  if (!wallet.session) {
    return (
      <main className="px-4 py-6 sm:px-8">
        <PageHeader icon={Wallet} title={t("addAgentDialog.title")} description={t("notConnectedSubtitle")} />
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--text-muted)]">{t("notConnectedSubtitle")}</p>
          {decodeError ? <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-400">{decodeError}</div> : null}
          <div className="mt-4">
            <WalletConnectPanel mode="button" autoOpen />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
      <PageHeader icon={Bot} title={t("addAgentDialog.title")} description={t("agents.subtitle")} />
      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        {decodeError ? <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-400">{decodeError}</div> : null}
        <AddAgentFlow initialDescriptor={descriptor} />
      </section>
    </main>
  );
}
