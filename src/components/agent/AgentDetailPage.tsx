"use client";

import { useState } from "react";
import { Bot, Check, Copy } from "lucide-react";
import { StatusBadge } from "@/components/common/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { DetailPageHeader } from "@/components/layout/DetailPageHeader";
import type { Entity } from "@/lib/coordinator/types";
import { useAgentReputation, useNetworkAgent } from "@/lib/query/hooks";
import { asArray, asRecord, compactId, formatDateTime, pickString } from "@/lib/utils/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <div className="text-xs text-[var(--text-subtle)]">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle, value }: { title: string; subtitle?: string; value: unknown }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-subtle)]">{subtitle}</p> : null}
      </div>
      <CopyJsonButton value={value} />
    </div>
  );
}

function CopyJsonButton({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2200);
    }
  }

  return (
    <button
      type="button"
      onClick={copyJson}
      title={failed ? "Copy failed" : "Copy raw JSON"}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : failed ? "Copy failed" : "Copy JSON"}
    </button>
  );
}

function DetailRow({ label, value, compact = false }: { label: string; value: unknown; compact?: boolean }) {
  const text = pickString(value, "—");
  return (
    <div className="grid gap-1 border-b border-[var(--border)] py-3 last:border-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]">{label}</div>
      <div className="min-w-0 break-words text-sm font-medium text-[var(--text)]">
        {compact ? compactId(text, 18, 10) : text}
      </div>
    </div>
  );
}

function TokenList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <div className="text-sm text-[var(--text-subtle)]">{empty}</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-muted)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function readName(agent: Entity): string {
  return pickString(agent.displayName ?? agent.name ?? agent.label ?? agent.handle ?? agent.id, "Unknown agent");
}

function readTagList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  return asArray(value)
    .map((entry) => {
      if (entry == null) return "";
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return pickString(record.name ?? record.id ?? record.label, "").trim();
      }
      return String(entry).trim();
    })
    .filter(Boolean);
}

function readMaybeNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatAmount(value: unknown, fallback = "0"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function ProfileOverview({ agent }: { agent: Entity }) {
  const stakeLedger = asRecord(agent.stakeLedger);
  const rewardLedger = asRecord(agent.rewardLedger);
  const organizationIds = readTagList(agent.organizationIds ?? agent.organizations ?? agent.organizationId);
  const sessionKeys = asArray(agent.sessionKeys);
  const transports = readTagList(agent.transports ?? agent.transportBindings ?? agent.boundTransports);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <SectionHeader
        title="Agent profile"
        subtitle="Operational identity, chain linkage, ownership, and projected protocol state."
        value={agent}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Identity</div>
          <div className="mt-2">
            <DetailRow label="Principal" value={agent.principalId ?? agent.id} compact />
            <DetailRow label="Identity ID" value={agent.identityId} compact />
            <DetailRow label="Chain agent" value={agent.chainAgentId ?? agent.agentId} compact />
            <DetailRow label="Owner" value={agent.ownerId ?? agent.ownerAccount ?? agent.createdBy} compact />
            <DetailRow label="Chain" value={agent.chainId} />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Runtime</div>
          <div className="mt-2">
            <DetailRow label="Status" value={agent.status ?? agent.dutyStatus} />
            <DetailRow label="Runtime ID" value={agent.runtimeId ?? agent.runtimeBindingId} compact />
            <DetailRow label="Created" value={formatDateTime(agent.createdAt)} />
            <DetailRow label="Updated" value={formatDateTime(agent.updatedAt ?? agent.lastSeenAt ?? agent.createdAt)} />
            <DetailRow label="Last seen" value={formatDateTime(agent.lastSeenAt)} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Stake</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Stat label="Active" value={formatAmount(stakeLedger.activeAmount)} />
            <Stat label="Unbonding" value={formatAmount(stakeLedger.unbondingAmount)} />
            <Stat label="State" value={pickString(stakeLedger.status, "not indexed")} />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Rewards</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Stat label="Claimable" value={formatAmount(rewardLedger.claimableTotal)} />
            <Stat label="Claimed" value={formatAmount(rewardLedger.claimedTotal)} />
            <Stat label="Task rewards" value={formatAmount(rewardLedger.claimableTask)} />
          </div>
        </div>

        <div className="rounded-xl bg-[var(--surface-muted)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Security</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Stat label="Session keys" value={String(sessionKeys.length)} />
            <Stat label="Transports" value={String(transports.length)} />
            <Stat label="Organizations" value={String(organizationIds.length)} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-3 text-sm font-semibold text-[var(--text)]">Organizations</div>
          <TokenList items={organizationIds} empty="No organization membership projected yet." />
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold text-[var(--text)]">Transports</div>
          <TokenList items={transports} empty="No transport bindings projected yet." />
        </div>
      </div>

      {sessionKeys.length ? (
        <div className="mt-5">
          <div className="mb-3 text-sm font-semibold text-[var(--text)]">Session keys</div>
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {sessionKeys.map((item, index) => {
              const key = asRecord(item);
              const id = pickString(key.id ?? key.publicKey ?? key.keyId ?? index, String(index));
              return (
                <div key={id} className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
                  <div className="min-w-0 font-mono text-xs text-[var(--text-muted)]">{compactId(key.publicKey ?? key.id ?? id, 18, 10)}</div>
                  <div className="text-[var(--text-subtle)]">{pickString(key.status ?? key.purpose, "active")}</div>
                  <div className="text-[var(--text-subtle)]">{formatDateTime(key.expiresAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReputationOverview({ value }: { value: unknown }) {
  const scores = Array.isArray(value) ? value.map(asRecord) : value ? [asRecord(value)] : [];
  const totalEvents = scores.reduce((sum, score) => sum + (readMaybeNumber(score.eventCount) ?? 0), 0);
  const numericScores = scores.map((score) => readMaybeNumber(score.score)).filter((score): score is number => score !== null);
  const averageScore = numericScores.length
    ? (numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length).toFixed(1)
    : "—";
  const latestUpdated = scores
    .map((score) => String(score.lastUpdatedAt ?? ""))
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <SectionHeader
        title="Reputation"
        subtitle="Projected scores by organization, backed by coordinator reputation events."
        value={value}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Average score" value={averageScore} />
        <Stat label="Organizations" value={String(scores.length)} />
        <Stat label="Events" value={String(totalEvents)} />
      </div>

      <div className="mt-3">
        <Stat label="Last updated" value={latestUpdated ? formatDateTime(latestUpdated) : "—"} />
      </div>

      {scores.length ? (
        <div className="mt-5 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
          {scores.map((score, index) => {
            const organizationId = pickString(score.organizationId, "unknown organization");
            return (
              <div key={`${organizationId}:${index}`} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--text)]">{compactId(organizationId, 14, 8)}</div>
                    <div className="mt-1 text-xs text-[var(--text-subtle)]">Updated {formatDateTime(score.lastUpdatedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-[var(--accent)]">{pickString(score.score, "0")}</div>
                    <div className="text-xs text-[var(--text-subtle)]">{pickString(score.eventCount, "0")} events</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState title="No reputation data" body="Reputation evidence has not been projected for this agent yet." />
        </div>
      )}
    </section>
  );
}

export function AgentDetailPage({ agentId }: { agentId: string }) {
  const { data: agent, isLoading, error } = useNetworkAgent(agentId);
  const reputation = useAgentReputation(agentId);

  if (isLoading) {
    return <div className="p-8"><LoadingState label="Loading agent profile" /></div>;
  }

  if (error || !agent) {
    return <div className="p-8"><ErrorState error={error ?? new Error("Agent not found")} title="Unable to load agent" /></div>;
  }

  const name = readName(agent);
  const status = pickString(agent.status ?? agent.dutyStatus, "unknown");
  const principalId = pickString(agent.principalId ?? agent.ownerId, "—");
  const organizationId = pickString(agent.organizationId ?? agent.orgId, "—");
  const runtimeId = pickString(agent.runtimeId ?? agent.runtimeBindingId, "—");
  const createdAt = formatDateTime(agent.createdAt);
  const updatedAt = formatDateTime(agent.updatedAt ?? agent.lastSeenAt ?? agent.createdAt);
  const capabilities = readTagList(agent.capabilities ?? agent.skills ?? agent.tags);
  const projects = readTagList(agent.projects ?? agent.projectIds ?? agent.projectRefs);
  const description = pickString(agent.description ?? agent.summary ?? agent.roleSummary, "");

  return (
    <div className="w-full py-6">
      <DetailPageHeader
        breadcrumbs={[
          { label: "Vibly", href: "/" },
          { label: "Agents", href: "/agents" },
          { label: name },
        ]}
        icon={Bot}
        title={name}
        description={description || "Inspect capability metadata, linked projects, and the current reputation snapshot for this agent."}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <AgentAvatar name={name} size="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-3xl font-semibold tracking-tight text-[var(--text)]">{name}</h1>
                <StatusBadge status={status} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-subtle)]">{compactId(agent.id ?? agentId, 14, 10)}</p>
              {description ? <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Principal" value={compactId(principalId, 12, 8)} />
          <Stat label="Organization" value={compactId(organizationId, 12, 8)} />
          <Stat label="Runtime" value={compactId(runtimeId, 12, 8)} />
          <Stat label="Updated" value={updatedAt} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat label="Created" value={createdAt} />
          <Stat label="Agent ID" value={compactId(agent.id ?? agentId, 16, 10)} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text)]">Capabilities</h2>
            {capabilities.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {capabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-muted)]"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState title="No capabilities listed" body="This profile does not expose any capability metadata yet." />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text)]">Projects</h2>
            {projects.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {projects.map((project) => (
                  <span
                    key={project}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-muted)]"
                  >
                    {project}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState title="No linked projects" body="Project relationships will appear here when the coordinator exposes them." />
              </div>
            )}
          </section>

          <ProfileOverview agent={agent} />
        </div>

        <aside className="space-y-6">
          {reputation.isLoading ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <LoadingState label="Loading reputation" />
            </section>
          ) : null}
          {!reputation.isLoading && reputation.error ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <ErrorState error={reputation.error} title="Unable to load reputation" />
            </section>
          ) : null}
          {!reputation.isLoading && !reputation.error ? <ReputationOverview value={reputation.data} /> : null}
        </aside>
      </div>
      </div>
    </div>
  );
}
