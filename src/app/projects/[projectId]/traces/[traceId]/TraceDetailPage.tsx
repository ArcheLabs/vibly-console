"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EntityCard, PageHeader } from "@/components/common/EntityViews";
import { JsonViewer } from "@/components/common/JsonViewer";
import { ErrorState, LoadingState } from "@/components/common/States";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { asArray, asRecord, compactId } from "@/lib/utils/format";

export function TraceDetailPage({ projectId, traceId }: { projectId: string; traceId: string }) {
  const client = useCoordinatorClient();
  const trace = useQuery({
    queryKey: queryKeys.trace(traceId),
    queryFn: () => client.getTrace(traceId),
  });
  const verify = useMutation({ mutationFn: () => client.verifyTrace(traceId) });
  const replay = useMutation({ mutationFn: () => client.replayTrace(traceId) });
  const item = trace.data ? asRecord(trace.data) : null;
  const events = asArray(asRecord(item ?? {}).events);

  return (
    <AppShell projectId={projectId} projectName={`Trace ${compactId(traceId)}`}>
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
      {events.length ? <JsonViewer value={events} title={`Event timeline (${events.length})`} /> : null}
      {verify.error ? <ErrorState error={verify.error} title="Verify failed" /> : null}
      {verify.data ? <JsonViewer value={verify.data} title="Verify result" /> : null}
      {replay.error ? <ErrorState error={replay.error} title="Replay failed" /> : null}
      {replay.data ? <JsonViewer value={replay.data} title="Replay result" /> : null}
    </AppShell>
  );
}
