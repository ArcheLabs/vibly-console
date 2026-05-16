"use client";

import { useMemo } from "react";
import { useFeedDetail, useNetworkFeed, useNetworkOrganizations } from "@/lib/query/hooks";
import { LoadingState, ErrorState } from "@/components/common/States";
import { FeedDetailBreadcrumb } from "./FeedDetailBreadcrumb";
import { MainPost } from "./MainPost";
import { ObjectSummary } from "./ObjectSummary";
import { InteractionTabs } from "./InteractionTabs";
import { ContextPanel } from "@/components/coordination/ContextPanel";
import { GuardianActionsPanel } from "@/components/authority/GuardianActionsPanel";
import type { Entity } from "@/lib/coordinator/types";
import { actorNameFor, contentBodyFor, eventTypeFor, record, subjectRefFor, text } from "@/lib/entities/display";

function extractTimeline(event: Entity): Entity[] {
  if (Array.isArray(event.timeline)) return event.timeline as Entity[];
  if (Array.isArray((event.payload as Entity)?.timeline))
    return (event.payload as Entity).timeline as Entity[];
  return [];
}

function extractComments(event: Entity): Entity[] {
  if (Array.isArray(event.comments)) return event.comments as Entity[];
  if (Array.isArray(event.contributions)) return event.contributions as Entity[];
  const payload = event.payload as Entity | undefined;
  if (payload?.contribution && typeof payload.contribution === "object") return [payload.contribution as Entity];
  return [];
}

function isCommentEvent(event: Entity): boolean {
  const type = eventTypeFor(event).toLowerCase();
  return type.includes("discussion") || type.includes("contribution") || type.includes("comment");
}

function toComment(event: Entity): Entity {
  const payload = record(event.payload);
  const contribution = record(payload.contribution);
  return {
    id: text(event.feedEventId, event.id, contribution.id, payload.id),
    author: actorNameFor(event),
    role: text(event.role, payload.role, contribution.role),
    body: text(contentBodyFor(event), contribution.body, contribution.content, contribution.comment),
    createdAt: text(event.createdAt, event.time, event.timestamp, payload.createdAt, contribution.createdAt),
  };
}

function extractReviews(event: Entity): Entity[] {
  if (Array.isArray(event.reviews)) return event.reviews as Entity[];
  const payload = event.payload as Entity | undefined;
  if (payload?.review && typeof payload.review === "object") return [payload.review as Entity];
  if (payload && typeof payload === "object" && Array.isArray((payload as Entity).reviews)) return (payload as Entity).reviews as Entity[];
  return [];
}

function isReviewEvent(event: Entity): boolean {
  return eventTypeFor(event).toLowerCase().includes("review");
}

function reviewParts(value: string): { score: string; decision: string; reason: string } {
  const score = value.match(/\bscore\s*=\s*([^\s]+)/i)?.[1] ?? "";
  const decision = value.match(/\bdecision\s*=\s*([^\s]+)/i)?.[1] ?? "";
  const reason = value.match(/\breason\s*=\s*(.*?)(?:\s+risk\s*=|$)/i)?.[1]?.trim() ?? value;
  return { score, decision, reason };
}

function toReview(event: Entity): Entity {
  const payload = record(event.payload);
  const review = record(payload.review);
  const rawReason = text(payload.reason, review.reason, payload.body, review.body, payload.comment, review.comment, contentBodyFor(event));
  const parsed = reviewParts(rawReason);
  return {
    id: text(event.feedEventId, event.id, review.id, payload.id),
    reviewer: actorNameFor(event),
    score: text(payload.score, review.score, event.score, parsed.score),
    decision: text(payload.decision, review.decision, event.decision, parsed.decision, payload.status, review.status),
    reason: parsed.reason,
    createdAt: text(event.createdAt, event.time, event.timestamp, payload.createdAt, review.createdAt),
  };
}

