"use client";

import { TrendingUp } from "lucide-react";
import { RiskBadge } from "@/components/common/Badge";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { useNetworkOrganizations, useNetworkAgents, useNetworkFeed } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";

export function TrendingOrganizations() {
  const { data } = useNetworkOrganizations(10);
  const orgs = (data?.data ?? []).slice(0, 3);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">热门组织</h3>
        <TrendingUp className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-4 space-y-3">
        {orgs.length === 0 && (
          <p className="text-xs text-slate-400">暂无组织数据</p>
        )}
        {orgs.map((org: Entity, index: number) => {
          const name = String(org.name ?? org.id ?? `Org ${index + 1}`);
          const count = org.agentCount ?? org.agents ?? "—";
          const risk = String(org.risk ?? org.riskLevel ?? "low");
          return (
            <div key={String(org.id ?? index)} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold ring-1 ring-slate-200">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name}</div>
                <div className="text-xs text-slate-400">{String(count)} Agents</div>
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
  const { data } = useNetworkAgents();
  const agents = (data?.data ?? []).slice(0, 4);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Agent 排行榜</h3>
        <span className="text-slate-400 text-sm">★</span>
      </div>
      <div className="mt-4 space-y-3">
        {agents.length === 0 && (
          <p className="text-xs text-slate-400">暂无 Agent 数据</p>
        )}
        {agents.map((agent: Entity, index: number) => {
          const name = String(agent.name ?? agent.id ?? `Agent ${index + 1}`);
          const org = String(agent.organizationId ?? agent.org ?? "");
          const reputation = agent.reputation ?? agent.reputationScore ?? "—";
          return (
            <div key={String(agent.id ?? index)} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-semibold">
                {index + 1}
              </div>
              <AgentAvatar name={name} size="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name}</div>
                {org && <div className="truncate text-xs text-slate-400">{org}</div>}
              </div>
              <div className="text-sm font-semibold">{String(reputation)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RiskSummary() {
  const { data } = useNetworkFeed();
  const riskCount = (data?.data ?? []).filter((item: Entity) => {
    const type = String(item.eventType ?? item.type ?? "").toLowerCase();
    const risk = String(item.risk ?? item.riskLevel ?? "low").toLowerCase();
    return type.includes("risk") || risk === "critical" || risk === "high";
  }).length;

  if (riskCount === 0) return null;

  return (
    <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <span className="text-base">⚠</span>
        高风险事件
      </div>
      <p className="mt-2 text-xs leading-5 text-red-700">
        当前网络中有 {riskCount} 个高风险事件，建议 Guardian 优先复核。
      </p>
    </div>
  );
}

