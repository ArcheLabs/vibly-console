"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Key,
  Lock,
  Plus,
  RefreshCcw,
  Shield,
  Wallet,
  WifiOff,
  Zap,
} from "lucide-react";
import { WalletConnectPanel, shortAddress } from "@/components/wallet/WalletConnectPanel";
import { AddressAvatar } from "@/components/domain/AddressAvatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingState } from "@/components/common/States";
import { StatusPill, CapTag } from "@/components/common/Badge";
import { useCoordinatorClient, usePersonalCenter } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";
import { networkViblyRpcUrls, useActiveNetworkProfile } from "@/lib/network/profiles";
import type { Entity } from "@/lib/coordinator/types";
import { AddAgentFlow } from "@/components/identity/AddAgentFlow";
import { registerRootIdentityOnChain } from "@/lib/identity/rootIdentityChain";
import { txExplorerUrl } from "@/lib/network/explorer";
import {
  createChainTransaction,
  updateChainTransaction,
  useChainTransactions,
} from "@/lib/chain/transactionStore";

function asRecord(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}

function asArray(value: unknown): Entity[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const LOCAL_ROOT_IDENTITY_KEY = "vibly.console.rootIdentityReceipts.v1";

export function PersonalCenterPage() {
  const t = useTranslations("personalCenter");
  const wallet = useWalletAuth();
  const network = useActiveNetworkProfile();
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = usePersonalCenter();
  const [addOpen, setAddOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [identityTransactionId, setIdentityTransactionId] = useState<string | null>(null);
  const [localRootIdentity, setLocalRootIdentity] = useState<Entity | null>(null);
  const chainTransactions = useChainTransactions();

  const agents = asArray(data?.agents);
  const alerts = asArray(data?.alerts);
  const events = asArray(data?.securityEvents);
  const stakeTotals = asRecord(data?.stakeTotals);
  const serverIdentity = asRecord(data?.identity);
  const session = asRecord(data?.session ?? wallet.session);
  const rootAddress = String(session.address ?? wallet.session?.address ?? "");
  const identity = Object.keys(serverIdentity).length ? serverIdentity : asRecord(localRootIdentity);
  const identityLabel = String(identity.displayName ?? identity.name ?? identity.identityId ?? rootAddress ?? "wallet session");
  const activeAgents = agents.filter((agent) => String(agent.dutyStatus ?? "active") === "active").length;
  const sessionKeys = agents.flatMap((agent) => asArray(agent.sessionKeys).map((key) => ({ key, agent })));
  const expiringKeys = sessionKeys.filter((item) => isExpiringSoon(String(item.key.expiresAt ?? ""))).length;
  const hasRootIdentity = Boolean(identity.identityId || identity.status);
  const identityTransaction = chainTransactions.find((item) => item.id === identityTransactionId) ?? null;
  const canRegisterRootIdentity = network.status === "active" && network.features?.rootIdentityRegistration !== false;
  const canAddAgent = network.status === "active" && network.features?.agentJoin !== false;

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => client.revokeAgentSessionKey(keyId, { reason: "Revoked from personal center" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) }),
  });

  const registerIdentityMutation = useMutation({
    mutationFn: async () => {
      if (wallet.session?.ecosystem !== "polkadot") throw new Error(t("identity.registerPolkadotOnly"));
      const tracker = createChainTransaction({
        title: t("identity.registerTitle"),
        body: t("identity.registerAwaitingSignature"),
      });
      setIdentityTransactionId(tracker.id);
      const receipt = await registerRootIdentityOnChain({
        rpcUrl: networkViblyRpcUrls(network),
        accountId: wallet.session.address,
        onStatus: (status) => {
          updateChainTransaction(tracker.id, {
            phase: status.phase,
            txHash: status.txHash,
            explorerUrl: status.txHash ? txExplorerUrl(network, status.txHash) : undefined,
            body:
              status.phase === "awaiting_signature"
                ? t("identity.registerAwaitingSignature")
                : status.phase === "broadcast"
                  ? t("identity.registerBroadcast")
                  : status.phase === "in_block"
                    ? t("identity.registerInBlock")
                    : t("identity.registerFinalized"),
          });
        },
      });
      return { ...receipt, trackerId: tracker.id };
    },
    onSuccess: async ({ txHash, identityId, trackerId }) => {
      if (identityId && rootAddress) {
        const localIdentity = {
          ecosystem: "polkadot",
          chainId: network.id,
          identityId,
          viblyRootAddress: rootAddress,
          status: "active",
          source: "finalized-transaction",
          txHash,
          updatedAt: new Date().toISOString(),
        };
        saveLocalRootIdentity(network.id, rootAddress, localIdentity);
        setLocalRootIdentity(localIdentity);
      }
      updateChainTransaction(trackerId, {
        phase: identityId ? "completed" : "waiting_sync",
        txHash,
        explorerUrl: txExplorerUrl(network, txHash),
        body: identityId ? t("identity.registerConfirmed") : t("identity.registerPendingSync"),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) });
    },
    onError: (cause) => {
      if (!identityTransactionId) return;
      updateChainTransaction(identityTransactionId, {
        phase: "failed",
        body: cause instanceof Error ? cause.message : t("identity.registerFailed"),
      });
    },
  });
  const registerBusy = registerIdentityMutation.isPending || identityTransaction?.phase === "waiting_sync";

  useEffect(() => {
    setLocalRootIdentity(rootAddress ? loadLocalRootIdentity(network.id, rootAddress) : null);
  }, [network.id, rootAddress]);

  useEffect(() => {
    if (hasRootIdentity && identityTransactionId) {
      updateChainTransaction(identityTransactionId, {
        phase: "completed",
        body: t("identity.registerConfirmed"),
      });
    }
  }, [hasRootIdentity, identityTransactionId, t]);

  useEffect(() => {
    if (!identityTransaction || hasRootIdentity || identityTransaction.phase !== "waiting_sync") return;
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasRootIdentity, identityTransaction, network.id, queryClient]);

  if (wallet.initializing) {
    return <div className="p-8"><LoadingState label="Loading wallet session..." /></div>;
  }

  if (!wallet.session && !data?.session) {
    return (
      <div className="px-4 py-6 sm:px-8">
        <PageHeader icon={Wallet} title={t("title")} description={t("notConnectedSubtitle")} />
        <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-muted)]">{t("notConnectedSubtitle")}</p>
          <WalletConnectPanel mode="button" autoOpen />
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-8"><LoadingState label="Loading personal center..." /></div>;
  if (error) return <div className="p-8"><ErrorState error={error} title="Unable to load personal center" /></div>;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <main className="px-4 py-6 sm:px-8">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-4">
            <AddressAvatar address={rootAddress} label={identityLabel} size="h-16 w-16" />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{t("title")}</h1>
                <StatusPill tone="good">{t("walletConnected")}</StatusPill>
              </div>
              {rootAddress ? (
                <p className="mt-1 font-mono text-xs text-[var(--text-subtle)]">{shortAddress(rootAddress)}</p>
              ) : null}
              <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void refetch()} className="action-secondary">
              <RefreshCcw className="h-4 w-4" /> {t("syncState")}
            </button>
            <button type="button" onClick={() => setReceiptOpen(true)} className="action-secondary">
              <Zap className="h-4 w-4" /> {t("recordTx")}
            </button>
            <button type="button" onClick={() => setAddOpen(true)} disabled={!canAddAgent} className="action-primary disabled:cursor-not-allowed disabled:opacity-50" title={!canAddAgent ? network.messages?.prelaunch ?? t("networkFeatureUnavailable") : undefined}>
              <Plus className="h-4 w-4" /> {t("addAgent")}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Shield} label={t("metrics.identity")} value={identity.status ? String(identity.status) : "Not linked"} sub={String(identity.identityId ?? session.address ?? "wallet session")} tone={identity.status ? "good" : "warning"} />
          <MetricCard icon={Bot} label={t("metrics.myAgents")} value={String(agents.length)} sub={`${activeAgents} active duty`} />
          <MetricCard icon={Key} label={t("metrics.sessionKeys")} value={String(sessionKeys.length)} sub={`${expiringKeys} expiring soon`} tone={expiringKeys ? "warning" : "good"} />
          <MetricCard icon={Activity} label={t("metrics.stake")} value={String(stakeTotals.activeAmount ?? "0")} sub={`${String(stakeTotals.unbondingAmount ?? "0")} pending unbond`} tone="good" />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title={t("balance.title")} subtitle={t("balance.subtitle")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <BalanceLine icon={Wallet} label={t("balance.activeStake")} value={String(stakeTotals.activeAmount ?? "0")} hint={`${String(stakeTotals.activeCount ?? 0)} ${t("balance.activeStakeHint")}`} />
              <BalanceLine icon={Clock3} label={t("balance.pendingUnbond")} value={String(stakeTotals.unbondingAmount ?? "0")} hint={`${String(stakeTotals.unbondingCount ?? 0)} ${t("balance.pendingUnbondHint")}`} />
              <BalanceLine icon={Lock} label={t("balance.releaseBlocks")} value={String(stakeTotals.releaseBlockedCount ?? 0)} hint={t("balance.releaseBlocksHint")} unit="" />
              <BalanceLine icon={Bot} label={t("balance.boundAgents")} value={String(agents.length)} hint={t("balance.boundAgentsHint")} unit="" />
            </div>
          </Panel>

          <Panel title={t("identity.title")} subtitle={t("identity.subtitle")}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-4">
                <AddressAvatar address={rootAddress} label={identityLabel} size="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-normal uppercase tracking-wide text-[var(--text-subtle)]">{t("identity.rootWallet")}</div>
                  <div className="mt-1 truncate font-mono text-sm text-[var(--text)]">{rootAddress || "unknown"}</div>
                </div>
              </div>
              <KeyValue label={t("identity.identityId")} value={String(identity.identityId ?? "not linked")} />
              <div className="grid grid-cols-2 gap-3">
                <InfoTile label={t("identity.ecosystem")} value={String(session.ecosystem ?? "wallet")} />
                <InfoTile label={t("identity.recovery")} value={String(identity.recoveryStatus ?? "Not set")} tone="warning" />
              </div>
              {!hasRootIdentity ? (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <div className="text-sm font-semibold text-[var(--text)]">{t("identity.registerTitle")}</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t("identity.registerHint")}</p>
                  {wallet.session?.ecosystem !== "polkadot" ? (
                    <div className="mt-3 text-xs text-amber-400">{t("identity.registerPolkadotOnly")}</div>
                  ) : null}
                  {!canRegisterRootIdentity ? (
                    <div className="mt-3 text-xs text-amber-400">{network.messages?.prelaunch ?? t("networkFeatureUnavailable")}</div>
                  ) : null}
                  <button
                    type="button"
                    className="action-primary mt-4"
                    disabled={registerBusy || wallet.session?.ecosystem !== "polkadot" || !canRegisterRootIdentity}
                    onClick={() => registerIdentityMutation.mutate()}
                  >
                    {registerIdentityMutation.isPending
                      ? identityTransaction?.phase === "awaiting_signature"
                        ? t("identity.registerAwaitingSignature")
                        : identityTransaction?.phase === "broadcast"
                          ? t("identity.registerBroadcast")
                          : identityTransaction?.phase === "in_block"
                            ? t("identity.registerInBlock")
                            : t("identity.registering")
                      : identityTransaction?.phase === "waiting_sync"
                        ? t("identity.registerWaitingSync")
                        : t("identity.registerAction")}
                  </button>
                  {identityTransaction?.txHash ? (
                    <div className="mt-3 space-y-2">
                      <div className="break-all font-mono text-xs text-[var(--text-muted)]">{t("identity.registerSubmitted")}: {identityTransaction.txHash}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {identityTransaction.phase === "waiting_sync"
                          ? t("identity.registerPendingSync")
                          : identityTransaction.phase === "completed"
                            ? t("identity.registerConfirmed")
                            : identityTransaction.phase === "failed"
                              ? t("identity.registerFailed")
                              : t("identity.registerSubmitted")}
                      </div>
                    </div>
                  ) : null}
                  {registerIdentityMutation.error ? (
                    <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-400">
                      {registerIdentityMutation.error instanceof Error ? registerIdentityMutation.error.message : t("identity.registerFailed")}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Panel>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_0.7fr]">
          <Panel title={t("agents.title")} subtitle={t("agents.subtitle")} action={<button className="small-button" onClick={() => setAddOpen(true)}>{t("agents.add")}</button>}>
            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_0.8fr_0.8fr] gap-4 px-1 pb-3 text-xs font-normal uppercase tracking-wide text-[var(--text-subtle)]">
                  <div>{t("agents.colAgent")}</div><div>{t("agents.colSessionKey")}</div><div>{t("agents.colCapabilities")}</div><div>{t("agents.colDuty")}</div><div>{t("agents.colStake")}</div><div className="text-right">{t("agents.colAction")}</div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {agents.length ? agents.map((agent) => (
                    <AgentRow key={String(agent.principalId)} agent={agent} onRevoke={(keyId) => revokeMutation.mutate(keyId)} busy={revokeMutation.isPending} />
                  )) : <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">{t("agents.empty")}</div>}
                </div>
              </div>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title={t("alerts.title")} subtitle={t("alerts.subtitle")}>
              <div className="space-y-3">
                {alerts.length ? alerts.map((alert) => <AlertItem key={String(alert.id)} alert={alert} />) : (
                  <AlertItem alert={{ severity: "success", title: "No active alerts", detail: "Session keys and stake ledgers look healthy." }} />
                )}
              </div>
            </Panel>
            <Panel title={t("quickActions.title")}>
              <div className="grid gap-3">
                <button type="button" disabled={!canAddAgent} className="quick-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setAddOpen(true)}><span><Plus className="h-4 w-4" /> {t("quickActions.addAgent")}</span><ChevronRight className="h-4 w-4" /></button>
                <button type="button" className="quick-secondary" onClick={() => setReceiptOpen(true)}><span><Zap className="h-4 w-4" /> {t("quickActions.recordStake")}</span><ChevronRight className="h-4 w-4" /></button>
              </div>
            </Panel>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title={t("authScope.title")} subtitle={t("authScope.subtitle")}>
            <div className="grid gap-3 md:grid-cols-3">
              <ScopeTile icon={CheckCircle2} label={t("authScope.allowed")} value="availability, task_result, pause_duty, resume_duty" />
              <ScopeTile icon={Lock} label={t("authScope.stakeLimit")} value="Configured per descriptor and root wallet authorization" tone="warning" />
              <ScopeTile icon={Clock3} label={t("authScope.expiration")} value="Session key renewal requires wallet approval" tone="muted" />
            </div>
          </Panel>
          <Panel title={t("events.title")} subtitle={t("events.subtitle")}>
            <div className="divide-y divide-[var(--border)]">
              {events.length ? events.map((event) => <SecurityEvent key={String(event.id)} event={event} />) : (
                <div className="py-4 text-sm text-[var(--text-muted)]">{t("events.empty")}</div>
              )}
            </div>
          </Panel>
        </section>
      </main>

      {addOpen ? <AddAgentDialog onClose={() => setAddOpen(false)} /> : null}
      {receiptOpen ? <StakeReceiptDialog onClose={() => setReceiptOpen(false)} agents={agents} /> : null}

      <style jsx global>{`
        .action-primary { display:inline-flex; align-items:center; gap:.5rem; border-radius:.75rem; background:var(--accent); padding:.75rem 1rem; color:var(--accent-foreground); font-size:.875rem; font-weight:600; }
        .action-secondary { display:inline-flex; align-items:center; gap:.5rem; border-radius:.75rem; border:1px solid var(--border); background:var(--surface-muted); padding:.75rem 1rem; color:var(--text-muted); font-size:.875rem; font-weight:500; }
        .small-button { border-radius:.5rem; border:1px solid var(--border); padding:.45rem .75rem; font-size:.75rem; font-weight:500; color:var(--text-muted); }
        .quick-primary, .quick-secondary { display:flex; align-items:center; justify-content:space-between; border-radius:.75rem; padding:.85rem 1rem; font-size:.875rem; font-weight:600; }
        .quick-primary { background:var(--accent); color:var(--accent-foreground); }
        .quick-secondary { border:1px solid var(--border); color:var(--text-muted); }
        .quick-primary span, .quick-secondary span { display:inline-flex; align-items:center; gap:.5rem; }
      `}</style>
    </div>
  );
}

function localRootIdentityStorageKey(networkId: string, rootAddress: string): string {
  return `${networkId}:${rootAddress}`;
}

function loadLocalRootIdentity(networkId: string, rootAddress: string): Entity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_ROOT_IDENTITY_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const identity = asRecord(parsed[localRootIdentityStorageKey(networkId, rootAddress)]);
    return Object.keys(identity).length ? identity : null;
  } catch {
    return null;
  }
}

