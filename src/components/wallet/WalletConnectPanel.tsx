"use client";

import { useState } from "react";
import { LogOut, RefreshCw, Wallet, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddressAvatar } from "@/components/domain/AddressAvatar";
import { InlineLoading } from "@/components/common/States";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";

export function shortAddress(value: string | null | undefined) {
  if (!value) return "";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function WalletConnectPanel({
  mode = "button",
  placement = "default",
}: {
  mode?: "button" | "panel";
  placement?: "default" | "sidebar";
}) {
  const t = useTranslations("wallet");
  const [open, setOpen] = useState(false);
  const wallet = useWalletAuth();
  const label = wallet.session
    ? `${wallet.session.ecosystem}:${shortAddress(wallet.session.address)}`
    : placement === "sidebar"
      ? t("sidebarLogin")
      : t("connect");

  if (mode === "panel") {
    return <WalletPanelContent onClose={null} />;
  }

  const triggerClass =
    placement === "sidebar"
      ? wallet.session
        ? "flex w-full items-center gap-3 rounded-xl bg-[var(--surface-muted)] px-4 py-2.5 text-sm font-medium text-[var(--sidebar-text)] ring-1 ring-[var(--sidebar-border)] transition hover:bg-[var(--sidebar-surface-muted)]"
        : "flex w-full items-center gap-3 rounded-xl bg-[var(--accent)]/10 px-4 py-3 text-sm font-medium text-[var(--accent)] ring-1 ring-[var(--accent)]/20 transition hover:bg-[var(--accent)]/20"
      : "inline-flex h-10 max-w-[220px] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-muted)]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClass}
        aria-label={t("modalTitle")}
      >
        {wallet.session ? (
          <AddressAvatar address={wallet.session.address} label={label} size="h-7 w-7" />
        ) : (
          <Wallet className={`h-4 w-4 shrink-0 ${placement === "sidebar" ? "" : "text-[var(--accent)]"}`} />
        )}
        <span className="flex-1 truncate text-left">{label}</span>
        {placement === "sidebar" && wallet.session ? (
          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[var(--success)]" aria-hidden="true" />
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-4 sm:items-center sm:py-8" role="dialog" aria-modal="true">
          <button className="absolute inset-0 cursor-default" aria-label={t("close")} onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
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
  const [polkadotSwitchMode, setPolkadotSwitchMode] = useState(false);
  const {
    evmAddress,
    polkadotAccounts,
    session,
    busy,
    error,
    loadPolkadotAccounts,
    loginWithEvm,
    loginWithPolkadot,
    logoutWallet,
  } = useWalletAuth();

  async function run(action: () => Promise<unknown>, closeOnSuccess = true) {
    try {
      const result = await action();
      if (result !== false && closeOnSuccess && onClose) onClose();
    } catch {
      // Wallet extensions reject promises for user cancellation. The hook owns
      // the visible error state; the panel should not surface runtime errors.
    }
  }

  async function loginDefaultPolkadot() {
    setPolkadotSwitchMode(false);
    return loginWithPolkadot();
  }

  async function loginSelectedPolkadot(address: string) {
    const result = await loginWithPolkadot(address);
    if (result !== false) setPolkadotSwitchMode(false);
    return result;
  }

  async function beginAccountSwitch() {
    setPolkadotSwitchMode(false);
    await logoutWallet();
    const accounts = await loadPolkadotAccounts();
    setPolkadotSwitchMode(accounts.length > 0);
  }

  async function refreshPolkadotAccounts() {
    await loadPolkadotAccounts();
    setPolkadotSwitchMode(true);
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
          <div className="flex items-center gap-3">
            <AddressAvatar address={session.address} label={`${session.ecosystem}:${session.address}`} size="h-11 w-11" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text)]">{t("currentSession")}</div>
              <div className="truncate font-mono text-xs text-[var(--text-subtle)]">{shortAddress(session.address)}</div>
            </div>
          </div>
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
          {polkadotSwitchMode && polkadotAccounts.length > 0 ? (
            <div className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)]">{t("choosePolkadotAccount")}</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t("choosePolkadotAccountHint")}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)] disabled:opacity-50"
                  onClick={() => void run(refreshPolkadotAccounts, false)}
                  aria-label={t("refreshPolkadotAccounts")}
                  title={t("refreshPolkadotAccounts")}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                onClick={() => void run(loginDefaultPolkadot)}
              >
                <Zap className="h-4 w-4" />
                {t("useDefaultPolkadotAccount")}
              </button>
              <div className="grid gap-2">
                {polkadotAccounts.map((account) => (
                  <button
                    key={account.address}
                    type="button"
                    disabled={busy}
                    className="flex min-h-14 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
                    onClick={() => void run(() => loginSelectedPolkadot(account.address))}
                  >
                    <AddressAvatar address={account.address} label={account.name ?? account.address} size="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--text)]">
                        {account.name ?? shortAddress(account.address)}
                      </span>
                      <span className="block truncate font-mono text-xs text-[var(--text-subtle)]">
                        {account.source ? `${account.source} - ` : ""}{shortAddress(account.address)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              onClick={() => void run(loginDefaultPolkadot)}
            >
              {busy ? <InlineLoading label={t("loggingIn")} /> : <><Zap className="h-4 w-4" />{t("connectPolkadot")}</>}
            </button>
          )}
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
            onClick={() => void run(beginAccountSwitch, false)}
          >
            <RefreshCw className="h-4 w-4" />
            {t("switchAccount")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-surface)] disabled:opacity-50"
            onClick={() => void run(logoutWallet)}
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
