"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/common/Badge";
import { EntityCard, PageHeader, StatCard } from "@/components/common/EntityViews";
import { ErrorState, LoadingState } from "@/components/common/States";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { asRecord, pickString, timeAgo } from "@/lib/utils/format";

export function ProjectDashboardPage({ projectId }: { projectId: string }) {
  const client = useCoordinatorClient();
  const project = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => client.getProject(projectId),
  });
  const [objectives, state, knowledge, actions, work, negotiations, reviews, rewards, events, traces] = useQueries({
    queries: [
      { queryKey: queryKeys.objectives(projectId), queryFn: () => client.listObjectives(projectId, { limit: 100 }) },
      { queryKey: queryKeys.state(projectId), queryFn: () => client.getLatestState(projectId) },
      { queryKey: queryKeys.knowledge(projectId), queryFn: () => client.getLatestKnowledge(projectId) },
      { queryKey: queryKeys.section(projectId, "actions"), queryFn: () => client.listActions(projectId, { limit: 100 }) },
      { queryKey: queryKeys.section(projectId, "work"), queryFn: () => client.listWorkOrders(projectId, { limit: 100 }) },
      { queryKey: queryKeys.section(projectId, "negotiations"), queryFn: () => client.listNegotiations({ limit: 100 }) },
      { queryKey: queryKeys.section(projectId, "reviews"), queryFn: () => client.listReviews({ limit: 100 }) },
      { queryKey: queryKeys.section(projectId, "rewards"), queryFn: () => client.listRewards(projectId, { limit: 100 }) },
      { queryKey: queryKeys.events(projectId), queryFn: () => client.listEvents({ limit: 20 }) },
      { queryKey: queryKeys.traces, queryFn: () => client.listTraces({ limit: 100 }) },
    ],
  });

  const item = project.data ? asRecord(project.data) : undefined;
  const projectName = pickString(item?.name ?? item?.slug ?? projectId);

  return (
    <AppShell projectId={projectId} projectName={projectName}>
      <PageHeader
        title={projectName}
        eyebrow="Project dashboard"
        actions={
          <Link className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50" href={`/projects/${projectId}/events`}>
            Open event stream
          </Link>
        }
      />
      {project.isLoading ? <LoadingState label="Loading project" /> : null}
      {project.error ? <ErrorState error={project.error} title="Could not load project" /> : null}
      {item ? (
        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">{pickString(item.description, "No description")}</p>
              <p className="mt-2 text-xs text-slate-500">Updated {timeAgo(item.updatedAt ?? item.createdAt)}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active objectives" value={objectives.data?.data.length ?? "-"} href={`/projects/${projectId}/objectives`} />
        <StatCard label="Open actions" value={actions.data?.data.length ?? "-"} href={`/projects/${projectId}/actions`} />
        <StatCard label="Open work orders" value={work.data?.data.length ?? "-"} href={`/projects/${projectId}/work`} />
        <StatCard label="Reward intents" value={rewards.data?.data.length ?? "-"} href={`/projects/${projectId}/rewards`} />
        <StatCard label="Negotiations" value={negotiations.data?.data.length ?? "-"} href={`/projects/${projectId}/negotiations`} />
        <StatCard label="Reviews" value={reviews.data?.data.length ?? "-"} href={`/projects/${projectId}/reviews`} />
        <StatCard label="Recent events" value={events.data?.data.length ?? "-"} href={`/projects/${projectId}/events`} />
        <StatCard label="Protocol traces" value={traces.data?.data.length ?? "-"} href={`/projects/${projectId}/traces`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <EntityCard title="Latest StateView" item={state.data ? asRecord(state.data) : null} />
        <EntityCard title="Latest KnowledgeVersion" item={knowledge.data ? asRecord(knowledge.data) : null} />
      </div>
    </AppShell>
  );
}
