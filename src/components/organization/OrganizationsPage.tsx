"use client";

import Link from "next/link";
import { useState } from "react";
import { useNetworkOrganizations } from "@/lib/query/hooks";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";

const SORTS = ["最活跃", "最多 Agent", "最多任务", "最高声誉"] as const;

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

function OrganizationCard({ org }: { org: Entity }) {
  const id = String(org.id ?? org.projectId ?? "");
  const name = String(org.name ?? org.id ?? "");
  const type = String(org.type ?? org.kind ?? "Project");
  const mission = String(org.mission ?? org.description ?? org.purpose ?? "");
  const agents = org.agentCount ?? org.agents ?? "—";
  const projects = org.projectCount ?? org.projects ?? "—";
  const tasks = org.taskCount ?? org.tasks ?? "—";
  const artifacts = org.artifactCount ?? org.artifacts ?? "—";
  const reputation = org.reputation ?? org.reputationScore ?? "—";
  const risk = String(org.risk ?? org.riskLevel ?? "low");

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {type}
            </span>
            <RiskBadge risk={risk} />
          </div>
          <h3 className="mt-3 text-xl font-semibold">{name}</h3>
          {mission && (
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500 line-clamp-2">{mission}</p>
          )}
        </div>
        {reputation !== "—" && (
          <div className="shrink-0 rounded-2xl bg-slate-50 p-4 text-center">
            <div className="text-2xl font-semibold">{String(reputation)}</div>
            <div className="text-xs text-slate-400">reputation</div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3">
        <MiniStat label="Agents" value={String(agents)} />
        <MiniStat label="Projects" value={String(projects)} />
        <MiniStat label="Tasks" value={String(tasks)} />
        <MiniStat label="Artifacts" value={String(artifacts)} />
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          href={`/organizations/${id}`}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          进入组织主页
        </Link>
        <Link
          href={`/?org=${id}`}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
        >
          公开动态
        </Link>
      </div>
    </article>
  );
}

export function OrganizationsPage() {
  const [sort, setSort] = useState<(typeof SORTS)[number]>("最活跃");
  const { data, isLoading, error } = useNetworkOrganizations(50);
  const orgs = data?.data ?? [];

  return (
    <div className="px-8 py-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
          <AgentAvatar name="Org" tone="org" size="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">组织</h2>
          <p className="mt-1 text-sm text-slate-500">
            发现正在运行的 Agent 组织，观察其使命、成果、声誉与风险状态。
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SORTS.map((item) => (
          <button
            key={item}
            onClick={() => setSort(item)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              sort === item
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6">
          <LoadingState label="加载组织列表..." />
        </div>
      )}
      {!isLoading && error && (
        <div className="mt-6">
          <ErrorState error={error} title="无法加载组织" />
        </div>
      )}
      {!isLoading && !error && orgs.length === 0 && (
        <div className="mt-6">
          <EmptyState title="暂无组织" body="协调器中尚无可显示的组织数据。" />
        </div>
      )}
      {!isLoading && !error && orgs.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-5">
          {orgs.map((org, idx) => (
            <OrganizationCard key={String(org.id ?? idx)} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}
