"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Coins, Copy, ExternalLink, Gift, Info, Loader2, ShieldCheck, X } from "lucide-react";
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
import { networkPaymentRpcUrls, networkViblyRpcUrls, useActiveNetworkProfile } from "@/lib/network/profiles";
import { decimalToBaseUnits, isPositiveDecimal } from "@/lib/get-vib/amounts";
import { queryPaymentBalance, submitPaymentTransfer } from "@/lib/get-vib/paymentTransfer";
import { addPendingGetVibRecord, readPendingGetVibRecords, reconcilePendingGetVibRecords, writePendingGetVibRecords, type PendingGetVibRecord } from "@/lib/get-vib/pendingRecords";
import { mergeGetVibRecords, paginateRecords, type GetVibTableRecord } from "@/lib/get-vib/records";
import { useGetVibLiveEvents } from "@/lib/query/useGetVibLiveEvents";
import { usePaymentChainInfo } from "@/lib/network/paymentChainInfo";
import {
  createChainTransaction,
  updateChainTransaction,
  useChainTransactions,
} from "@/lib/chain/transactionStore";
import { submitSubstrateTransaction } from "@/lib/chain/substrateTx";
import { txExplorerUrl } from "@/lib/network/explorer";

type ActiveTab = "exchange" | "curve";

