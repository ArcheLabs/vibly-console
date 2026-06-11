"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { useProject, useProjectOverview, useProjectTimeline } from "@/lib/query/hooks";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import { DetailPageHeader } from "@/components/layout/DetailPageHeader";
import type { Entity } from "@/lib/coordinator/types";
import { timeAgo } from "@/lib/utils/format";

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
  const metadata = project.metadata && typeof project.metadata === "object"
    ? (project.metadata as Record<string, unknown>)
    : {};
  const organizationId = String(project.organizationId ?? metadata.organizationId ?? "");
  const counts = (overview.counts as Entity | undefined) ?? {};
  const mechanisms: Entity[] = Array.isArray(project.mechanisms) ? (project.mechanisms as Entity[]) : [];
  const knowledgeEntries: Entity[] = Array.isArray(overview.knowledgeEntries) ? (overview.knowledgeEntries as Entity[]) : [];

  return (
    <div className="w-full py-6">
      <DetailPageHeader
        breadcrumbs={[
          { label: "Vibly", href: "/" },
          { label: "Projects", href: "/projects" },
          ...(organizationId ? [{ label: organizationId, href: `/organizations/${encodeURIComponent(organizationId)}` }] : []),
          { label: name || projectId },
        ]}
        icon={FolderKanban}
        title={name}
        description={description}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-5">
              <AgentAvatar name={name} tone="org" size="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{name}</h1>
                {description ? <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
                {organizationId ? (
                  <Link
                    href={`/organizations/${encodeURIComponent(organizationId)}`}
                    className="mt-3 inline-flex text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    {organizationId}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <RiskBadge risk={risk} />
            </div>
          </div>
        </section>

        {mechanisms.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[var(--text)]">机制</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {mechanisms.map((m: Entity, idx: number) => (
                <span
                  key={idx}
                  className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] ring-1 ring-[var(--border)]"
                >
                  {String(m.name ?? m.type ?? m.id ?? "")}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--text)]">项目概览</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="目标" value={String(counts.objectives ?? 0)} />
            <StatCard label="运行" value={String(counts.scenarioRuns ?? 0)} />
            <StatCard label="开放任务" value={String(counts.openWorkOrders ?? 0)} />
            <StatCard label="知识" value={String(counts.knowledgeEntries ?? knowledgeEntries.length)} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--text)]">知识库</h2>
          {knowledgeEntries.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="暂无知识条目" body="该项目还没有可展示的知识库更新。" />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {knowledgeEntries.slice(0, 12).map((entry, index) => (
                <article key={String(entry.id ?? index)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text)]">{String(entry.title ?? entry.id ?? "知识条目")}</h3>
                    {Array.isArray(entry.tags) ? (entry.tags as unknown[]).slice(0, 4).map((tag) => (
                      <span key={String(tag)} className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                        #{String(tag)}
                      </span>
                    )) : null}
                  </div>
                  <MarkdownBody value={String(entry.content ?? entry.summary ?? "").slice(0, 1200)} className="mt-2 text-sm text-[var(--text-muted)]" />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--text)]">时间线</h2>
          {timeline.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="暂无时间线" body="该项目还没有可展示的公开时间线事件。" />
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--text-subtle)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">阶段</th>
                    <th className="px-4 py-3 font-semibold">标题</th>
                    <th className="px-4 py-3 font-semibold">状态</th>
                    <th className="px-4 py-3 font-semibold">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {timeline.slice(0, 20).map((item: Entity, index: number) => (
                    <tr key={String(item.id ?? index)} className="transition hover:bg-[var(--surface-muted)]">
                      <td className="px-4 py-3 text-[var(--text-muted)]">{String(item.phase ?? "-")}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text)]">{String(item.title ?? item.id ?? "-")}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{String(item.status ?? "-")}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.timestamp ? timeAgo(item.timestamp) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-xs uppercase text-[var(--text-subtle)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}
