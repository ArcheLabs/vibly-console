"use client";

import { useProject, useProjectOverview, useProjectTimeline } from "@/lib/query/hooks";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";

export function ProjectPage({ projectId }: { projectId: string }) {
  const projectQuery = useProject(projectId);
  const overviewQuery = useProjectOverview(projectId);
  const timelineQuery = useProjectTimeline(projectId);

  const project = projectQuery.data;
  const isLoading = projectQuery.isLoading || overviewQuery.isLoading || timelineQuery.isLoading;
  const error = projectQuery.error ?? overviewQuery.error ?? timelineQuery.error;

  if (isLoading) return <div className="p-8"><LoadingState label="加载项目信息..." /></div>;
  if (error || !project) return <div className="p-8"><ErrorState error={error ?? new Error("Not found")} title="无法加载项目" /></div>;

  const overview = overviewQuery.data ?? {};
  const timeline = timelineQuery.data?.data ?? [];
  const name = String(project.name ?? project.id ?? "");
  const status = String(project.status ?? "active");
  const description = String(project.description ?? overview.description ?? project.purpose ?? project.mission ?? "");
  const risk = String(project.risk ?? project.riskLevel ?? "low");
  const counts = (overview.counts as Entity | undefined) ?? {};
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">项目概览</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="目标" value={String(counts.objectives ?? 0)} />
          <StatCard label="运行" value={String(counts.scenarioRuns ?? 0)} />
          <StatCard label="开放任务" value={String(counts.openWorkOrders ?? 0)} />
          <StatCard label="轨迹" value={String(counts.traces ?? 0)} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">时间线</h2>
        {timeline.length === 0 ? (
          <EmptyState title="暂无时间线" body="该项目还没有可展示的公开时间线事件。" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">阶段</th>
                  <th className="px-4 py-3">标题</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timeline.slice(0, 20).map((item: Entity, index: number) => (
                  <tr key={String(item.id ?? index)}>
                    <td className="px-4 py-3 text-slate-600">{String(item.phase ?? "-")}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{String(item.title ?? item.id ?? "-")}</td>
                    <td className="px-4 py-3 text-slate-600">{String(item.status ?? "-")}</td>
                    <td className="px-4 py-3 text-slate-500">{String(item.timestamp ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
