"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EntityCard, PageHeader } from "@/components/common/EntityViews";
import { JsonViewer } from "@/components/common/JsonViewer";
import { ErrorState, LoadingState } from "@/components/common/States";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { useActiveNetworkProfile } from "@/lib/network/profiles";
import { asArray, asRecord, compactId } from "@/lib/utils/format";

export function TraceDetailPage({ projectId, traceId }: { projectId: string; traceId: string }) {
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  const trace = useQuery({
    queryKey: queryKeys.trace(network.id, traceId),
    queryFn: () => client.getTrace(traceId),
  });
  const verify = useMutation({ mutationFn: () => client.verifyTrace(traceId) });
  const replay = useMutation({ mutationFn: () => client.replayTrace(traceId) });
  const item = trace.data ? asRecord(trace.data) : null;
  const events = asArray(asRecord(item ?? {}).events);

  return (
    <AppShell>
      <PageHeader
        title={`Trace ${compactId(traceId)}`}
        eyebrow="Protocol trace"
        actions={
          <>
            <ConfirmButton confirm="Verify this trace against invariants?" onConfirm={() => verify.mutate()}>
              Verify
            </ConfirmButton>
            <ConfirmButton confirm="Replay this trace locally through coordinator?" onConfirm={() => replay.mutate()}>
              Replay
            </ConfirmButton>
          </>
        }
      />
      {trace.isLoading ? <LoadingState label="Loading trace" /> : null}
      {trace.error ? <ErrorState error={trace.error} title="Could not load trace" /> : null}
      {item ? <EntityCard title="Trace Metadata" item={item} /> : null}
      {events.length ? <TraceReadableTimeline events={events.map(asRecord)} /> : null}
      {events.length ? <JsonViewer value={events} title={`Event timeline (${events.length})`} /> : null}
      {verify.error ? <ErrorState error={verify.error} title="Verify failed" /> : null}
      {verify.data ? <JsonViewer value={verify.data} title="Verify result" /> : null}
      {replay.error ? <ErrorState error={replay.error} title="Replay failed" /> : null}
      {replay.data ? <JsonViewer value={replay.data} title="Replay result" /> : null}
    </AppShell>
  );
}

function TraceReadableTimeline({ events }: { events: Record<string, unknown>[] }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-950">Readable Replay Timeline</h2>
      <p className="mt-1 text-sm text-slate-600">The same protocol trace rendered as actor, event type, reason/evidence, and related payload context.</p>
      <div className="mt-4 space-y-3">
        {events.map((event, index) => {
          const payload = asRecord(event.payload);
          return (
            <div key={String(event.id ?? index)} className="border-l-2 border-teal-600 pl-3">
              <p className="font-medium text-slate-950">{String(event.type ?? "Event")}</p>
              <p className="text-xs text-slate-500">actor={compactId(String(event.actorId ?? payload.actorId ?? "unknown"))}</p>
              <p className="mt-1 text-sm text-slate-600">{String(payload.reason ?? payload.summary ?? payload.title ?? payload.status ?? "No human-readable summary in payload.")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
