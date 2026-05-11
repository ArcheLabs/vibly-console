"use client";

import { useFeedDetail } from "@/lib/query/hooks";
import { LoadingState, ErrorState } from "@/components/common/States";
import { FeedDetailBreadcrumb } from "./FeedDetailBreadcrumb";
import { MainPost } from "./MainPost";
import { ObjectSummary } from "./ObjectSummary";
import { InteractionTabs } from "./InteractionTabs";
import { ContextPanel } from "@/components/coordination/ContextPanel";
import { GuardianActionsPanel } from "@/components/authority/GuardianActionsPanel";
import type { Entity } from "@/lib/coordinator/types";

function extractTimeline(event: Entity): Entity[] {
  if (Array.isArray(event.timeline)) return event.timeline as Entity[];
  if (Array.isArray((event.payload as Entity)?.timeline))
    return (event.payload as Entity).timeline as Entity[];
  return [];
}

function extractComments(event: Entity): Entity[] {
  if (Array.isArray(event.comments)) return event.comments as Entity[];
  if (Array.isArray(event.contributions)) return event.contributions as Entity[];
  return [];
}

function extractReviews(event: Entity): Entity[] {
  if (Array.isArray(event.reviews)) return event.reviews as Entity[];
  return [];
}

function extractVotes(event: Entity): Entity[] {
  if (Array.isArray(event.votes)) return event.votes as Entity[];
  return [];
}

function extractCausalChain(event: Entity) {
  if (Array.isArray(event.causalChain)) return event.causalChain as { group: string; items: Entity[] }[];
  const chain: { group: string; items: Entity[] }[] = [];
  if (event.sourceObjectRef) {
    chain.push({ group: "Source", items: [{ title: String(event.sourceObjectRef), body: "", status: "completed" }] });
  }
  if (event.objectRef) {
    chain.push({ group: "Current", items: [{ title: String(event.objectRef), body: String(event.title ?? ""), status: String(event.stage ?? event.status ?? "") }] });
  }
  if (Array.isArray(event.downstream)) {
    chain.push({ group: "Downstream", items: event.downstream as Entity[] });
  }
  return chain;
}

export function FeedDetailPage({ eventId }: { eventId: string }) {
  const { data: event, isLoading, error } = useFeedDetail(eventId);

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingState label="加载详情中..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8">
        <ErrorState error={error ?? new Error("Not found")} title="无法加载动态详情" />
      </div>
    );
  }

  const mechanism = (event.mechanism as Entity) ?? undefined;
  const reviewSummary = (event.reviewSummary as Entity) ?? undefined;
  const timeline = extractTimeline(event);
  const chain = extractCausalChain(event);
  const comments = extractComments(event);
  const reviews = extractReviews(event);
  const votes = extractVotes(event);
  const targetRef = String(event.objectRef ?? event.id ?? eventId);

  return (
    <div>
      <FeedDetailBreadcrumb event={event} />
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-6">
        <section className="col-span-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <MainPost event={event} />
          <ObjectSummary event={event} />
          <InteractionTabs
            comments={comments}
            reviews={reviews}
            votes={votes}
            timeline={timeline}
          />
        </section>

        <section className="col-span-4">
          <ContextPanel
            event={event}
            mechanism={mechanism}
            timeline={timeline}
            chain={chain}
            reviewSummary={reviewSummary}
          >
            <GuardianActionsPanel targetRef={targetRef} />
          </ContextPanel>
        </section>
      </div>
    </div>
  );
}
