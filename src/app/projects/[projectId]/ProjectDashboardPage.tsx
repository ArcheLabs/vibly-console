"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/common/Badge";
import { EntityCard, PageHeader, StatCard } from "@/components/common/EntityViews";
import { ErrorState, LoadingState } from "@/components/common/States";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { useProjectLiveEvents } from "@/lib/query/useProjectLiveEvents";
import { asArray, asRecord, formatDateTime, pickString, timeAgo } from "@/lib/utils/format";

export function ProjectDashboardPage({ projectId }: { projectId: string }) {
  const client = useCoordinatorClient();
  const live = useProjectLiveEvents(projectId, { limit: 10 });
  const project = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => client.getProject(projectId),
  });
  const overview = useQuery({
    queryKey: queryKeys.projectOverview(projectId),
    queryFn: () => client.getProjectOverview(projectId),
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
      <HumanObservableOverview projectId={projectId} overview={overview.data ? asRecord(overview.data) : null} liveStatus={live.status} liveEvents={live.events} />
      <PhaseHOverview projectId={projectId} overview={overview.data ? asRecord(overview.data) : null} />
      <div className="grid gap-4 xl:grid-cols-2">
        <EntityCard title="Latest StateView" item={state.data ? asRecord(state.data) : null} />
        <EntityCard title="Latest KnowledgeVersion" item={knowledge.data ? asRecord(knowledge.data) : null} />
      </div>
    </AppShell>
  );
}

function PhaseHOverview({ projectId, overview }: { projectId: string; overview: Record<string, unknown> | null }) {
  const counts = asRecord(overview?.counts);
  const ledger = asRecord(overview?.ledger);
  const byStatus = asRecord(ledger.byStatus);
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-950">Phase H incentive / risk loop</h2>
      <p className="mt-2 text-sm text-amber-900">Mock ledger path for rewards, reputation evidence, slash requests, and Guardian-visible risk. Chain settlement remains out of this phase.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Phase H runs" value={String(counts.phaseHRuns ?? "-")} href={`/projects/${projectId}/phase-h`} />
        <StatCard label="Reward intents" value={String(counts.rewardIntents ?? "-")} href={`/projects/${projectId}/rewards`} />
        <StatCard label="Claimable" value={String(counts.claimableRewards ?? byStatus.claimable ?? "-")} href={`/projects/${projectId}/rewards`} />
        <StatCard label="Reputation evidence" value={String(counts.reputationEvidence ?? "-")} href={`/projects/${projectId}/reputation`} />
        <StatCard label="Slash requests" value={String(counts.slashRequests ?? "-")} href={`/projects/${projectId}/guardian`} />
        <StatCard label="Guardian risk" value={String(counts.guardianRequests ?? "-")} href={`/projects/${projectId}/guardian`} />
      </div>
    </div>
  );
}

function HumanObservableOverview({ projectId, overview, liveStatus, liveEvents }: { projectId: string; overview: Record<string, unknown> | null; liveStatus: string; liveEvents: unknown[] }) {
  const counts = asRecord(overview?.counts);
  const latestRun = asRecord(overview?.latestRun);
  const timeline = asArray(latestRun.timeline).map(asRecord);
  const latestTimeline = timeline.at(-1);
  const latestLive = asRecord(liveEvents[0]);
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="rounded border border-teal-200 bg-teal-50 p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-teal-950">Human-observable status</h2>
          <StatusBadge status={liveStatus} />
        </div>
        <p className="mt-2 text-sm text-teal-900">
          Console is following coordinator read models and project SSE events. It does not call chain RPC or Concord SDK directly.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <StatCard label="Phase F runs" value={String(counts.phaseFRuns ?? "-")} href={`/projects/${projectId}/phase-f`} />
          <StatCard label="Guardian requests" value={String(counts.guardianRequests ?? "-")} href={`/projects/${projectId}/guardian`} />
          <StatCard label="Timeline events" value={String(counts.timelineEvents ?? "-")} href={`/projects/${projectId}/timeline`} />
          <StatCard label="Recent live events" value={String(liveEvents.length)} href={`/projects/${projectId}/events`} />
        </div>
      </div>
      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-950">Latest activity</h2>
        <p className="mt-2 text-sm text-slate-700">
          {latestTimeline ? String(latestTimeline.title ?? latestTimeline.eventType) : latestLive.type ? `Live event: ${String(latestLive.type)}` : "No Phase G timeline events yet."}
        </p>
        {latestTimeline?.reason ? <p className="mt-2 text-sm text-slate-500">{String(latestTimeline.reason)}</p> : null}
        <p className="mt-3 text-xs text-slate-500">{formatDateTime(latestTimeline?.timestamp ?? latestLive.timestamp)}</p>
      </div>
    </div>
  );
}