export function GetVibPage() {
  const t = useTranslations("getVib");
  const toast = useToast();
  const wallet = useWalletAuth();
  const activeNetwork = useActiveNetworkProfile();
  const paymentRpcUrls = useMemo(() => networkPaymentRpcUrls(activeNetwork), [activeNetwork]);
  const viblyRpcUrls = useMemo(() => networkViblyRpcUrls(activeNetwork), [activeNetwork]);

  const paymentChainInfo = usePaymentChainInfo();

  const [activeTab, setActiveTab] = useState<ActiveTab>("exchange");
  const [paymentAmount, setPaymentAmount] = useState("1");
  const [balance, setBalance] = useState<{ freeBaseUnits: string; free: string } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
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
  const [claimError, setClaimError] = useState<string | null>(null);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | null>(null);
  const [claimTransactionId, setClaimTransactionId] = useState<string | null>(null);
  const chainTransactions = useChainTransactions();

  const configQuery = useGetVibConfig();
  const config = configQuery.data ?? {};
  const paymentTokenSymbol = paymentChainInfo?.tokenSymbol || text(config.relayTokenSymbol) || activeNetwork.paymentTokenSymbol || activeNetwork.relayTokenSymbol || "DOT";
  const paymentTokenDecimals = paymentChainInfo?.tokenDecimals ?? activeNetwork.paymentTokenDecimals ?? 10;
  const paymentRpcUrl = paymentChainInfo?.rpcUrl ?? paymentRpcUrls[0];
  const depositAddress = text(config.depositAddress);
  const networkId = normalizeNetworkId(config.networkId) || activeNetwork.id;
  const getVibConversionEnabled = activeNetwork.features?.getVibConversion !== false;
  const getVibClaimEnabled = activeNetwork.features?.getVibClaim !== false;
  const polkadotAccount = wallet.session?.ecosystem === "polkadot" ? wallet.session.address : wallet.polkadotAddress;
  const accountId = polkadotAccount ?? wallet.session?.address ?? wallet.evmAddress ?? null;
  const purchaseEnabled = getVibConversionEnabled && config.purchaseEnabled !== false && Boolean(depositAddress);
  const quoteQuery = useGetVibQuote(paymentAmount, purchaseEnabled);
  const summaryQuery = useGetVibSummary(accountId);
  const proofQuery = useGetVibProof(accountId);
  const recordsQuery = useGetVibRecords(accountId);
  const curveQuery = useGetVibCurve();
  const claimRecordMutation = useRecordGetVibClaim();
  useGetVibLiveEvents();

  const quote = quoteQuery.data ?? {};
  const summary = summaryQuery.data ?? {};
  const proof = proofQuery.data ?? null;
  const curve = curvePoints(curveQuery.data);
  const curveState = entity(curveQuery.data?.state);
  const soldOut = curveState.soldOut === true;
  const quoteErrorMessage = quoteQuery.error ? errorMessage(quoteQuery.error) : "";
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
  const paymentTransaction = chainTransactions.find((item) => item.id === paymentTransactionId) ?? null;
  const claimTransaction = chainTransactions.find((item) => item.id === claimTransactionId) ?? null;

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
    for (const record of pendingRecords) {
      if (confirmedHashes.includes(record.txHash) && paymentTransaction?.txHash === record.txHash) {
        updateChainTransaction(paymentTransaction.id, {
          phase: "completed",
          body: t("feedback.paymentObserved"),
        });
      }
    }
    if (next.length !== pendingRecords.length) {
      setPendingRecords(next);
      writePendingGetVibRecords(networkId, accountId, next);
    }
  }, [accountId, networkId, paymentTransaction, pendingRecords, recordsQuery.data, t]);

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
    const tracker = createChainTransaction({
      title: t("feedback.paymentTitle"),
      body: t("feedback.awaitingSignature"),
    });
    setPaymentTransactionId(tracker.id);
    try {
      const txHash = await submitPaymentTransfer({
        rpcUrl: paymentRpcUrls,
        accountId: polkadotAccount,
        depositAddress,
        amount: paymentAmount,
        decimals: paymentTokenDecimals,
        onStatus: (status) => {
          updateChainTransaction(tracker.id, {
            phase: status.phase,
            txHash: status.txHash,
            explorerUrl: status.txHash ? txExplorerUrl(activeNetwork, status.txHash) : undefined,
            body:
              status.phase === "awaiting_signature"
                ? t("feedback.awaitingSignature")
                : status.phase === "broadcast"
                  ? t("feedback.broadcast")
                  : status.phase === "in_block"
                    ? t("feedback.inBlock")
                    : t("feedback.finalized"),
          });
        },
      });
      const pending = addPendingGetVibRecord(networkId, polkadotAccount, {
        txHash,
        paymentAmount,
        estimatedVib: text(quote.vibAmount) || "0",
        estimatedSlippage: "",
        submittedAt: new Date().toISOString(),
        status: "submitted",
      });
      setPendingRecords(pending);
      updateChainTransaction(tracker.id, {
        phase: "waiting_sync",
        txHash,
        explorerUrl: txExplorerUrl(activeNetwork, txHash),
        body: t("feedback.paymentPendingAllocation"),
      });
      notify(t("records.statusValue.submitted"), txHash, "success");
      await Promise.all([recordsQuery.refetch(), summaryQuery.refetch(), curveQuery.refetch(), quoteQuery.refetch()]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setTransferError(message);
      updateChainTransaction(tracker.id, {
        phase: "failed",
        body: message,
      });
      notify(t("transferError"), message, "danger");
    } finally {
      setTransferring(false);
    }
  }

  async function claimVib() {
    if (!polkadotAccount || !proof) return;
    setClaiming(true);
    setClaimError(null);
    const tracker = createChainTransaction({
      title: t("claimTitle"),
      body: t("feedback.awaitingSignature"),
    });
    setClaimTransactionId(tracker.id);
    try {
      const txHash = await submitVibClaim(polkadotAccount, proof, viblyRpcUrls, (status) => {
        updateChainTransaction(tracker.id, {
          phase: status.phase,
          txHash: status.txHash,
          explorerUrl: status.txHash ? txExplorerUrl(activeNetwork, status.txHash) : undefined,
          body:
            status.phase === "awaiting_signature"
              ? t("feedback.awaitingSignature")
              : status.phase === "broadcast"
                ? t("feedback.broadcast")
                : status.phase === "in_block"
                  ? t("feedback.inBlock")
                  : t("feedback.finalized"),
        });
      });
      updateChainTransaction(tracker.id, {
        phase: "waiting_sync",
        txHash,
        explorerUrl: txExplorerUrl(activeNetwork, txHash),
        body: t("feedback.claimPendingSync"),
      });
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
      updateChainTransaction(tracker.id, {
        phase: "completed",
        txHash,
        explorerUrl: txExplorerUrl(activeNetwork, txHash),
        body: t("feedback.claimCompleted"),
      });
      await Promise.all([summaryQuery.refetch(), recordsQuery.refetch()]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setClaimError(message);
      updateChainTransaction(tracker.id, {
        phase: "failed",
        body: message,
      });
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
            <section className="grid min-w-0 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_30rem] xl:items-start">
              <Panel className="min-w-0 overflow-hidden">
                {soldOut ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Coins className="h-12 w-12 text-[var(--text-muted)]" />
                    <h2 className="mt-4 text-xl font-bold text-[var(--text)]">{t("soldOut")}</h2>
                    <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">{t("soldOutDescription")}</p>
                  </div>
                ) : null}
                {/* Wallet row — only shown when connected */}
                {!soldOut && polkadotAccount ? (
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5">
                        <div className="h-4 w-4 shrink-0 rounded-full bg-[#E6007A]" />
                        <span className="shrink-0 text-sm font-semibold text-[var(--text)]">{paymentTokenSymbol}</span>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="min-w-0 truncate font-mono text-sm text-[var(--text)]">{short(polkadotAccount)}</span>
                      <button type="button" onClick={() => copy(polkadotAccount, setCopiedWallet)} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)]" aria-label={t("copy")}>
                        {copiedWallet ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Amount label + inline balance — balance only shown when connected */}
                {!soldOut ? (
                <>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--text-muted)]">{t("amountLabel", { symbol: paymentTokenSymbol })}</label>
                  {polkadotAccount && balance ? (
                    <button type="button" onClick={() => setPaymentAmount(balance.free)} className="text-xs text-[var(--accent)] hover:underline">
                      {t("balanceValue", { amount: balance.free, symbol: paymentTokenSymbol })}
                    </button>
                  ) : polkadotAccount && balanceLoading ? (
                    <span className="text-xs text-[var(--text-muted)]">{t("balanceLoading")}</span>
                  ) : null}
                </div>

                {/* Amount input */}
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
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)] transition hover:enabled:border-[var(--accent)] hover:enabled:text-[var(--accent)] disabled:cursor-default disabled:opacity-40"
                  >
                    {t("max")}
                  </button>
                  <span className="text-sm font-semibold text-[var(--text-muted)]">{paymentTokenSymbol}</span>
                </div>
                {insufficientBalance ? (
                  <div className="mt-1 text-left text-xs font-medium text-[var(--danger)]">
                    {t("feedback.insufficientBalanceBody", { symbol: paymentTokenSymbol })}
                  </div>
                ) : null}

                {/* Chevron indicator */}
                <div className="mt-4 mb-4 flex justify-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
                    <ChevronDown className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                </div>

                {/* Quote card */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-center">
                  <div className="text-sm text-[var(--text-muted)]">{t("estimatedReceive")}</div>
                  <div className="mt-1 text-4xl font-bold tracking-tight text-[var(--accent)]">
                    {formatNumber(text(quote.vibAmount) || "0")}{" "}
                    <span className="text-2xl font-semibold">VIB</span>
                  </div>
                </div>

                {/* CTA button */}
                <button
                  type="button"
                  onClick={handleGetVib}
                  disabled={transferring}
                  className="mt-4 mx-auto flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {transferring
                    ? paymentTransaction?.phase === "awaiting_signature"
                      ? t("feedback.awaitingSignature")
                      : paymentTransaction?.phase === "broadcast"
                        ? t("feedback.broadcast")
                        : paymentTransaction?.phase === "in_block"
                          ? t("feedback.inBlock")
                          : t("transferring")
                    : t("transferCta")}
                  {!transferring ? <ExternalLink className="h-3.5 w-3.5" /> : null}
                </button>

                {/* Shield disclaimer */}
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                  <span>{t("estimateNotice")}</span>
                </div>

                {!purchaseEnabled ? <InlineNotice>{t("purchaseUnavailable")}</InlineNotice> : null}
                {quoteQuery.error ? <InlineError title={t("quoteError")} error={quoteQuery.error} /> : null}
                {transferError ? <InlineError title={t("transferError")} error={transferError} /> : null}
                {polkadotAccount && paymentRpcUrls.length === 0 ? <InlineNotice>{t("paymentRpcUnavailable")}</InlineNotice> : null}
                </>
                ) : null}

                <MiniCurve curve={curve} curveState={curveState} />
              </Panel>

              <div className="grid min-w-0 gap-5 overflow-hidden">
                <Panel>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[var(--text)]">{t("notice.title")}</span>
                    <Info className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-6 text-[var(--text-muted)]">
                    <li>{t("notice.estimatedOnly")}</li>
                    <li>{t("notice.finalizedRule")}</li>
                    <li>{t("notice.addressOnly")}</li>
                    <li>{t("notice.claimLater")}</li>
                  </ul>
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
                    claimTransaction={claimTransaction}
                    claimError={claimError}
                    onClaim={claimVib}
                    canClaim={Boolean(getVibClaimEnabled && polkadotAccount && proof && claimableAmount > 0)}
                    claimUnavailableMessage={!getVibClaimEnabled ? activeNetwork.messages?.getVibClaim ?? t("feedback.claimUnavailable") : undefined}
                  />
                </Panel>
              </div>
            </section>
        ) : (
          <section className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-2">
              <Metric label={t("totalSold")} value={formatNumber(text(curveState.sold) || "0")} unit="VIB" />
              <Metric label={t("remainingAllocation")} value={formatNumber(text(curveState.remainingAllocation) || "0")} unit="VIB" />
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
          </section>
        )}
      </div>

      {loginPromptOpen ? (
        <Modal onClose={() => {
          setLoginPromptOpen(false);
          setTransferAfterLogin(false);
          setTransferring(false);
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
    <section className={`min-w-0 max-w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow)] ${className}`}>
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
  const t = useTranslations("getVib");
  const totalVib = curve.length > 0 ? Number(curve[curve.length - 1].soldVib) : 0;
  const soldVib = Number(text(curveState.sold)) || 0;
  const progressPct = totalVib > 0 ? Math.min(100, (soldVib / totalVib) * 100) : 0;
  return (
    <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-[var(--text)]">{t("curve.title")}</span>
        <Info className="h-3 w-3 text-[var(--text-muted)]" />
      </div>
      {totalVib > 0 ? (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{t("curve.soldProgress")}</span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ) : null}
      <div className="mt-3 h-24">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={curve}>
            <defs>
              <linearGradient id="miniVibCurve" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="soldVib" hide />
            <YAxis hide />
            {text(curveState.sold) ? <ReferenceLine x={text(curveState.sold)} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: t("curve.currentPoint"), position: "insideTopRight", fontSize: 10, fill: "var(--warning)" }} /> : null}
            <Area type="monotone" dataKey="price" stroke="var(--accent)" fill="url(#miniVibCurve)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FullCurve({ curve, curveState }: { curve: CurvePoint[]; curveState: Entity }) {
  return (
    <div className="mt-4 h-[26rem]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={curve}>
          <defs>
            <linearGradient id="fullVibCurve" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.5} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="soldVib" stroke="var(--text-subtle)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-subtle)" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }} />
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
  claimTransaction,
  claimError,
  claimUnavailableMessage,
  canClaim,
  onClaim,
}: {
  t: ReturnType<typeof useTranslations>;
  summary: Entity;
  proof: Entity | null;
  claimableAmount: number;
  claiming: boolean;
  claimTransaction: ReturnType<typeof useChainTransactions>[number] | null;
  claimError: string | null;
  claimUnavailableMessage?: string;
  canClaim: boolean;
  onClaim(): void;
}) {
  // Countdown: the protocol publishes a new Merkle root roughly every 30 minutes.
  // We show a countdown from the last root publication time (or just cycle from now).
  const ROOT_INTERVAL_MS = 30 * 60 * 1000;
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Derive the last root epoch from rootVersion if available, otherwise use wall clock.
    const rootVersion = Number(text(proof?.rootVersion)) || 0;
    const epochStart = rootVersion > 0
      ? new Date(text(proof?.publishedAt) || "").getTime() || (Date.now() - (Date.now() % ROOT_INTERVAL_MS))
      : Date.now() - (Date.now() % ROOT_INTERVAL_MS);
    const nextRoot = epochStart + ROOT_INTERVAL_MS;

    function tick() {
      const remaining = nextRoot - Date.now();
      setCountdown(remaining > 0 ? remaining : 0);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [proof]);

  const status = claiming ? "claiming" : claimError ? "failed" : claimableAmount > 0 && proof ? "claimable" : Number(summary.purchasedAllocation ?? 0) > 0 ? "waiting_allocation" : "idle";
  const isPending = status === "waiting_allocation";
  const countdownMinutes = countdown !== null ? Math.ceil(countdown / 60000) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-[var(--text)]">{t("claim.title")}</span>
        <Info className="h-4 w-4 text-[var(--text-muted)]" />
      </div>

      <div className="mt-5 flex flex-col items-center py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10">
          <Gift className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <div className="mt-4 text-sm text-[var(--text-muted)]">{t("claim.available")}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--accent)]">
          {formatNumber(text(summary.claimableAmount) || "0")} VIB
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]">
          {isPending || status === "idle" ? <Clock className="h-3.5 w-3.5 shrink-0" /> : null}
          {t("claim.status." + status)}
        </div>
        {isPending && countdownMinutes !== null && countdownMinutes > 0 ? (
          <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Clock className="h-3 w-3 shrink-0" />
            {t("claim.nextRootIn", { minutes: countdownMinutes })}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onClaim}
        disabled={!canClaim || claiming}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:cursor-default disabled:border disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--text-muted)]"
      >
        {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {claiming
          ? claimTransaction?.phase === "awaiting_signature"
            ? t("feedback.awaitingSignature")
            : claimTransaction?.phase === "broadcast"
              ? t("feedback.broadcast")
              : claimTransaction?.phase === "in_block"
                ? t("feedback.inBlock")
                : t("claiming")
          : !canClaim
            ? t("claim.none")
            : t("claim.claimVib")}
      </button>
      {claimUnavailableMessage ? <p className="mt-3 text-xs text-[var(--warning)]">{claimUnavailableMessage}</p> : null}
      {claimTransaction?.txHash ? <p className="mt-3 break-all text-xs text-[var(--accent)]">{t("claimSubmitted")}: {claimTransaction.txHash}</p> : null}
      {claimTransaction?.phase === "waiting_sync" && claimTransaction.body ? <p className="mt-2 text-xs text-[var(--text-muted)]">{claimTransaction.body}</p> : null}
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
      <h2 className="text-lg font-semibold text-[var(--text)]">{t("records.title")}</h2>
      {records.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">{t("emptyRecords")}</div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="py-2 pr-3">{t("records.type")}</th>
                  <th className="py-2 pr-3">{t("records.paymentAmount")} ({tokenSymbol})</th>
                  <th className="py-2 pr-3">{t("records.receivedVib")}</th>
                  <th className="py-2 pr-3">{t("records.time")}</th>
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-md border border-[var(--border)] p-2 disabled:cursor-default disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          {pageNumbers(page, pageCount).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1.5">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`min-w-[2rem] rounded-md border px-2 py-1 text-sm transition ${page === p ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} className="rounded-md border border-[var(--border)] p-2 disabled:cursor-default disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]"
        >
          {[10, 20, 50].map((value) => <option key={value} value={value}>{t("records.pageSize", { count: value })}</option>)}
        </select>
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
      <td className="py-3 pr-3 text-[var(--text-muted)]">{formatTime(record.time)}</td>
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
        <div>{formatTime(record.time)}</div>
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
  return /exceed|remaining|soldAfter|allocation|maximum|capacity|sold.?out|insufficient|售罄|上限|超过/i.test(message);
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

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

async function submitVibClaim(
  accountId: string,
  proof: Entity,
  rpcUrls: string[],
  onStatus?: Parameters<typeof submitSubstrateTransaction>[0]["onStatus"],
): Promise<string> {
  return await submitSubstrateTransaction({
    rpcUrl: rpcUrls,
    accountId,
    onStatus,
    buildTx: async (api) => api.tx.vibClaim.claim(
      text(proof.networkId),
      Number(proof.rootVersion),
      text(proof.identityId),
      decimalToBaseUnits(text(proof.cumulativeAmount), 12).toString(),
      arrayOfEntities(proof.proof).map((item) => ({
        position: text(item.position) === "left" ? "Left" : "Right",
        hash: text(item.hash),
      })),
    ),
  });
}
