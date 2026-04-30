"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Radio, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/common/DataTable";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { CopyButton } from "@/components/common/CopyButton";
import { EntityCard, PageHeader } from "@/components/common/EntityViews";
import { JsonViewer } from "@/components/common/JsonViewer";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { invalidateForEvent } from "@/lib/query/eventInvalidation";
import { queryKeys } from "@/lib/query/keys";
import type { Entity, EventEnvelope, Page } from "@/lib/coordinator/types";
import { asArray, asRecord, compactId, formatDateTime, pickString, readableKey } from "@/lib/utils/format";
import { appConfig } from "@/lib/config/env";

type SectionResult = Page<Entity> | { data: Entity[]; page: Page<Entity>["page"]; note?: string };

const sectionTitles: Record<string, string> = {
  objectives: "Objectives",
  boundary: "Boundary",
  agents: "Principals, Agents & Runtime Bindings",
  state: "State",
  knowledge: "Knowledge",
  inputs: "External Inputs",
  observations: "Observations",
  assignments: "Assignments & Leases",
  actions: "Actions",
  negotiations: "Negotiations",
  work: "Work Orders",
  reviews: "Reviews",
  rewards: "Rewards & Mock Ledger",
  reputation: "Reputation Evidence",
  governance: "Governance & Human Requests",
  guardian: "Guardian",
  traces: "Protocol Traces",
  events: "Events",
  settings: "Settings",
};

export function ProjectSectionPage({ projectId, section }: { projectId: string; section: string }) {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const project = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => client.getProject(projectId),
  });
  const sectionQuery = useQuery({
    queryKey: queryKeys.section(projectId, section),
    queryFn: () => loadSection(client, projectId, section),
    enabled: section !== "settings",
  });
  const item = project.data ? asRecord(project.data) : undefined;
  const projectName = pickString(item?.name ?? item?.slug ?? projectId);

  return (
    <AppShell projectId={projectId} projectName={projectName}>
      <PageHeader title={sectionTitles[section] ?? readableKey(section)} eyebrow={projectName} actions={<SectionActions projectId={projectId} section={section} />} />
      {section === "settings" ? <SettingsPanel projectId={projectId} /> : null}
      {section === "events" ? <EventStreamPanel projectId={projectId} /> : null}
      {section === "guardian" ? <GuardianPanel projectId={projectId} /> : null}
      {sectionQuery.isLoading ? <LoadingState label={`Loading ${sectionTitles[section] ?? section}`} /> : null}
      {sectionQuery.error ? <ErrorState error={sectionQuery.error} title={`Could not load ${sectionTitles[section] ?? section}`} /> : null}
      {sectionQuery.data ? <SectionContent projectId={projectId} section={section} result={sectionQuery.data} /> : null}
      <DangerZone
        projectId={projectId}
        section={section}
        onDone={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.section(projectId, section) });
        }}
      />
    </AppShell>
  );
}

