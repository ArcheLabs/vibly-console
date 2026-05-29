"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, ChevronLeft, ChevronRight, Coins, Copy, ExternalLink, Gift, Info, Loader2, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/PageHeader";
import { WalletConnectPanel } from "@/components/wallet/WalletConnectPanel";
import { useToast } from "@/components/common/Toast";
import {
  useGetVibConfig,
  useGetVibCurve,
  useGetVibProof,
  useGetVibQuote,
  useGetVibRecords,
  useGetVibSummary,
  useRecordGetVibClaim,
} from "@/lib/query/hooks";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";
import type { Entity } from "@/lib/coordinator/types";
import { errorMessage } from "@/lib/coordinator/errors";
import { networkPaymentRpcUrls, networkViblyRpcUrls, useActiveNetworkProfile, type NetworkProfile } from "@/lib/network/profiles";
import { getAuthorizedPolkadotInjector } from "@/lib/wallet/polkadotExtension";
import { decimalToBaseUnits, estimatedSlippagePercent, isPositiveDecimal } from "@/lib/get-vib/amounts";
import { queryPaymentBalance, queryPaymentChainInfo, submitPaymentTransfer } from "@/lib/get-vib/paymentTransfer";
import { addPendingGetVibRecord, readPendingGetVibRecords, reconcilePendingGetVibRecords, writePendingGetVibRecords, type PendingGetVibRecord } from "@/lib/get-vib/pendingRecords";
import { mergeGetVibRecords, paginateRecords, type GetVibTableRecord } from "@/lib/get-vib/records";

type ActiveTab = "exchange" | "curve";

