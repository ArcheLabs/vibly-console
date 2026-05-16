import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import { CausalChain } from "@/components/coordination/CausalChain";
import type { Entity } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import { eventTypeFor, organizationNameFor, text } from "@/lib/entities/display";

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="shrink-0 text-[var(--text-subtle)]">{label}</span>
      <span className="truncate font-medium text-[var(--text)]">{value || "—"}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold text-[var(--text)]">{title}</div>
      {children}
    </section>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-3">
      <div className="text-xs text-[var(--text-subtle)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--text)]">{value || "—"}</div>
    </div>
  );
}

export function ContextPanel({
  event,
  mechanism,
  timeline,
  chain,
  reviewSummary,
  organizationNames,
  children,
}: {
  event: Entity;
  mechanism?: Entity;
  timeline: Entity[];
  chain: { group: string; items: Entity[] }[];
  reviewSummary?: Entity;
  organizationNames?: EntityNameMap;
  children?: React.ReactNode;
}) {
  const org = organizationNameFor(event, organizationNames);
  const project = text(event.project, event.projectName, event.projectId);
  const objectType = text(event.objectType, eventTypeFor(event));
  const stage = String(event.stage ?? event.status ?? "");
  const visibility = String(event.visibility ?? "public");
  const risk = String(event.risk ?? event.riskLevel ?? "low");

  return (
    <aside className="space-y-4">
      <Panel title="协作上下文">
        <div className="space-y-3">
          <ContextRow label="Organization" value={org} />
          <ContextRow label="Project" value={project} />
          <ContextRow label="Object Type" value={objectType} />
          <ContextRow label="Stage" value={stage} />
          <ContextRow label="Visibility" value={visibility} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-subtle)]">Risk</span>
            <RiskBadge risk={risk} />
          </div>
        </div>
      </Panel>

      {mechanism && (
        <Panel title="机制实例">
          <div className="text-sm font-semibold text-[var(--text)]">
            {String(mechanism.name ?? mechanism.mechanismType ?? "")}
          </div>
          {!!mechanism.instanceId && (
            <div className="mt-1 text-xs text-[var(--text-subtle)]">{String(mechanism.instanceId)}</div>
          )}
          {!!(mechanism.summary ?? mechanism.description) && (
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              {String(mechanism.summary ?? mechanism.description)}
            </p>
          )}
        </Panel>
      )}

      {timeline.length > 0 && (
        <Panel title="事件轨迹">
          <div className="space-y-0">
            {timeline.map((ev, index) => (
              <div key={index} className="relative flex gap-3 pb-4 last:pb-0">
                {index !== timeline.length - 1 && (
                  <div className="absolute left-[13px] top-7 h-full w-px bg-[var(--border)]" />
                )}
                <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-[10px] font-semibold text-[var(--surface)]">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {String(ev.type ?? ev.eventType ?? "")}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-subtle)]">
                    {String(ev.actor ?? ev.actorId ?? "")}
                  </div>
                  {!!(ev.state ?? ev.status) && (
                    <div className="mt-1">
                      <StatusBadge status={String(ev.state ?? ev.status)} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {chain.length > 0 && (
        <Panel title="因果链">
          <CausalChain chain={chain} />
        </Panel>
      )}

      {reviewSummary && (
        <Panel title="ReviewRound">
          <div className="grid grid-cols-2 gap-3">
            <InfoCell label="Reviewers" value={String(reviewSummary.reviewers ?? "—")} />
            <InfoCell label="Average" value={String(reviewSummary.average ?? "—")} />
            <InfoCell label="Decision" value={String(reviewSummary.decision ?? "—")} />
            <InfoCell label="Disagreement" value={String(reviewSummary.disagreement ?? "—")} />
          </div>
        </Panel>
      )}

      {children}
    </aside>
  );
}
