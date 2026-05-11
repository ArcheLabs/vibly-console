"use client";

import { useState } from "react";
import Link from "next/link";
import { useNetworkOrganization, useOrganizationFeed } from "@/lib/query/hooks";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { LoadingState, ErrorState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { NetworkFeed } from "@/components/feed/NetworkFeed";
import type { Entity } from "@/lib/coordinator/types";

const TABS = ["组织动态", "项目列表", "Agent 成员"] as const;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

export function OrganizationPage({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("组织动态");
  const { data: org, isLoading, error } = useNetworkOrganization(orgId);
  const feedQuery = useOrganizationFeed(orgId);

  if (isLoading) return <div className="p-8"><LoadingState label="加载组织信息..." /></div>;
  if (error || !org) return <div className="p-8"><ErrorState error={error ?? new Error("Not found")} title="无法加载组织" /></div>;

  const name = String(org.name ?? org.id ?? "");
  const type = String(org.type ?? org.kind ?? "Project");
  const mission = String(org.mission ?? org.description ?? org.purpose ?? "");
  const agents = String(org.agentCount ?? org.agents ?? "—");
  const projects = String(org.projectCount ?? org.projects ?? "—");
  const tasks = String(org.taskCount ?? org.tasks ?? "—");
  const artifacts = String(org.artifactCount ?? org.artifacts ?? "—");
  const reputation = String(org.reputation ?? org.reputationScore ?? "—");
  const rewardVolume = String(org.rewardVolume ?? org.totalRewards ?? "—");
  const risk = String(org.risk ?? org.riskLevel ?? "low");
  const trend = String(org.trend ?? "");
  const members: Entity[] = Array.isArray(org.members) ? (org.members as Entity[]) : [];
  const projectList: Entity[] = Array.isArray(org.projectList) ? (org.projectList as Entity[]) : [];

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      {/* Header */}
      <div className="flex items-start gap-5">
        <AgentAvatar name={name} tone="org" size="h-16 w-16" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {type}
            </span>
            <RiskBadge risk={risk} />
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{name}</h1>
          {mission && <p className="mt-2 text-sm leading-6 text-slate-500">{mission}</p>}
        </div>
        <div className="shrink-0 text-center">
          {reputation !== "—" && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-3xl font-semibold">{reputation}</div>
              <div className="text-xs text-slate-400">reputation</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <MiniStat label="Agents" value={agents} />
        <MiniStat label="Projects" value={projects} />
        <MiniStat label="Tasks" value={tasks} />
        <MiniStat label="Artifacts" value={artifacts} />
      </div>

      {/* Reward row */}
      {rewardVolume !== "—" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <div>
            <div className="text-xs text-slate-400">Reward Volume</div>
            <div className="mt-1 font-semibold">{rewardVolume}</div>
          </div>
          {trend && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {trend}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex gap-2 border-b border-slate-200 pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-xl px-5 py-3 text-sm font-medium transition ${
              tab === t
                ? "border-b-2 border-slate-950 text-slate-950"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "组织动态" && (
          <NetworkFeed
            data={feedQuery.data}
            isLoading={feedQuery.isLoading}
            error={feedQuery.error}
          />
        )}

        {tab === "项目列表" && (
          <div className="space-y-3">
            {projectList.length === 0 ? (
              <p className="text-sm text-slate-400">暂无项目数据</p>
            ) : (
              projectList.map((p: Entity, idx: number) => (
                <Link
                  key={String(p.id ?? idx)}
                  href={`/projects/${String(p.id ?? "")}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                >
                  <span className="font-medium">{String(p.name ?? p.id ?? "")}</span>
                  <StatusBadge status={p.status} />
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "Agent 成员" && (
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400">暂无成员数据</p>
            ) : (
              members.map((m: Entity, idx: number) => {
                const mName = String(m.name ?? m.agentId ?? m.id ?? "");
                const mRole = String(m.role ?? "Member");
                return (
                  <div key={idx} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <AgentAvatar name={mName} size="h-9 w-9" />
                    <div>
                      <div className="font-medium">{mName}</div>
                      <div className="text-xs text-slate-400">{mRole}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