export function GetVibPage() {
  const t = useTranslations("getVib");
  const toast = useToast();
  const wallet = useWalletAuth();
  const activeNetwork = useActiveNetworkProfile();
  const paymentRpcUrls = useMemo(() => networkPaymentRpcUrls(activeNetwork), [activeNetwork]);
  const viblyRpcUrls = useMemo(() => networkViblyRpcUrls(activeNetwork), [activeNetwork]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("exchange");
  const [paymentAmount, setPaymentAmount] = useState("1");
  const [balance, setBalance] = useState<{ freeBaseUnits: string; free: string } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [paymentChainInfo, setPaymentChainInfo] = useState<{ tokenSymbol?: string; tokenDecimals?: number; rpcUrl?: string } | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [transferAfterLogin, setTransferAfterLogin] = useState(false);
  const [pendingRecords, setPendingRecords] = useState<PendingGetVibRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedDeposit, setCopiedDeposit] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const configQuery = useGetVibConfig();
  const config = configQuery.data ?? {};
  const paymentTokenSymbol = paymentChainInfo?.tokenSymbol || text(config.relayTokenSymbol) || activeNetwork.paymentTokenSymbol || activeNetwork.relayTokenSymbol || "DOT";
  const paymentTokenDecimals = paymentChainInfo?.tokenDecimals ?? activeNetwork.paymentTokenDecimals ?? 10;
  const paymentRpcUrl = paymentChainInfo?.rpcUrl ?? paymentRpcUrls[0];
  const depositAddress = text(config.depositAddress);
  const networkId = normalizeNetworkId(config.networkId) || activeNetwork.id;
  const polkadotAccount = wallet.session?.ecosystem === "polkadot" ? wallet.session.address : wallet.polkadotAddress;
  const accountId = polkadotAccount ?? wallet.session?.address ?? wallet.evmAddress ?? null;
  const purchaseEnabled = config.purchaseEnabled !== false && Boolean(depositAddress);

  const quoteQuery = useGetVibQuote(paymentAmount, purchaseEnabled);
  const summaryQuery = useGetVibSummary(accountId);
  const proofQuery = useGetVibProof(accountId);
  const recordsQuery = useGetVibRecords(accountId);
  const curveQuery = useGetVibCurve();
  const claimRecordMutation = useRecordGetVibClaim();

  const quote = quoteQuery.data ?? {};
  const summary = summaryQuery.data ?? {};
  const proof = proofQuery.data ?? null;
  const curve = curvePoints(curveQuery.data);
  const curveState = entity(curveQuery.data?.state);
  const quoteErrorMessage = quoteQuery.error ? errorMessage(quoteQuery.error) : "";
  const slippage = estimatedSlippagePercent(quote.startPriceUsd, quote.averagePriceUsd);
  const slippageText = `${slippage >= 0 ? "+" : ""}${slippage.toFixed(2)}%`;
  const amountBaseUnits = amountToBaseUnitsOrNull(paymentAmount, paymentTokenDecimals);
  const balanceLoading = Boolean(polkadotAccount && paymentRpcUrls.length > 0 && !balance && !balanceError);
  const insufficientBalance = Boolean(balance && amountBaseUnits !== null && amountBaseUnits > BigInt(balance.freeBaseUnits || "0"));
  const amountInvalid = !isPositiveDecimal(paymentAmount);
  const curveAmountExceeded = isCurveAmountExceeded(quoteErrorMessage);
  const records = useMemo(
    () => mergeGetVibRecords({ pending: pendingRecords, remote: recordsQuery.data }),
    [pendingRecords, recordsQuery.data],
  );
  const paginated = paginateRecords(records, page, pageSize);
  const claimableAmount = Number(summary.claimableAmount ?? 0);

  useEffect(() => {
    if (!accountId) {
      setPendingRecords([]);
      return;
    }
    setPendingRecords(readPendingGetVibRecords(networkId, accountId));
  }, [accountId, networkId]);

  useEffect(() => {
    if (!accountId) return;
    const confirmedHashes = arrayOfEntities(recordsQuery.data?.relayDeposits).map((item) => text(item.extrinsicHash)).filter(Boolean);
    const next = reconcilePendingGetVibRecords(pendingRecords, confirmedHashes);
    if (next.length !== pendingRecords.length) {
      setPendingRecords(next);
      writePendingGetVibRecords(networkId, accountId, next);
    }
  }, [accountId, networkId, pendingRecords, recordsQuery.data]);

  useEffect(() => {
    let cancelled = false;
    setPaymentChainInfo(null);
    if (paymentRpcUrls.length === 0) return;
    void queryPaymentChainInfo(paymentRpcUrls)
      .then((next) => {
        if (!cancelled) setPaymentChainInfo(next);
      })
      .catch((cause) => {
        if (!cancelled) setBalanceError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [paymentRpcUrls]);

  useEffect(() => {
    let cancelled = false;
    setBalance(null);
    setBalanceError(null);
    if (paymentRpcUrls.length === 0 || !polkadotAccount) return;
    void queryPaymentBalance({ rpcUrl: paymentRpcUrls, accountId: polkadotAccount, decimals: paymentTokenDecimals })
      .then((next) => {
        if (!cancelled) setBalance(next);
      })
      .catch((cause) => {
        if (!cancelled) setBalanceError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [paymentRpcUrls, polkadotAccount, paymentTokenDecimals]);

  useEffect(() => {
    if (!transferAfterLogin || !polkadotAccount) return;
    setTransferAfterLogin(false);
    setLoginPromptOpen(false);
    void transferForVib();
  }, [polkadotAccount, transferAfterLogin]);

  useEffect(() => {
    setPage(1);
  }, [records.length, pageSize]);

  async function copy(value: string, setter: (value: boolean) => void) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setter(true);
    window.setTimeout(() => setter(false), 1200);
  }

  function notify(title: string, body?: string, tone: "info" | "warning" | "danger" | "success" = "warning") {
    toast.notify({ title, body, tone });
  }

  function validateGetVibAction(): boolean {
    if (!purchaseEnabled) {
      notify(t("feedback.purchaseUnavailable"), t("purchaseUnavailable"));
      return false;
    }
    if (!isPositiveDecimal(paymentAmount)) {
      notify(t("feedback.invalidAmount"), t("feedback.invalidAmountBody"));
      return false;
    }
    if (curveAmountExceeded) {
      notify(t("feedback.curveExceeded"), t("feedback.curveExceededBody"));
      return false;
    }
    if (!polkadotAccount) return true;
    if (paymentRpcUrls.length === 0) {
      notify(t("feedback.paymentRpcUnavailable"), t("paymentRpcUnavailable"));
      return false;
    }
    if (balanceLoading) {
      notify(t("feedback.balanceLoading"), t("feedback.balanceLoadingBody"), "info");
      return false;
    }
    if (balanceError) {
      notify(t("feedback.balanceUnavailable"), balanceError, "warning");
      return false;
    }
    if (insufficientBalance) {
      notify(t("feedback.insufficientBalance"), t("feedback.insufficientBalanceBody", { symbol: paymentTokenSymbol }));
      return false;
    }
    if (quoteQuery.error) {
      notify(t("quoteError"), quoteErrorMessage);
      return false;
    }
    return true;
  }

  function handleGetVib() {
    if (!validateGetVibAction()) return;
    if (!polkadotAccount) {
      setTransferError(null);
      setTransferAfterLogin(true);
      setLoginPromptOpen(true);
      return;
    }
    void transferForVib();
  }

  async function transferForVib() {
    if (!polkadotAccount || paymentRpcUrls.length === 0) return;
    setTransferError(null);
    setTransferring(true);
    try {
      const txHash = await submitPaymentTransfer({
        rpcUrl: paymentRpcUrls,
        accountId: polkadotAccount,
        depositAddress,
        amount: paymentAmount,
        decimals: paymentTokenDecimals,
      });
      const pending = addPendingGetVibRecord(networkId, polkadotAccount, {
        txHash,
        paymentAmount,
        estimatedVib: text(quote.vibAmount) || "0",
        estimatedSlippage: slippageText,
        submittedAt: new Date().toISOString(),
        status: "submitted",
      });
      setPendingRecords(pending);
      notify(t("records.statusValue.submitted"), txHash, "success");
      await Promise.all([recordsQuery.refetch(), summaryQuery.refetch()]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setTransferError(message);
      notify(t("transferError"), message, "danger");
    } finally {
      setTransferring(false);
    }
  }

  async function claimVib() {
    if (!accountId || !proof) return;
    setClaiming(true);
    setClaimError(null);
    setClaimTxHash(null);
    try {
      const txHash = await submitVibClaim(accountId, proof, viblyRpcUrls);
      setClaimTxHash(txHash);
      await claimRecordMutation.mutateAsync({
        networkId,
        accountId,
        identityId: text(proof.identityId) || undefined,
        rootVersion: Number(proof.rootVersion),
        cumulativeAmount: text(proof.cumulativeAmount),
        claimedDelta: text(summary.claimableAmount) || text(proof.cumulativeAmount),
        txHash,
        status: "confirmed",
      }).catch(() => undefined);
      await Promise.all([summaryQuery.refetch(), recordsQuery.refetch()]);
    } catch (cause) {
      setClaimError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setClaiming(false);
    }
  }

  if (configQuery.isLoading || wallet.initializing) {
    return (
      <div className="px-4 py-6 sm:px-8">
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="flex flex-col gap-6">
        <PageHeader icon={Coins} title={t("title")} description={t("description")} />

        {configQuery.error ? <InlineError title={t("error")} error={configQuery.error} /> : null}

        <div className="inline-flex w-fit rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1">
          <TabButton active={activeTab === "exchange"} onClick={() => setActiveTab("exchange")}>{t("tabs.exchange")}</TabButton>
          <TabButton active={activeTab === "curve"} onClick={() => setActiveTab("curve")}>{t("tabs.curveInfo")}</TabButton>
        </div>

        {activeTab === "exchange" ? (
          <>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <Panel className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[var(--text-muted)]">{t("records.exchangeType", { symbol: paymentTokenSymbol })}</div>
                    <h2 className="mt-1 text-xl font-semibold text-[var(--text)]">{t("purchase")}</h2>
                  </div>
                  <StatusPill active={purchaseEnabled} text={purchaseEnabled ? t("active") : t("paused")} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoBlock label={t("paymentAsset")} value={paymentTokenSymbol} />
                  <InfoBlock label={t("walletAddress")} value={short(polkadotAccount ?? "") || t("walletRequired")} />
                  <InfoBlock label={t("balance")} value={balance ? t("balanceValue", { amount: balance.free, symbol: paymentTokenSymbol }) : balanceError ? t("balanceUnavailable") : balanceLoading ? t("balanceLoading") : "—"} />
                </div>

                <label className="mt-6 block text-sm font-medium text-[var(--text-muted)]">{t("amountLabel", { symbol: paymentTokenSymbol })}</label>
                <div className={`mt-2 flex items-center gap-3 rounded-lg border bg-[var(--surface)] px-4 py-3 ${amountInvalid || insufficientBalance || curveAmountExceeded ? "border-[var(--danger)]" : "border-[var(--border)] focus-within:border-[var(--accent)]"}`}>
                  <input
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    inputMode="decimal"
                    className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-[var(--text)] outline-none"
                    aria-label={t("amountLabel", { symbol: paymentTokenSymbol })}
                  />
                  <button
                    type="button"
                    onClick={() => balance?.free && setPaymentAmount(balance.free)}
                    disabled={!balance}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
                  >
                    {t("max")}
                  </button>
                  <span className="text-sm font-semibold text-[var(--text-muted)]">{paymentTokenSymbol}</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoBlock label={t("estimatedReceive")} value={`${formatNumber(text(quote.vibAmount) || "0")} VIB`} />
                  <InfoBlock label={t("estimatedSlippage")} value={slippageText} />
                  <InfoBlock label={t("averagePrice")} value={formatUsd(text(quote.averagePriceUsd) || "0")} />
                  <InfoBlock label={t("startPrice")} value={formatUsd(text(quote.startPriceUsd) || "0")} />
                  <InfoBlock label={t("endPrice")} value={formatUsd(text(quote.endPriceUsd) || "0")} />
                  <InfoBlock label={t("costUsd")} value={formatUsd(text(quote.costUsd) || "0")} />
                </div>

                <MiniCurve curve={curve} curveState={curveState} />

                {!purchaseEnabled ? <InlineNotice>{t("purchaseUnavailable")}</InlineNotice> : null}
                {quoteQuery.error ? <InlineError title={t("quoteError")} error={quoteQuery.error} /> : null}
                {transferError ? <InlineError title={t("transferError")} error={transferError} /> : null}
                {polkadotAccount && paymentRpcUrls.length === 0 ? <InlineNotice>{t("paymentRpcUnavailable")}</InlineNotice> : null}

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleGetVib}
                    disabled={transferring}
                    className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    {transferring ? t("transferring") : "Get VIB"}
                  </button>
                </div>
                <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">{t("estimateNotice")}</p>
              </Panel>

              <div className="grid gap-5">
                <Panel>
                  <div className="flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                    <Info className="h-4 w-4 text-[var(--accent)]" />
                    {t("notice.title")}
                  </div>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
                    <p>{t("notice.estimatedOnly")}</p>
                    <p>{t("notice.finalizedRule")}</p>
                    <p>{t("notice.addressOnly")}</p>
                    <p>{t("notice.claimLater")}</p>
                  </div>
                  <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <div className="text-xs text-[var(--text-muted)]">{t("depositAddress")}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--text)]">{depositAddress || "—"}</span>
                      <button type="button" onClick={() => copy(depositAddress, setCopiedDeposit)} disabled={!depositAddress} className="text-[var(--accent)] disabled:opacity-40" aria-label={t("copy")}>
                        {copiedDeposit ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </Panel>

                <Panel>
                  <ClaimCard
                    t={t}
                    summary={summary}
                    proof={proof}
                    claimableAmount={claimableAmount}
                    claiming={claiming}
                    claimTxHash={claimTxHash}
                    claimError={claimError}
                    onClaim={claimVib}
                    canClaim={Boolean(accountId && proof && claimableAmount > 0)}
                  />
                </Panel>
              </div>
            </section>

            <Panel>
              <RecordsTable
                records={paginated.items}
                page={paginated.page}
                pageCount={paginated.pageCount}
                pageSize={pageSize}
                tokenSymbol={paymentTokenSymbol}
                t={t}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                txUrl={(hash) => txExplorerUrl(activeNetwork, hash)}
                error={recordsQuery.error}
              />
            </Panel>
          </>
        ) : (
          <section className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-4">
              <Metric label={t("totalSold")} value={formatNumber(text(curveState.sold) || "0")} unit="VIB" />
              <Metric label={t("currentPrice")} value={formatUsd(text(curveState.currentPriceUsd) || "0")} unit="USD" />
              <Metric label={t("effectiveMarketCap")} value={formatUsd(text(curveState.effectiveMarketCapUsd) || "0")} unit="USD" />
              <Metric label={t("raisedUsd")} value={formatUsd(text(curveState.raisedUsd) || "0")} unit="USD" />
            </section>
            <Panel>
              <h2 className="text-lg font-semibold text-[var(--text)]">{t("curve.fullTitle")}</h2>
              <FullCurve curve={curve} curveState={curveState} />
            </Panel>
            <Panel>
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBlock label={t("depositAddress")} value={short(depositAddress)} />
                <InfoBlock label={t("network")} value={networkId} />
                <InfoBlock label={t("curve.coordinatorStatus")} value={purchaseEnabled ? t("active") : t("paused")} />
                <InfoBlock label={t("curve.finalizedStandard")} value={t("curve.finalizedStandardValue")} />
                <InfoBlock label={t("curve.allocationStandard")} value={t("curve.allocationStandardValue")} />
                <InfoBlock label={t("curve.claimMethod")} value={t("curve.claimMethodValue")} />
              </div>
            </Panel>
          </section>
        )}
      </div>

      {loginPromptOpen ? (
        <Modal onClose={() => {
          setLoginPromptOpen(false);
          setTransferAfterLogin(false);
        }}>
          <WalletConnectPanel mode="panel" />
        </Modal>
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${active ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow)] ${className}`}>
      {children}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-[var(--text)]">{value || "—"}</div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow)]">
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[var(--text)]">{value}</span>
        <span className="text-sm text-[var(--text-subtle)]">{unit}</span>
      </div>
    </div>
  );
}

function StatusPill({ active, text: label }: { active: boolean; text: string }) {
  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${active ? "bg-[var(--success-surface)] text-[var(--accent)]" : "bg-[var(--warning-surface)] text-[var(--warning)]"}`}>
      {label}
    </span>
  );
}

function MiniCurve({ curve, curveState }: { curve: CurvePoint[]; curveState: Entity }) {
  return (
    <div className="mt-5 h-36 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curve}>
          <defs>
            <linearGradient id="miniVibCurve" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="soldVib" hide />
          <YAxis hide />
          {text(curveState.sold) ? <ReferenceLine x={text(curveState.sold)} stroke="var(--warning)" strokeDasharray="4 4" /> : null}
          <Area type="monotone" dataKey="price" stroke="var(--accent)" fill="url(#miniVibCurve)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FullCurve({ curve, curveState }: { curve: CurvePoint[]; curveState: Entity }) {
  return (
    <div className="mt-4 h-[26rem]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curve}>
          <defs>
            <linearGradient id="fullVibCurve" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="soldVib" stroke="var(--text-subtle)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-subtle)" tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toFixed(3)}`} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(value) => formatUsd(String(value))} />
          {text(curveState.sold) ? <ReferenceLine x={text(curveState.sold)} stroke="var(--warning)" strokeDasharray="4 4" /> : null}
          <Area type="monotone" dataKey="price" stroke="var(--accent)" fill="url(#fullVibCurve)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClaimCard({
  t,
  summary,
  proof,
  claimableAmount,
  claiming,
  claimTxHash,
  claimError,
  canClaim,
  onClaim,
}: {
  t: ReturnType<typeof useTranslations>;
  summary: Entity;
  proof: Entity | null;
  claimableAmount: number;
  claiming: boolean;
  claimTxHash: string | null;
  claimError: string | null;
  canClaim: boolean;
  onClaim(): void;
}) {
  const status = claiming ? "claiming" : claimError ? "failed" : claimableAmount > 0 && proof ? "claimable" : Number(summary.purchasedAllocation ?? 0) > 0 ? "waiting_allocation" : "idle";
  return (
    <div>
      <div className="flex items-center gap-2 text-base font-semibold text-[var(--text)]">
        <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
        {t("claim.title")}
      </div>
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div className="text-sm text-[var(--text-muted)]">{t("claim.status." + status)}</div>
        <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{formatNumber(text(summary.claimableAmount) || "0")} VIB</div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">
        <div>{t("purchased")}: {formatNumber(text(summary.purchasedAllocation) || "0")} VIB</div>
        <div>{t("claimed")}: {formatNumber(text(summary.claimedAmount) || "0")} VIB</div>
      </div>
      <button
        type="button"
        onClick={onClaim}
        disabled={!canClaim || claiming}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:border disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--text-muted)]"
      >
        {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {claiming ? t("claiming") : t("claim.claimVib")}
      </button>
      {claimTxHash ? <p className="mt-3 break-all text-xs text-[var(--accent)]">{t("claimSubmitted")}: {claimTxHash}</p> : null}
      {claimError ? <p className="mt-3 text-xs text-[var(--danger)]">{claimError}</p> : null}
    </div>
  );
}

function RecordsTable({
  records,
  page,
  pageCount,
  pageSize,
  tokenSymbol,
  t,
  onPageChange,
  onPageSizeChange,
  txUrl,
  error,
}: {
  records: GetVibTableRecord[];
  page: number;
  pageCount: number;
  pageSize: number;
  tokenSymbol: string;
  t: ReturnType<typeof useTranslations>;
  onPageChange(page: number): void;
  onPageSizeChange(pageSize: number): void;
  txUrl(hash: string): string | undefined;
  error: unknown;
}) {
  if (error) return <InlineError title={t("recordsError")} error={error} />;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">{t("records.title")}</h2>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]"
        >
          {[10, 20, 50].map((value) => <option key={value} value={value}>{t("records.pageSize", { count: value })}</option>)}
        </select>
      </div>
      {records.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">{t("emptyRecords")}</div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">{t("records.type")}</th>
                  <th className="py-2 pr-3">{t("records.paymentAmount")}</th>
                  <th className="py-2 pr-3">{t("records.receivedVib")}</th>
                  <th className="py-2 pr-3">{t("records.slippage")}</th>
                  <th className="py-2 pr-3">{t("records.status")}</th>
                  <th className="py-2 pr-3">{t("records.txHash")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => <RecordRow key={record.id} record={record} tokenSymbol={tokenSymbol} t={t} txUrl={txUrl} />)}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 md:hidden">
            {records.map((record) => <RecordCard key={record.id} record={record} tokenSymbol={tokenSymbol} t={t} txUrl={txUrl} />)}
          </div>
        </>
      )}
      <div className="mt-4 flex items-center justify-end gap-2 text-sm text-[var(--text-muted)]">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-md border border-[var(--border)] p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <span>{page} / {pageCount}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} className="rounded-md border border-[var(--border)] p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function RecordRow({ record, tokenSymbol, t, txUrl }: { record: GetVibTableRecord; tokenSymbol: string; t: ReturnType<typeof useTranslations>; txUrl(hash: string): string | undefined }) {
  const url = txUrl(record.txHash);
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-3 pr-3 text-[var(--text)]">{t("records.exchangeType", { symbol: tokenSymbol })}</td>
      <td className="py-3 pr-3 text-[var(--text)]">{record.paymentAmount} {tokenSymbol}</td>
      <td className="py-3 pr-3 text-[var(--text)]">{formatNumber(record.receivedVib)} VIB</td>
      <td className="py-3 pr-3 text-[var(--text-muted)]">{record.slippage}</td>
      <td className="py-3 pr-3 text-[var(--text-muted)]">{t("records.statusValue." + record.status)}</td>
      <td className="py-3 pr-3">{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--accent)]">{short(record.txHash)} <ExternalLink className="h-3 w-3" /></a> : <span className="font-mono text-xs text-[var(--text-muted)]">{short(record.txHash)}</span>}</td>
    </tr>
  );
}

function RecordCard({ record, tokenSymbol, t, txUrl }: { record: GetVibTableRecord; tokenSymbol: string; t: ReturnType<typeof useTranslations>; txUrl(hash: string): string | undefined }) {
  const url = txUrl(record.txHash);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex justify-between gap-3">
        <div className="font-medium text-[var(--text)]">{t("records.exchangeType", { symbol: tokenSymbol })}</div>
        <div className="text-sm text-[var(--text-muted)]">{t("records.statusValue." + record.status)}</div>
      </div>
      <div className="mt-3 grid gap-1 text-sm text-[var(--text-muted)]">
        <div>{record.paymentAmount} {tokenSymbol} → {formatNumber(record.receivedVib)} VIB</div>
        <div>{record.slippage} · {formatTime(record.time)}</div>
        <div>{url ? <a href={url} target="_blank" rel="noreferrer" className="text-[var(--accent)]">{short(record.txHash)}</a> : short(record.txHash)}</div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: ReactNode; onClose(): void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-4 sm:items-center sm:py-8" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function InlineNotice({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-surface)] px-4 py-3 text-sm text-[var(--warning)]">{children}</div>;
}

function InlineError({ title, error }: { title: string; error: unknown }) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger)]">
      <div>{title}</div>
      <div className="mt-1 text-xs opacity-90">{typeof error === "string" ? error : errorMessage(error)}</div>
    </div>
  );
}

type CurvePoint = { soldVib: string; price: number; cumulativeDot: string };

function curvePoints(value: Entity | undefined): CurvePoint[] {
  return arrayOfEntities(value?.points).map((point) => ({
    soldVib: text(point.soldVib),
    price: Number(point.price) || Number(point.priceUsd) || 0,
    cumulativeDot: text(point.cumulativeDot),
  }));
}

function arrayOfEntities(value: unknown): Entity[] {
  return Array.isArray(value) ? value.filter((item): item is Entity => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function entity(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeNetworkId(value: unknown): string {
  const raw = text(value).trim();
  return raw && raw.toLowerCase() !== "unknown" ? raw : "";
}

function amountToBaseUnitsOrNull(value: string, decimals: number): bigint | null {
  try {
    return decimalToBaseUnits(value, decimals);
  } catch {
    return null;
  }
}

function isCurveAmountExceeded(message: string): boolean {
  return /exceed|remaining|soldAfter|allocation|maximum|capacity|上限|超过/i.test(message);
}

function short(value: string): string {
  if (!value) return "";
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function formatTime(value: string): string {
  if (!value) return "";
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function formatNumber(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(numeric);
}

function formatUsd(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: numeric < 1 ? 6 : 2 }).format(numeric);
}

function txExplorerUrl(profile: NetworkProfile, txHash: string): string | undefined {
  if (!profile.explorerTxUrl || !txHash) return undefined;
  return profile.explorerTxUrl.includes("{txHash}") ? profile.explorerTxUrl.replace("{txHash}", txHash) : `${profile.explorerTxUrl}${txHash}`;
}

async function submitVibClaim(accountId: string, proof: Entity, rpcUrls: string[]): Promise<string> {
  if (rpcUrls.length === 0) throw new Error("Vibly chain RPC is not configured for the active network profile.");
  const [{ ApiPromise, WsProvider }, injector] = await Promise.all([
    import("@polkadot/api"),
    getAuthorizedPolkadotInjector(accountId),
  ]);
  let api: InstanceType<typeof ApiPromise> | undefined;
  let lastError: unknown;
  for (const rpcUrl of rpcUrls) {
    try {
      api = await ApiPromise.create({ provider: new WsProvider(rpcUrl) });
      break;
    } catch (cause) {
      lastError = cause;
    }
  }
  if (!api) throw lastError instanceof Error ? lastError : new Error("Unable to connect to Vibly chain RPC.");
  try {
    if (!injector.signer) throw new Error("Current wallet does not expose a Polkadot signer.");
    const tx = api.tx.vibClaim.claim(
      text(proof.networkId),
      Number(proof.rootVersion),
      text(proof.identityId),
      decimalToBaseUnits(text(proof.cumulativeAmount), 12).toString(),
      arrayOfEntities(proof.proof).map((item) => ({
        position: text(item.position) === "left" ? "Left" : "Right",
        hash: text(item.hash),
      })),
    );
    return await new Promise<string>((resolve, reject) => {
      let unsub: (() => void) | undefined;
      tx.signAndSend(accountId, { signer: injector.signer }, (result) => {
        if (result.dispatchError) {
          reject(new Error(result.dispatchError.toString()));
          unsub?.();
          return;
        }
        if (result.status.isInBlock || result.status.isFinalized) {
          resolve(tx.hash.toHex());
          unsub?.();
        }
      }).then((fn) => {
        unsub = fn;
      }).catch(reject);
    });
  } finally {
    await api.disconnect();
  }
}