function saveLocalRootIdentity(networkId: string, rootAddress: string, identity: Entity): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_ROOT_IDENTITY_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    parsed[localRootIdentityStorageKey(networkId, rootAddress)] = identity;
    window.localStorage.setItem(LOCAL_ROOT_IDENTITY_KEY, JSON.stringify(parsed));
  } catch {
    // Local cache is a UX fallback; coordinator/indexer sync remains authoritative.
  }
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, sub, tone = "default" }: { icon: typeof Shield; label: string; value: string; sub: string; tone?: "default" | "good" | "warning" }) {
  const toneClass = tone === "warning" ? "text-amber-400" : tone === "good" ? "text-[var(--accent)]" : "text-[var(--text)]";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]"><Icon className="h-5 w-5" /></div>
        <ChevronRight className="h-4 w-4 text-[var(--text-subtle)]" />
      </div>
      <div className="text-xs font-normal uppercase tracking-wide text-[var(--text-subtle)]">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold", toneClass)}>{value}</div>
      <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{sub}</div>
    </div>
  );
}

function BalanceLine({ label, value, hint, icon: Icon, unit = "VIB" }: { label: string; value: string; hint: string; icon: typeof Wallet; unit?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--text-muted)]"><Icon className="h-4 w-4" /></div>
        <div><div className="text-sm font-normal text-[var(--text-muted)]">{label}</div><div className="text-xs text-[var(--text-subtle)]">{hint}</div></div>
      </div>
      <div className="text-right"><div className="text-lg font-semibold text-[var(--text)]">{value}</div>{unit ? <div className="text-xs text-[var(--text-subtle)]">{unit}</div> : null}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <div className="text-xs font-normal uppercase tracking-wide text-[var(--text-subtle)]">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="break-all font-mono text-sm text-[var(--text)]">{value}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-subtle)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
          aria-label={`Copy ${label}`}
          title={copied ? "Copied" : "Copy"}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function InfoTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return <div className="rounded-xl bg-[var(--surface-muted)] p-4"><div className="text-xs font-normal uppercase tracking-wide text-[var(--text-subtle)]">{label}</div><div className={cx("mt-2 text-sm font-semibold", tone === "warning" ? "text-amber-400" : "text-[var(--text)]")}>{value}</div></div>;
}

