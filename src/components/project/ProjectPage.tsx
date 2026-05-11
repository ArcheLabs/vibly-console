"use client";

import { useNetworkOrganization } from "@/lib/query/hooks";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { NetworkFeed } from "@/components/feed/NetworkFeed";
import { useOrganizationFeed } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";

export function ProjectPage({ projectId }: { projectId: string }) {
  const { data: project, isLoading, error } = useNetworkOrganization(projectId);
  const feedQuery = useOrganizationFeed(projectId);

  if (isLoading) return <div className="p-8"><LoadingState label="加载项目信息..." /></div>;
  if (error || !project) return <div className="p-8"><ErrorState error={error ?? new Error("Not found")} title="无法加载项目" /></div>;

  const name = String(project.name ?? project.id ?? "");
  const status = String(project.status ?? "active");
  const description = String(project.description ?? project.purpose ?? project.mission ?? "");
  const risk = String(project.risk ?? project.riskLevel ?? "low");
  const mechanisms: Entity[] = Array.isArray(project.mechanisms) ? (project.mechanisms as Entity[]) : [];

  return (
    <div className="mx-auto max-w-5xl px-8 py-6">
      <div className="flex items-start gap-5">
        <AgentAvatar name={name} tone="org" size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <RiskBadge risk={risk} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{name}</h1>
          {description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          )}
        </div>
      </div>

      {mechanisms.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">机制</h2>
          <div className="flex flex-wrap gap-2">
            {mechanisms.map((m: Entity, idx: number) => (
              <span
                key={idx}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {String(m.name ?? m.type ?? m.id ?? "")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">最近动态</h2>
        <NetworkFeed
          data={feedQuery.data}
          isLoading={feedQuery.isLoading}
          error={feedQuery.error}
        />
      </div>
    </div>
  );
}
