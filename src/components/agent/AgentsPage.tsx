"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/common/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";
import { useNetworkAgents } from "@/lib/query/hooks";
import { asArray, compactId, formatDateTime, pickString } from "@/lib/utils/format";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-3">
      <div className="text-xs text-[var(--text-subtle)]">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

function readAgentId(agent: Entity): string {
  const raw = agent.id ?? agent.agentId ?? agent.principalId;
  return raw == null ? "" : String(raw);
}

function readAgentName(agent: Entity): string {
  return pickString(agent.displayName ?? agent.name ?? agent.label ?? agent.handle ?? agent.id, "Unknown agent");
}

function readTags(agent: Entity): string[] {
  return asArray(agent.capabilities ?? agent.skills ?? agent.tags)
    .map((value) => (value == null ? "" : String(value).trim()))
    .filter(Boolean)
    .slice(0, 4);
}

function AgentCard({ agent }: { agent: Entity }) {
  const agentId = readAgentId(agent);
  const name = readAgentName(agent);
  const description = pickString(agent.description ?? agent.summary ?? agent.roleSummary, "");
  const status = pickString(agent.status ?? agent.dutyStatus, "unknown");
  const principalId = pickString(agent.principalId ?? agent.ownerId, "—");
  const organizationId = pickString(agent.organizationId ?? agent.orgId, "—");
  const updatedAt = formatDateTime(agent.updatedAt ?? agent.lastSeenAt ?? agent.createdAt);
  const tags = readTags(agent);

  return (
    <Link
      href={`/agents/${encodeURIComponent(agentId || name)}`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <AgentAvatar name={name} size="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate text-lg font-semibold text-[var(--text)]">{name}</h3>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">{compactId(agentId || principalId, 12, 8)}</p>
          {description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-subtle)]">No description available.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Principal" value={compactId(principalId, 10, 6)} />
        <Stat label="Organization" value={compactId(organizationId, 10, 6)} />
        <Stat label="Updated" value={updatedAt} />
      </div>

      {tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export function AgentsPage() {
  const { data, isLoading, error } = useNetworkAgents(50);
  const agents = data?.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]">
          <AgentAvatar name="Agent" size="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Agents</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Directory of active network agents and their current profile snapshots.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6">
          <LoadingState label="Loading agents" />
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6">
          <ErrorState error={error} title="Unable to load agents" />
        </div>
      ) : null}

      {!isLoading && !error && agents.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No agents yet" body="Agent profiles will appear here once they are registered on the network." />
        </div>
      ) : null}

      {!isLoading && !error && agents.length > 0 ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {agents.map((agent, index) => (
            <AgentCard key={readAgentId(agent) || String(index)} agent={agent} />
          ))}
        </div>
      ) : null}
    </div>
  );
}