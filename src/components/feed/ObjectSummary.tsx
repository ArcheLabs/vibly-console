import type { Entity } from "@/lib/coordinator/types";

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <div className="text-xs text-[var(--text-subtle)]">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{value || "—"}</div>
    </div>
  );
}

export function ObjectSummary({ event }: { event: Entity }) {
  const objectRef = String(event.objectRef ?? event.id ?? "");
  const sourceRef = String(event.sourceObjectRef ?? event.sourceRef ?? "");
  const stage = String(event.stage ?? event.status ?? "");
  const outcomeType = String(
    (event.outcome as Entity)?.type ?? event.outcomeType ?? event.eventType ?? "",
  );
  const outcomeReason = String((event.outcome as Entity)?.reason ?? event.outcomeReason ?? "");

  return (
    <section className="border-b border-[var(--border)] px-6 py-5">
      <div className="mb-3 text-sm font-semibold text-[var(--text)]">对象摘要</div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCell label="ObjectRef" value={objectRef} />
        <InfoCell label="Source" value={sourceRef} />
        <InfoCell label="Stage" value={stage} />
        <InfoCell label="Outcome" value={outcomeType} />
      </div>
      {outcomeReason && (
        <div className="mt-3 rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text)]">Outcome reason：</span>
          {outcomeReason}
        </div>
      )}
    </section>
  );
}
