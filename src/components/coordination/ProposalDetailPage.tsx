"use client";

import { useMemo } from "react";
import { useProposalV2, useProjects } from "@/lib/query/hooks";
import { LoadingState, ErrorState } from "@/components/common/States";
import { MainPost } from "@/components/feed/MainPost";
import { ObjectSummary } from "@/components/feed/ObjectSummary";
import { ContextPanel } from "@/components/coordination/ContextPanel";
import { GuardianActionsPanel } from "@/components/authority/GuardianActionsPanel";
import type { Entity } from "@/lib/coordinator/types";
import { entityNameMap } from "@/lib/entities/display";

export function ProposalDetailPage({ proposalId }: { proposalId: string }) {
  const { data, isLoading, error } = useProposalV2(proposalId);
  const projectsQuery = useProjects(200);
  const projectNames = useMemo(() => {
    return entityNameMap((projectsQuery.data?.data ?? []) as Entity[]);
  }, [projectsQuery.data]);

  if (isLoading) return <div className="p-8"><LoadingState label="加载提案中..." /></div>;
  if (error || !data) return <div className="p-8"><ErrorState error={error ?? new Error("Not found")} title="无法加载提案" /></div>;

  const event = data as Entity;
  const targetRef = String(event.id ?? proposalId);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-6">
      <section className="col-span-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <MainPost event={event} />
        <ObjectSummary event={event} />
      </section>
      <section className="col-span-4">
        <ContextPanel event={event} timeline={[]} chain={[]} projectNames={projectNames}>
          <GuardianActionsPanel targetRef={targetRef} />
        </ContextPanel>
      </section>
    </div>
  );
}
