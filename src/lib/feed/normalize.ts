import type { Entity } from "@/lib/coordinator/types";

function record(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}

function text(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "";
}

export function feedEventId(item: Entity): string {
  return text(item.feedEventId, item.id);
}

export function feedEventType(item: Entity): string {
  return text(item.eventType, item.type);
}

export function normalizeFeedItem(item: Entity) {
  const payload = record(item.payload);
  const subject = record(item.subject);
  const type = feedEventType(item);
  const id = feedEventId(item);
  return {
    id,
    type,
    actor: text(item.actor, item.actorId, payload.actorId),
    organization: text(item.organization, item.organizationId, item.org, payload.organizationId),
    project: text(item.project, item.projectId, payload.projectId),
    title: text(
      item.title,
      payload.title,
      payload.name,
      subject.title,
      subject.name,
      subject.id,
      item.summary,
      type,
      id,
    ),
    summary: text(item.summary, payload.summary, payload.description, payload.body, payload.content),
    status: text(item.status, item.stage, payload.status),
    risk: text(item.risk, item.riskLevel, payload.risk, payload.riskLevel, "low"),
    comments: Number(item.comments ?? payload.comments ?? 0),
    shares: Number(item.shares ?? payload.shares ?? 0),
    createdAt: text(item.createdAt, item.time, item.timestamp),
    subject,
    payload,
  };
}
