import type { Entity } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import {
  actorNameFor,
  contentBodyFor,
  contentTitleFor,
  eventSentenceFor,
  eventTypeFor,
  isContentEvent,
  nestedPayload,
  organizationIdFor,
  organizationNameFor,
  record,
  subjectRefFor,
  text,
} from "@/lib/entities/display";
import { timeAgo } from "@/lib/utils/format";

export function feedEventId(item: Entity): string {
  return text(item.feedEventId, item.id);
}

export function feedEventType(item: Entity): string {
  return eventTypeFor(item);
}

export function normalizeFeedItem(item: Entity, organizationNames?: EntityNameMap) {
  const payload = record(item.payload);
  const subject = record(item.subject);
  const nested = nestedPayload(payload);
  const type = feedEventType(item);
  const id = feedEventId(item);
  const rawTime = text(item.createdAt, item.time, item.timestamp, payload.createdAt, nested.createdAt);
  const organizationId = organizationIdFor(item);
  return {
    id,
    type,
    actor: actorNameFor(item),
    organization: organizationNameFor(item, organizationNames),
    organizationId,
    project: text(item.project, item.projectId, payload.projectId, nested.projectId),
    title: text(contentTitleFor(item), subject.title, subject.name, subject.id, type, id),
    summary: contentBodyFor(item),
    eventText: eventSentenceFor(item, organizationNames),
    isContent: isContentEvent(item),
    subjectRef: subjectRefFor(item),
    status: text(item.status, item.stage, payload.status, nested.status),
    risk: text(item.risk, item.riskLevel, payload.risk, payload.riskLevel, "low"),
    comments: Number(item.comments ?? payload.comments ?? 0),
    shares: Number(item.shares ?? payload.shares ?? 0),
    createdAt: timeAgo(rawTime),
    rawCreatedAt: rawTime,
    subject,
    payload,
  };
}