function AgentRow({ agent, onRevoke, busy }: { agent: Entity; onRevoke(keyId: string): void; busy: boolean }) {
  const t = useTranslations("personalCenter");
  const keys = asArray(agent.sessionKeys);
  const activeKey = keys.find((key) => String(key.status ?? "active") === "active") ?? keys[0];
  const stake = asRecord(agent.stakeLedger);
  const capabilities = asStringArray(agent.capabilities);
  const duty = String(agent.dutyStatus ?? "active");
  return (
    <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_0.8fr_0.8fr] items-center gap-4 px-1 py-4 hover:bg-[var(--surface-muted)]/50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)]/40 bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)]">{String(agent.displayName ?? "AG").slice(0, 2).toUpperCase()}</div>
        <div className="min-w-0"><div className="truncate font-semibold text-[var(--text)]">{String(agent.displayName ?? "Agent")}</div><div className="truncate font-mono text-xs text-[var(--text-subtle)]">{String(agent.principalId ?? "")}</div></div>
      </div>
      <div className="font-mono text-xs text-[var(--text-muted)]">{shortAddress(String(activeKey?.publicKey ?? "")) || "none"}</div>
      <div className="flex flex-wrap gap-1.5">{capabilities.slice(0, 2).map((cap) => <CapTag key={cap}>{cap}</CapTag>)}</div>
      <StatusPill tone={duty === "active" ? "good" : "warning"}>{duty}</StatusPill>
      <div className="text-sm text-[var(--text-muted)]"><span className="font-semibold text-[var(--text)]">{String(stake.activeAmount ?? "0")}</span> VIB</div>
      <button type="button" disabled={busy || !activeKey?.id} onClick={() => onRevoke(String(activeKey?.id))} className="justify-self-end rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-normal text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50">{t("agents.revoke")}</button>
    </div>
  );
}