async function loadSection(client: ReturnType<typeof useCoordinatorClient>, projectId: string, section: string): Promise<SectionResult> {
  switch (section) {
    case "objectives":
      return client.listObjectives(projectId, { limit: 100 });
    case "boundary": {
      const boundary = await client.getBoundary(projectId);
      return { data: boundary ? [boundary] : [], page: { limit: 1, nextCursor: null } };
    }
    case "agents": {
      const [principals, agents] = await Promise.all([client.listPrincipals({ limit: 100 }), client.listAgents({ limit: 100 })]);
      return {
        data: [
          ...principals.data.map((principal) => ({ ...principal, consoleKind: "principal" })),
          ...agents.data.map((agent) => ({ ...agent, consoleKind: "agent" })),
        ],
        page: { limit: principals.data.length + agents.data.length, nextCursor: null },
      };
    }
    case "state": {
      const state = await client.getLatestState(projectId);
      return { data: state ? [state] : [], page: { limit: 1, nextCursor: null } };
    }
    case "knowledge": {
      const [latest, versions, candidates] = await Promise.all([
        client.getLatestKnowledge(projectId),
        client.listKnowledgeVersions({ limit: 100 }),
        client.listKnowledgeCandidates({ limit: 100 }),
      ]);
      return {
        data: [...(latest ? [{ ...latest, consoleKind: "latest" }] : []), ...versions.data, ...candidates.data.map((candidate) => ({ ...candidate, consoleKind: "candidate" }))],
        page: { limit: versions.data.length + candidates.data.length + 1, nextCursor: null },
      };
    }
    case "inputs":
      return { ...(await client.listExternalInputs(projectId)), note: "External input API is not exposed by this coordinator; this view derives rows from events when available." };
    case "observations":
      return client.listObservations(projectId, { limit: 100 });
    case "assignments": {
      const [assignments, leases] = await Promise.all([client.listAssignments(projectId, { limit: 100 }), client.listLeases(projectId)]);
      return { data: [...assignments.data, ...leases.data.map((lease) => ({ ...lease, consoleKind: "lease" }))], page: { limit: assignments.data.length + leases.data.length, nextCursor: null } };
    }
    case "actions":
      return client.listActions(projectId, { limit: 100 });
    case "negotiations":
      return client.listNegotiations({ limit: 100 });
    case "work":
      return client.listWorkOrders(projectId, { limit: 100 });
    case "reviews":
      return client.listReviews({ limit: 100 });
    case "rewards": {
      const [rewards, ledger] = await Promise.all([client.listRewards(projectId, { limit: 100 }), client.getLedger()]);
      return { data: [...rewards.data, { ...ledger, id: "mock-ledger", consoleKind: "ledger" }], page: { limit: rewards.data.length + 1, nextCursor: null } };
    }
    case "reputation":
      return { ...(await client.listReputationEvidence(projectId)), note: "This is evidence only. Console does not calculate a final protocol reputation score." };
    case "governance": {
      const [merged, requests, backends] = await Promise.all([
        client.listGovernanceMerged(projectId, { limit: 100 }),
        client.listHumanRequests(projectId),
        client.listGovernanceBackends(),
      ]);
      const backendByKind = new Map(backends.data.map((backend) => [String(backend.backend ?? ""), backend]));
      // Normalize merged views into a flat shape for the generic table
      const mergedRows = merged.data.map((item) => {
        const rec = asRecord(item);
        const status = asRecord(rec.status ?? {});
        const freshness = asRecord(rec.freshness ?? {});
        const readback = asRecord(rec.readback ?? {});
        const subject = asRecord(rec.subject ?? {});
        const backend = String(subject.backend ?? "");
        const descriptor = backendByKind.get(backend);
        const backendHealth = asRecord(descriptor?.health ?? {});
        const rowStale = Boolean(freshness.stale || backendHealth.stale);
        return {
          ...item,
          consoleKind: "governance_merged",
          // Hoist commonly-displayed fields to top-level for generic columns
          title: pickString(asRecord(rec.intent ?? {}).title ?? subject.title ?? "Untitled"),
          status: String(status.merged ?? "unknown"),
          chainStatus: String(status.chain ?? ""),
          coordinationStatus: String(status.coordination ?? ""),
          backend,
          capabilitySummary: summarizeGovernanceCapabilities(descriptor),
          actionStatus: describeGovernanceActionStatus(descriptor),
          freshnessStatus: describeGovernanceFreshness(descriptor, rowStale),
          readbackStatus: describeGovernanceReadback(readback),
          submitTxHash: String(readback.submitTxHash ?? ""),
          voteReadbackStatus: String(readback.voteReadbackStatus ?? ""),
          stale: rowStale,
        };
      });
      const backendNote = summarizeGovernanceBackends(backends.data);
      const staleNote = mergedRows.some((r) => r.stale)
        ? "Some governance views are stale: the chain indexer checkpoint is older than 60s. Restart the indexer if data is outdated."
        : undefined;
      return {
        data: [...mergedRows, ...requests.data.map((request) => ({ ...request, consoleKind: "human_request" }))],
        page: { limit: mergedRows.length + requests.data.length, nextCursor: null },
        note: [staleNote, backendNote].filter(Boolean).join(" "),
      };
    }
    case "guardian":
      return { ...(await client.listHumanRequests(projectId)), note: "Guardian decision API is not available in the current coordinator. Requests can be inspected here." };
    case "traces":
      return client.listTraces({ limit: 100 });
    case "events":
      return client.listEvents({ limit: 100 });
    default:
      return { data: [], page: { limit: 0, nextCursor: null } };
  }
}

