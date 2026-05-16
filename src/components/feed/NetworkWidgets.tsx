"use client";

import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { RiskBadge } from "@/components/common/Badge";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { useNetworkOrganizations, useNetworkAgents, useNetworkFeed } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";

export function TrendingOrganizations() {
  const t = useTranslations("feed");
  const { data } = useNetworkOrganizations(10);
  const orgs = (data?.data ?? []).slice(0, 3);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text)]">{t("trendingOrganizations")}</h3>
        <TrendingUp className="h-4 w-4 text-[var(--text-subtle)]" />
      </div>
      <div className="mt-4 space-y-3">
        {orgs.length === 0 && (
          <p className="text-xs text-[var(--text-subtle)]">{t("emptyOrganizations")}</p>
        )}
        {orgs.map((org: Entity, index: number) => {
          const name = String(org.name ?? org.id ?? `Org ${index + 1}`);
          const count = org.agentCount ?? org.agents ?? "—";
          const risk = String(org.risk ?? org.riskLevel ?? "low");
          return (
            <div key={String(org.id ?? index)} className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-[var(--text)] ring-1 ring-[var(--border)]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text)]">{name}</div>
                <div className="text-xs text-[var(--text-subtle)]">{String(count)} Agents</div>
              </div>
              <RiskBadge risk={risk} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentLeaderboard() {
  const t = useTranslations("feed");
  const { data } = useNetworkAgents();
  const agents = (data?.data ?? []).slice(0, 4);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text)]">{t("agentLeaderboard")}</h3>
        <span className="text-sm text-[var(--text-subtle)]">★</span>
      </div>
      <div className="mt-4 space-y-3">
        {agents.length === 0 && (
          <p className="text-xs text-[var(--text-subtle)]">{t("emptyAgents")}</p>
        )}
        {agents.map((agent: Entity, index: number) => {
          const name = String(agent.displayName ?? agent.name ?? agent.principalId ?? agent.id ?? `Agent ${index + 1}`);
          const orgIds = Array.isArray(agent.organizationIds) ? agent.organizationIds : [];
          const org = String(agent.organizationId ?? agent.org ?? orgIds[0] ?? "");
          const reputation = agent.reputation ?? agent.reputationScore ?? "—";
          return (
            <div key={String(agent.id ?? index)} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text)]">
                {index + 1}
              </div>
              <AgentAvatar name={name} size="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text)]">{name}</div>
                {org && <div className="truncate text-xs text-[var(--text-subtle)]">{org}</div>}
              </div>
              <div className="text-sm font-semibold text-[var(--text)]">{String(reputation)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RiskSummary() {
  const t = useTranslations("feed");
  const { data } = useNetworkFeed();
  const riskCount = (data?.data ?? []).filter((item: Entity) => {
    const type = String(item.eventType ?? item.type ?? "").toLowerCase();
    const risk = String(item.risk ?? item.riskLevel ?? "low").toLowerCase();
    return type.includes("risk") || risk === "critical" || risk === "high";
  }).length;

  if (riskCount === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-surface)] p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--danger)]">
        <span className="text-base">⚠</span>
        {t("highRiskEvents")}
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--danger)]">{t("highRiskBody", { count: riskCount })}</p>
    </div>
  );
}
