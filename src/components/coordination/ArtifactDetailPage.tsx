"use client";

import { useArtifactV2 } from "@/lib/query/hooks";
import { LoadingState, ErrorState } from "@/components/common/States";
import { MainPost } from "@/components/feed/MainPost";
import { ObjectSummary } from "@/components/feed/ObjectSummary";
import { ContextPanel } from "@/components/coordination/ContextPanel";
import { GuardianActionsPanel } from "@/components/authority/GuardianActionsPanel";
import type { Entity } from "@/lib/coordinator/types";

export function ArtifactDetailPage({ artifactId }: { artifactId: string }) {
  const { data, isLoading, error } = useArtifactV2(artifactId);

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
        <ContextPanel event={event} timeline={[]} chain={[]}>
          <GuardianActionsPanel targetRef={targetRef} />
        </ContextPanel>
      </section>
    </div>
  );
}
