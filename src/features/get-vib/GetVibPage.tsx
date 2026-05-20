"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Clipboard, Coins, Loader2, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCreateGetVibOrder,
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

type RecordKind = "deposit" | "allocation" | "claim";

interface TimelineRecord {
  id: string;
  kind: RecordKind;
  status: string;
  amount: string;
  secondary: string;
  createdAt: string;
}

export function GetVibPage() {
  const t = useTranslations("getVib");
  const wallet = useWalletAuth();
  const accountId = wallet.session?.address ?? wallet.polkadotAddress ?? wallet.evmAddress ?? null;
  const [dotAmount, setDotAmount] = useState("1");
  const configQuery = useGetVibConfig();
  const quoteQuery = useGetVibQuote(dotAmount);
  const summaryQuery = useGetVibSummary(accountId);
  const proofQuery = useGetVibProof(accountId);
  const recordsQuery = useGetVibRecords(accountId);
  const curveQuery = useGetVibCurve();
  const orderMutation = useCreateGetVibOrder();
  const claimRecordMutation = useRecordGetVibClaim();
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const config = configQuery.data ?? {};
  const quote = quoteQuery.data ?? {};
  const summary = summaryQuery.data ?? {};
  const proof = proofQuery.data ?? null;
  const records = useMemo(() => flattenRecords(recordsQuery.data), [recordsQuery.data]);
  const curve = curvePoints(curveQuery.data);

  const depositAddress = text(quote.depositAddress) || text(config.depositAddress);
  const loading = configQuery.isLoading || wallet.initializing;
  const error = configQuery.error ?? quoteQuery.error ?? summaryQuery.error ?? recordsQuery.error;

  async function copyDepositAddress() {
    if (!depositAddress) return;
    await navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function createOrder() {
    if (!accountId) return;
    orderMutation.mutate({ dotAmount, accountId });
  }

  async function claimVib() {
    if (!accountId || !proof) return;
    setClaiming(true);
    setClaimError(null);
    setClaimTxHash(null);
    try {
      const txHash = await submitVibClaim(accountId, proof);
      setClaimTxHash(txHash);
      await claimRecordMutation.mutateAsync({
        accountId,
        identityId: text(proof.identityId) || undefined,
        rootVersion: Number(proof.rootVersion),
        cumulativeAmount: text(proof.cumulativeAmount),
        claimedDelta: text(summary.claimableAmount) || text(proof.cumulativeAmount),
        txHash,
        status: "confirmed",
      });
      await Promise.all([summaryQuery.refetch(), recordsQuery.refetch()]);
    } catch (cause) {
      setClaimError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10 md:px-10">
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-sm text-[var(--accent)]">
              <Coins className="h-4 w-4" />
              {t("title")}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)] md:text-4xl">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{t("description")}</p>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-muted)]">
            {t("network")}: <span className="text-[var(--text)]">{text(config.networkId) || "unknown"}</span>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger-surface)] px-4 py-3 text-sm text-[var(--danger)]">
            {t("error")}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label={t("purchased")} value={text(summary.purchasedAllocation) || "0"} unit="VIB" />
          <Metric label={t("claimable")} value={text(summary.claimableAmount) || "0"} unit="VIB" />
          <Metric label={t("claimed")} value={text(summary.claimedAmount) || "0"} unit="VIB" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title={t("purchase")} icon={Wallet}>
            <label className="text-xs text-[var(--text-muted)]">{t("dotAmount")}</label>
            <input
              value={dotAmount}
              onChange={(event) => setDotAmount(event.target.value)}
              inputMode="decimal"
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-lg text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Info label={t("estimatedVib")} value={`${text(quote.vibAmount) || "0"} VIB`} />
              <Info label={t("depositAddress")} value={short(depositAddress)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyDepositAddress}
                disabled={!depositAddress}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? t("copied") : t("copy")}
              </button>
              <button
                type="button"
                onClick={createOrder}
                disabled={!accountId || orderMutation.isPending || !Number(dotAmount)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm text-[var(--accent-foreground)] disabled:opacity-50"
              >
                {orderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                {t("createOrder")}
              </button>
            </div>
            {!accountId ? <p className="mt-4 text-sm text-[var(--warning)]">{t("walletRequired")}</p> : null}
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{t("finalityNotice")}</p>
          </Panel>

          <Panel title={t("claim")} icon={ShieldCheck}>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="text-sm text-[var(--text-muted)]">{t("latestRoot")}</div>
              <div className="mt-1 font-mono text-sm text-[var(--text)]">{text(summary.latestRootVersion) || "0"}</div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="text-sm text-[var(--text-muted)]">{proof ? t("proofReady") : t("proofPending")}</div>
              <div className="mt-2 break-all font-mono text-xs text-[var(--text-subtle)]">
                {proof ? text(proof.merkleRoot) : t("chainPending")}
              </div>
            </div>
            <button
              type="button"
              onClick={claimVib}
              disabled={!accountId || !proof || claiming || Number(summary.claimableAmount ?? 0) <= 0}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm text-[var(--accent-foreground)] disabled:border disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--text-muted)] disabled:opacity-80"
            >
              {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {claiming ? t("claiming") : t("claimVib")}
            </button>
            {claimTxHash ? <p className="mt-3 break-all text-xs text-[var(--accent)]">{t("claimSubmitted")}: {claimTxHash}</p> : null}
            {claimError ? <p className="mt-3 text-xs text-[var(--danger)]">{claimError}</p> : null}
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title={t("curve")} icon={Coins}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve}>
                  <defs>
                    <linearGradient id="vibCurve" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="soldVib" stroke="var(--text-subtle)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-subtle)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="price" stroke="var(--accent)" fill="url(#vibCurve)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={t("records")} icon={Clipboard}>
            {records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
                {t("emptyRecords")}
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div key={`${record.kind}:${record.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[var(--text)]">{record.kind} · {record.status}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">{record.secondary}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[var(--text)]">{record.amount}</div>
                        <div className="mt-1 text-xs text-[var(--text-subtle)]">{formatTime(record.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow)]">
      <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
        <Icon className="h-5 w-5 text-[var(--accent)]" />
        {title}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow)]">
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[var(--text)]">{value}</span>
        <span className="text-sm text-[var(--text-subtle)]">{unit}</span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 truncate text-sm text-[var(--text)]">{value}</div>
    </div>
  );
}

function flattenRecords(value: Entity | undefined): TimelineRecord[] {
  const deposits = arrayOfEntities(value?.deposits).map((record) => ({
    id: text(record.id) || text(record.sourceId),
    kind: "deposit" as const,
    status: text(record.status),
    amount: `${text(record.dotAmount) || "0"} DOT`,
    secondary: text(record.sourceId),
    createdAt: text(record.finalizedAt) || text(record.observedAt),
  }));
  const allocations = arrayOfEntities(value?.allocations).map((record) => ({
    id: text(record.id),
    kind: "allocation" as const,
    status: text(record.status),
    amount: `${text(record.vibAmount) || "0"} VIB`,
    secondary: text(record.sourceId),
    createdAt: text(record.confirmedAt) || text(record.createdAt),
  }));
  const claims = arrayOfEntities(value?.claims).map((record) => ({
    id: text(record.id),
    kind: "claim" as const,
    status: text(record.status),
    amount: `${text(record.claimedDelta) || "0"} VIB`,
    secondary: text(record.txHash) || `root ${text(record.rootVersion)}`,
    createdAt: text(record.updatedAt) || text(record.createdAt),
  }));
  return [...deposits, ...allocations, ...claims].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function curvePoints(value: Entity | undefined): Array<{ soldVib: string; price: number; cumulativeDot: string }> {
  return arrayOfEntities(value?.points).map((point) => ({
    soldVib: text(point.soldVib),
    price: Number(point.price) || 0,
    cumulativeDot: text(point.cumulativeDot),
  }));
}

function arrayOfEntities(value: unknown): Entity[] {
  return Array.isArray(value) ? value.filter((item): item is Entity => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function short(value: string): string {
  if (!value) return "—";
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function formatTime(value: string): string {
  if (!value) return "";
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "");
}

async function submitVibClaim(accountId: string, proof: Entity): Promise<string> {
  const [{ ApiPromise, WsProvider }, { web3FromAddress }] = await Promise.all([
    import("@polkadot/api"),
    import("@polkadot/extension-dapp"),
  ]);
  const rpcUrl = process.env.NEXT_PUBLIC_VIBLY_RPC_URL ?? process.env.NEXT_PUBLIC_SUBSTRATE_RPC_URL ?? "ws://127.0.0.1:9944";
  const api = await ApiPromise.create({ provider: new WsProvider(rpcUrl) });
  try {
    const injector = await web3FromAddress(accountId);
    if (!injector.signer) throw new Error("Current wallet does not expose a Polkadot signer.");
    const tx = api.tx.vibClaim.claim(
      utf8Bytes(text(proof.networkId)),
      Number(proof.rootVersion),
      utf8Bytes(text(proof.identityId)),
      decimalToBaseUnits(text(proof.cumulativeAmount)),
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

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decimalToBaseUnits(value: string): string {
  const [wholeRaw, fractionRaw = ""] = value.split(".");
  const whole = wholeRaw || "0";
  const fraction = `${fractionRaw}${"0".repeat(12)}`.slice(0, 12);
  return String(BigInt(whole) * 1_000_000_000_000n + BigInt(fraction));
}
