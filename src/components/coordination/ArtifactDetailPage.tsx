"use client";

import { useMemo } from "react";
import { useArtifactV2, useProjects } from "@/lib/query/hooks";
import { LoadingState, ErrorState } from "@/components/common/States";
import { MainPost } from "@/components/feed/MainPost";
import { ObjectSummary } from "@/components/feed/ObjectSummary";
import { ContextPanel } from "@/components/coordination/ContextPanel";
import { GuardianActionsPanel } from "@/components/authority/GuardianActionsPanel";
import type { Entity } from "@/lib/coordinator/types";
import { entityNameMap } from "@/lib/entities/display";

export function ArtifactDetailPage({ artifactId }: { artifactId: string }) {
  const { data, isLoading, error } = useArtifactV2(artifactId);
  const projectsQuery = useProjects(200);
  const projectNames = useMemo(() => {
    return entityNameMap((projectsQuery.data?.data ?? []) as Entity[]);
  }, [projectsQuery.data]);

  if (isLoading) return <div className="p-8"><LoadingState label="加载成果中..." /></div>;
  if (error || !data) {
    const is501 = error instanceof Error && error.message.includes("501");
    return (
      <div className="p-8">
        <ErrorState
          error={error ?? new Error("Not found")}
          title={is501 ? "成果详情暂未开放" : "无法加载成果"}
        />
      </div>
    );
  }

  const event = data as Entity;
  const targetRef = String(event.id ?? artifactId);

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