function AlertItem({ alert }: { alert: Entity }) {
  const severity = String(alert.severity ?? "info");
  const Icon = severity === "danger" ? WifiOff : severity === "warning" ? AlertTriangle : Shield;
  const tone = severity === "danger" ? "border-rose-400/20 bg-rose-400/10 text-rose-400" : severity === "warning" ? "border-amber-400/20 bg-amber-400/10 text-amber-400" : "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]";
  return <div className={cx("rounded-xl border p-4", tone)}><div className="flex items-center gap-2 text-sm font-normal"><Icon className="h-4 w-4" />{String(alert.title ?? "Alert")}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{String(alert.detail ?? alert.meta ?? "")}</div></div>;
}

function ScopeTile({ icon: Icon, label, value, tone = "good" }: { icon: typeof CheckCircle2; label: string; value: string; tone?: "good" | "warning" | "muted" }) {
  const color = tone === "warning" ? "text-amber-400" : tone === "muted" ? "text-[var(--text-muted)]" : "text-[var(--accent)]";
  return <div className="rounded-xl bg-[var(--surface-muted)] p-4"><div className={cx("mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-raised)]", color)}><Icon className="h-4 w-4" /></div><div className="text-sm font-semibold text-[var(--text)]">{label}</div><div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{value}</div></div>;
}