function SectionContent({ projectId, section, result }: { projectId: string; section: string; result: SectionResult }) {
  const data = result.data.map((item, index) => ({ ...item, _rowId: String(item.id ?? item.traceId ?? index) }));
  const first = data[0];
  const columns = useMemo(() => makeColumns(projectId, section), [projectId, section]);
  return (
    <div className="space-y-5">
      {"note" in result && result.note ? <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{result.note}</div> : null}
      <DataTable data={data} columns={columns} empty={`No ${sectionTitles[section] ?? section} found.`} />
      {first ? <EntityCard title="Selected Detail" item={first} /> : null}
      {section === "boundary" ? <BoundaryEvaluateForm projectId={projectId} /> : null}
      {section === "negotiations" ? <SubmitPositionForm projectId={projectId} data={data} /> : null}
      {section === "reviews" ? <SubmitReviewForm /> : null}
      {section === "traces" ? <CreateTraceForm projectId={projectId} /> : null}
    </div>
  );
}

function makeColumns(projectId: string, section: string): ColumnDef<Entity>[] {
  return [
    {
      header: "ID",
      accessorFn: (row) => String(row.id ?? row.traceId ?? row._rowId ?? "unknown"),
      cell: ({ getValue }) => {
        const value = String(getValue());
        const href = section === "traces" ? `/projects/${projectId}/traces/${value}` : undefined;
        const label = compactId(value);
        return (
          <div className="flex items-center gap-2">
            {href ? <Link className="font-medium text-teal-800 hover:underline" href={href}>{label}</Link> : <span>{label}</span>}
            <CopyButton value={value} label="" />
          </div>
        );
      },
    },
    {
      header: "Kind",
      accessorFn: (row) => String(row.consoleKind ?? row.kind ?? row.type ?? row.protocolId ?? "record"),
    },
    {
      header: "Title",
      accessorFn: (row) => String(row.title ?? row.name ?? row.displayName ?? row.topic ?? row.summary ?? row.description ?? "untitled"),
    },
    {
      header: "Status",
      accessorFn: (row) => String(row.status ?? "unknown"),
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    ...(section === "governance"
      ? [
          {
            header: "Backend",
            accessorFn: (row: Entity) => String(row.backend ?? ""),
            cell: ({ getValue }: { getValue: () => unknown }) => {
              const v = String(getValue());
              if (!v) return null;
              return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">{v}</span>;
            },
          } satisfies ColumnDef<Entity>,
          {
            header: "Capabilities",
            accessorFn: (row: Entity) => String(row.capabilitySummary ?? ""),
          } satisfies ColumnDef<Entity>,
          {
            header: "Actions",
            accessorFn: (row: Entity) => String(row.actionStatus ?? ""),
          } satisfies ColumnDef<Entity>,
          {
            header: "Freshness",
            accessorFn: (row: Entity) => String(row.freshnessStatus ?? ""),
          } satisfies ColumnDef<Entity>,
          {
            header: "Readback",
            accessorFn: (row: Entity) => String(row.readbackStatus ?? ""),
          } satisfies ColumnDef<Entity>,
        ]
      : []),
    {
      header: "Risk",
      accessorFn: (row) => String(row.riskLevel ?? row.risk ?? "unknown"),
      cell: ({ getValue }) => <RiskBadge risk={getValue()} />,
    },
    {
      header: "Created",
      accessorFn: (row) => String(row.createdAt ?? row.timestamp ?? row.updatedAt ?? ""),
      cell: ({ getValue }) => formatDateTime(getValue()),
    },
  ];
}

function summarizeGovernanceCapabilities(descriptor?: Entity): string {
  const capabilities = asRecord(descriptor?.capabilities ?? {});
  const readable = [
    capabilities.readSubjects ? "subjects" : undefined,
    capabilities.readVotes ? "votes" : undefined,
    capabilities.checkpoint ? "checkpoint" : undefined,
  ].filter(Boolean);
  return readable.length > 0 ? `Reads ${readable.join(", ")}` : "";
}

function describeGovernanceActionStatus(descriptor?: Entity): string {
  if (!descriptor) return "";
  const capabilities = asRecord(descriptor.capabilities ?? {});
  const hasWriteAction = Boolean(
    capabilities.prepareProposal ||
      capabilities.submitProposal ||
      capabilities.castVote ||
      capabilities.delegate ||
      capabilities.queueExecution ||
      capabilities.executeProposal,
  );
  if (!hasWriteAction) return "Read-only";
  if (capabilities.requiresWallet) return "Wallet action placeholder";
  return "Coordinator action available";
}

function describeGovernanceFreshness(descriptor: Entity | undefined, rowStale: boolean): string {
  const health = asRecord(descriptor?.health ?? {});
  const status = String(health.status ?? (rowStale ? "stale" : "unknown"));
  if (status === "healthy") return "Fresh";
  if (status === "stale") return `Stale${health.reason ? ` (${String(health.reason)})` : ""}`;
  if (status === "unavailable") return `Unavailable${health.reason ? ` (${String(health.reason)})` : ""}`;
  return rowStale ? "Stale" : "";
}

function describeGovernanceReadback(readback: Record<string, unknown>): string {
  if (readback.linked) {
    const votes = readback.voteReadbackStatus ? `, votes ${String(readback.voteReadbackStatus)}` : "";
    return `Linked${votes}`;
  }
  if (readback.pending) return "Pending indexer readback";
  const status = readback.voteReadbackStatus ? `votes ${String(readback.voteReadbackStatus)}` : "";
  return status || "Not submitted";
}

function summarizeGovernanceBackends(backends: Entity[]): string | undefined {
  if (backends.length === 0) return undefined;
  const summaries = backends.map((backend) => {
    const label = String(backend.displayName ?? backend.id ?? backend.backend ?? "unknown backend");
    const actionStatus = describeGovernanceActionStatus(backend);
    const freshness = describeGovernanceFreshness(backend, false);
    return [label, actionStatus, freshness].filter(Boolean).join(": ");
  });
  return `Governance backends: ${summaries.join("; ")}.`;
}

function SectionActions({ projectId, section }: { projectId: string; section: string }) {
  if (section !== "traces" && section !== "events") return null;
  return (
    <Link className="rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50" href={`/projects/${projectId}/${section}`}>
      Refresh {section}
    </Link>
  );
}

function BoundaryEvaluateForm({ projectId }: { projectId: string }) {
  const client = useCoordinatorClient();
  const [actionType, setActionType] = useState("publish");
  const [result, setResult] = useState<Entity | null>(null);
  const mutation = useMutation({
    mutationFn: () => client.evaluateBoundary(projectId, { actionType }),
    onSuccess: setResult,
  });
  return (
    <form
      className="space-y-3 rounded border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="font-semibold text-slate-950">Test Boundary Evaluation</h2>
      <div className="flex flex-wrap gap-2">
        <input className="min-w-64 rounded border border-slate-300 px-3 py-2" value={actionType} onChange={(event) => setActionType(event.target.value)} />
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="submit">Evaluate</button>
      </div>
      {mutation.error ? <ErrorState error={mutation.error} /> : null}
      {result ? <JsonViewer value={result} title="Boundary evaluation result" /> : null}
    </form>
  );
}

function SubmitPositionForm({ data }: { projectId: string; data: Entity[] }) {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const [negotiationId, setNegotiationId] = useState(String(data[0]?.id ?? ""));
  const [actorId, setActorId] = useState("");
  const [stance, setStance] = useState("support");
  const [rationale, setRationale] = useState("");
  const mutation = useMutation({
    mutationFn: () => client.submitPosition(negotiationId, { actorId, stance, rationale }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return (
    <form
      className="space-y-3 rounded border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="font-semibold text-slate-950">Submit Position / Vote</h2>
      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded border border-slate-300 px-3 py-2" value={negotiationId} onChange={(event) => setNegotiationId(event.target.value)} placeholder="negotiation id" />
        <input className="rounded border border-slate-300 px-3 py-2" value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="actor id" />
        <select className="rounded border border-slate-300 px-3 py-2" value={stance} onChange={(event) => setStance(event.target.value)}>
          {["support", "oppose", "abstain", "revise", "escalate"].map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="submit">Submit</button>
      </div>
      <textarea className="min-h-24 w-full rounded border border-slate-300 px-3 py-2" value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="rationale" />
      {mutation.error ? <ErrorState error={mutation.error} /> : null}
    </form>
  );
}

function SubmitReviewForm() {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState('{"kind":"submission","submissionId":""}');
  const [reviewerId, setReviewerId] = useState("");
  const [contextBundleId, setContextBundleId] = useState("");
  const [result, setResult] = useState("accept");
  const [rationale, setRationale] = useState("");
  const mutation = useMutation({
    mutationFn: () => client.submitReview({ target: JSON.parse(target), reviewerId, contextBundleId, result, rationale }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return (
    <form
      className="space-y-3 rounded border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="font-semibold text-slate-950">Submit Human Review</h2>
      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded border border-slate-300 px-3 py-2" value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} placeholder="reviewer id" />
        <input className="rounded border border-slate-300 px-3 py-2" value={contextBundleId} onChange={(event) => setContextBundleId(event.target.value)} placeholder="context bundle id" />
        <select className="rounded border border-slate-300 px-3 py-2" value={result} onChange={(event) => setResult(event.target.value)}>
          {["accept", "reject", "needs_revision", "escalate"].map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="submit">Submit</button>
      </div>
      <textarea className="min-h-20 w-full rounded border border-slate-300 px-3 py-2" value={target} onChange={(event) => setTarget(event.target.value)} />
      <textarea className="min-h-24 w-full rounded border border-slate-300 px-3 py-2" value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="rationale" />
      {mutation.error ? <ErrorState error={mutation.error} /> : null}
    </form>
  );
}

function CreateTraceForm({ projectId }: { projectId: string }) {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => client.createTrace(projectId, { name: `console-${Date.now()}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.traces }),
  });
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <ConfirmButton confirm="Create a trace from the current event log?" onConfirm={() => mutation.mutate()}>
        Create Trace
      </ConfirmButton>
      {mutation.error ? <div className="mt-3"><ErrorState error={mutation.error} /></div> : null}
    </div>
  );
}

function DangerZone({ projectId, section, onDone }: { projectId: string; section: string; onDone: () => void }) {
  const client = useCoordinatorClient();
  const [actorId, setActorId] = useState("");
  const mutation = useMutation({
    mutationFn: async (action: string) => {
      if (action === "sweep") return client.sweepLeases();
      if (action === "claim") throw new Error("Select a specific reward row and use the reward API from a detail workflow.");
      if (action === "guardian") return client.submitGuardianDecision({ projectId, guardianActorId: actorId });
      return {};
    },
    onSuccess: onDone,
  });
  if (!appConfig.devToolsEnabled && section !== "guardian") return null;
  if (!["assignments", "guardian"].includes(section)) return null;
  return (
    <div className="rounded border border-red-200 bg-white p-4">
      <h2 className="font-semibold text-red-900">Dangerous Operations</h2>
      <p className="mt-1 text-sm text-slate-600">Every high-risk operation requires explicit confirmation and Coordinator support.</p>
      {section === "guardian" ? (
        <input className="mt-3 rounded border border-slate-300 px-3 py-2" value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="guardian actor id" />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {section === "assignments" ? <ConfirmButton confirm="Sweep expired leases? Dev routes must be enabled on coordinator." onConfirm={() => mutation.mutate("sweep")} variant="danger">Sweep Expired Leases</ConfirmButton> : null}
        {section === "guardian" ? <ConfirmButton confirm="Submit guardian decision placeholder? This will fail unless coordinator supports it." onConfirm={() => mutation.mutate("guardian")} variant="danger">Submit Guardian Decision</ConfirmButton> : null}
      </div>
      {mutation.error ? <div className="mt-3"><ErrorState error={mutation.error} /></div> : null}
    </div>
  );
}

function EventStreamPanel({ projectId }: { projectId: string }) {
  const client = useCoordinatorClient();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  useEffect(() => {
    if (!enabled) return;
    return client.streamProjectEvents(projectId, {
      onStatus: setStatus,
      onEvent: (event) => {
        setEvents((current) => [event, ...current].slice(0, 20));
        invalidateForEvent(queryClient, projectId, event);
      },
    });
  }, [client, enabled, projectId, queryClient]);
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-teal-700" />
          <h2 className="font-semibold text-slate-950">Live Event Stream</h2>
          <StatusBadge status={status} />
        </div>
        <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="button" onClick={() => setEnabled((value) => !value)}>
          {enabled ? "Stop stream" : "Start stream"}
        </button>
      </div>
      {events.length ? <JsonViewer value={events} title="Recent live events" /> : <p className="mt-3 text-sm text-slate-600">No live events received in this session.</p>}
    </div>
  );
}

function GuardianPanel({ projectId }: { projectId: string }) {
  return (
    <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Guardian actions need explicit actor input and Coordinator support. This page inspects high-risk request events for project {projectId}; it does not fabricate protocol decisions.
    </div>
  );
}

function SettingsPanel({ projectId }: { projectId: string }) {
  const [config] = useState(() => ({
    projectId,
    appName: appConfig.appName,
    devToolsEnabled: appConfig.devToolsEnabled,
    defaultCoordinatorUrl: appConfig.defaultCoordinatorUrl,
  }));
  return (
    <div className="space-y-4">
      <EmptyState title="Project settings are local to this browser." body="Disconnect or clear browser storage to remove the local API token." />
      <JsonViewer value={config} title="Console config" />
    </div>
  );
}
