"use client";

import { Wallet } from "lucide-react";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";

export function WalletConnectPanel() {
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

  const short = (value: string | null | undefined) => {
    if (!value) return "未连接";
    if (value.length <= 16) return value;
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 md:flex">
        <Wallet className="h-3.5 w-3.5" />
        <span>{session ? `${session.ecosystem}:${short(session.address)}` : "Wallet 未登录"}</span>
      </div>
      {!session ? (
        <>
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void loginWithPolkadot()}
          >
            {polkadotAddress ? `DOT ${short(polkadotAddress)}` : "Connect Polkadot"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void loginWithEvm()}
          >
            {evmAddress ? `EVM ${short(evmAddress)}` : "Connect EVM"}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void refreshSession()}
          >
            Refresh Session
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => void logoutWallet()}
          >
            Disconnect Wallet
          </button>
        </>
      )}
      {error ? <span className="hidden text-xs text-red-600 lg:inline">{error}</span> : null}
    </div>
  );
}