function reviewsFromEvent(event: Entity): Entity[] {
  const payload = record(event.payload);
  if (Array.isArray(payload.reviews)) {
    return (payload.reviews as Entity[]).map((review, index) => ({
      ...review,
      id: `${text(event.feedEventId, event.id, "review")}:${index}`,
      reviewer: text(review.reviewer, review.reviewerId, actorNameFor(event)),
      score: text(review.score, reviewParts(text(review.reason, review.comment, review.body, review.content)).score),
      decision: text(review.decision, review.outcome, reviewParts(text(review.reason, review.comment, review.body, review.content)).decision),
      reason: reviewParts(text(review.reason, review.comment, review.body, review.content)).reason,
      createdAt: text(review.submittedAt, review.createdAt, event.createdAt, event.time, event.timestamp),
    }));
  }
  return [toReview(event)];
}

function extractVotes(event: Entity): Entity[] {
  if (Array.isArray(event.votes)) return event.votes as Entity[];
  return [];
}

function relationRefs(event: Entity): Set<string> {
  const payload = record(event.payload);
  const nested = record(payload.task ?? payload.proposal ?? payload.artifact ?? payload.observation ?? payload.review);
  const sourceRef = record(payload.sourceRef ?? event.sourceRef);
  const targetRef = record(payload.targetRef ?? event.targetRef);
  const discussionRef = record(payload.discussionRef ?? nested.discussionRef);
  return new Set(
    [
      subjectRefFor(event),
      text(event.objectRef),
      text(event.sourceObjectRef),
      text(payload.proposalId),
      text(payload.observationId),
      text(payload.taskId),
      text(payload.artifactId),
      text(payload.knowledgeEntryId),
      text(payload.discussionId),
      text(nested.proposalId),
      text(nested.observationId),
      text(nested.taskId),
      text(nested.artifactId),
      text(payload.id),
      text(nested.id),
      text(sourceRef.id),
      text(targetRef.id),
      text(discussionRef.id),
    ].filter(Boolean),
  );
}

function uniqueById(items: Entity[]): Entity[] {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = text(item.id, item.feedEventId, item.createdAt, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const feedQuery = useNetworkFeed(200);
  const orgsQuery = useNetworkOrganizations(100);
  const organizationNames = useMemo(() => {
    const entries = (orgsQuery.data?.data ?? []).flatMap((org: Entity) => {
      const id = String(org.id ?? "");
      const name = String(org.name ?? org.displayName ?? "");
      return id && name ? [[id, name] as const] : [];
    });
    return Object.fromEntries(entries);
  }, [orgsQuery.data]);
  const relatedEvents = useMemo(() => {
    if (!event) return [];
    const refs = relationRefs(event);
    return (feedQuery.data?.data ?? []).filter((item) => {
      if (text(item.feedEventId, item.id) === eventId) return false;
      const itemRefs = relationRefs(item);
      return [...refs].some((ref) => itemRefs.has(ref));
    });
  }, [event, eventId, feedQuery.data]);

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
  const comments = uniqueById([...extractComments(event), ...relatedEvents.filter(isCommentEvent).map(toComment)])
    .filter((item) => text(item.body, item.content));
  const reviews = uniqueById([...extractReviews(event), ...relatedEvents.filter(isReviewEvent).flatMap(reviewsFromEvent)])
    .filter((item) => text(item.reason, item.body, item.content, item.score, item.decision));
  const votes = extractVotes(event);
  const targetRef = String(event.objectRef ?? event.id ?? eventId);

  return (
    <div>
      <FeedDetailBreadcrumb event={event} organizationNames={organizationNames} />
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-6">
        <section className="col-span-12 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm lg:col-span-8">
          <MainPost event={event} organizationNames={organizationNames} />
          <ObjectSummary event={event} />
          <InteractionTabs
            comments={comments}
            reviews={reviews}
            votes={votes}
            timeline={timeline}
          />
        </section>

        <section className="col-span-12 lg:col-span-4">
          <ContextPanel
            event={event}
            mechanism={mechanism}
            timeline={timeline}
            chain={chain}
            reviewSummary={reviewSummary}
            organizationNames={organizationNames}
          >
            <GuardianActionsPanel targetRef={targetRef} />
          </ContextPanel>
        </section>
      </div>
    </div>
  );
}
