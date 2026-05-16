"use client";

import { useState } from "react";
import { LogOut, RefreshCw, Wallet, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";

export function shortAddress(value: string | null | undefined) {
  if (!value) return "";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function WalletConnectPanel({ mode = "button" }: { mode?: "button" | "panel" }) {
  const t = useTranslations("wallet");
  const [open, setOpen] = useState(false);
  const wallet = useWalletAuth();
  const label = wallet.session
    ? `${wallet.session.ecosystem}:${shortAddress(wallet.session.address)}`
    : t("connect");

  if (mode === "panel") {
    return <WalletPanelContent onClose={null} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 max-w-[220px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-muted)]"
        aria-label={t("modalTitle")}
      >
        <Wallet className="h-4 w-4 shrink-0 text-[var(--accent)]" />
        <span className="truncate">{label}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" aria-label={t("close")} onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl" style={{ maxHeight: "calc(100vh - 3rem)" }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
            <WalletPanelContent onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function WalletPanelContent({ onClose }: { onClose: (() => void) | null }) {
  const t = useTranslations("wallet");
  const {
    evmAddress,
    polkadotAddress,
    session,
    busy,
    error,
    loginWithEvm,
    loginWithPolkadot,
    refreshSession,
    logoutWallet,
  } = useWalletAuth();

  async function run(action: () => Promise<unknown>) {
    await action();
    if (onClose) onClose();
  }

  return (
    <div>
      <div className="pr-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]">
          <Wallet className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[var(--text)]">{t("modalTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{t("modalDescription")}</p>
      </div>

      {session ? (
        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">{t("currentSession")}</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">{t("ecosystem")}</dt>
              <dd className="font-medium text-[var(--text)]">{session.ecosystem}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">{t("address")}</dt>
              <dd className="max-w-[220px] truncate font-mono text-xs text-[var(--text)]">{session.address}</dd>
            </div>
            {session.expiresAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">{t("expiresAt")}</dt>
                <dd className="font-medium text-[var(--text)]">{session.expiresAt}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {!session ? (
        <div className="mt-5 grid gap-3">
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            onClick={() => void run(loginWithPolkadot)}
          >
            <Zap className="h-4 w-4" />
            {polkadotAddress ? `DOT ${shortAddress(polkadotAddress)}` : t("connectPolkadot")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
            onClick={() => void run(loginWithEvm)}
          >
            <Wallet className="h-4 w-4" />
            {evmAddress ? `EVM ${shortAddress(evmAddress)}` : t("connectEvm")}
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
            onClick={() => void refreshSession()}
          >
            <RefreshCw className="h-4 w-4" />
            {t("refreshSession")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-surface)] disabled:opacity-50"
            onClick={() => void logoutWallet()}
          >
            <LogOut className="h-4 w-4" />
            {t("disconnect")}
          </button>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-surface)] p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