function SecurityEvent({ event }: { event: Entity }) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--accent)]"><Key className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3"><div className="truncate text-sm font-semibold text-[var(--text)]">{String(event.title ?? event.type ?? "Security event")}</div><div className="shrink-0 text-xs text-[var(--text-subtle)]">{formatTime(String(event.createdAt ?? ""))}</div></div>
        <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{String(event.meta ?? "")}</div>
      </div>
    </div>
  );
}

function AddAgentDialog({ onClose }: { onClose(): void }) {
  const t = useTranslations("personalCenter");
  return (
    <Modal title={t("addAgentDialog.title")} onClose={onClose}>
      <AddAgentFlow />
    </Modal>
  );
}

function StakeReceiptDialog({ onClose, agents }: { onClose(): void; agents: Entity[] }) {
  const t = useTranslations("personalCenter");
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  const queryClient = useQueryClient();
  const first = agents[0] ?? {};
  const [form, setForm] = useState({
    kind: "bond",
    principalId: String(first.principalId ?? ""),
    identityId: String(first.identityId ?? ""),
    chainAgentId: String(first.chainAgentId ?? ""),
    chainId: String(first.chainId ?? network.id),
    txHash: "",
    amount: "",
  });
  const mutation = useMutation({
    mutationFn: () => client.recordAgentStakeReceipt(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) });
      onClose();
    },
  });
  return (
    <Modal title={t("receiptDialog.title")} onClose={onClose}>
      <div className="grid gap-3">
        {(["kind", "principalId", "identityId", "chainAgentId", "chainId", "txHash", "amount"] as const).map((key) => (
          <label key={key} className="text-sm">
            <span className="mb-1 block capitalize text-[var(--text-muted)]">{key}</span>
            <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--text)]" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <button type="button" className="action-primary justify-center" disabled={mutation.isPending || !form.txHash} onClick={() => mutation.mutate()}>{t("receiptDialog.record")}</button>
        {mutation.error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-400">{mutation.error instanceof Error ? mutation.error.message : t("receiptDialog.failed")}</div> : null}
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const t = useTranslations("personalCenter");
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2><button type="button" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)]" onClick={onClose}>{t("close")}</button></div>
        {children}
      </div>
    </div>
  );
}

function isExpiringSoon(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && time - Date.now() <= 7 * 24 * 60 * 60 * 1000;
}

function formatTime(value: string): string {
  if (!value) return "";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
