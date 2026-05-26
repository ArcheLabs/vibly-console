import type { Entity } from "@/lib/coordinator/types";

export type EntityNameMap = Record<string, string>;

export function record(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}

export function text(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return "";
}

export function nestedPayload(payload: Entity): Entity {
  return record(
    payload.observation
      ?? payload.proposal
      ?? payload.artifact
      ?? payload.task
      ?? payload.review
      ?? payload.outcome
      ?? payload.contribution
      ?? payload.knowledgeEntry,
  );
}

export function displayNameFromId(id: string, names?: EntityNameMap): string {
  return names?.[id] ?? id;
}

export function entityNameMap(items: Entity[]): EntityNameMap {
  const entries = items.flatMap((item) => {
    const id = text(item.id);
    const name = text(item.name, item.displayName, item.title);
    return id && name ? [[id, name] as const] : [];
  });
  return Object.fromEntries(entries);
}

export function organizationIdFor(item: Entity): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  return text(item.organizationId, payload.organizationId, nested.organizationId, item.org);
}

export function organizationNameFor(item: Entity, names?: EntityNameMap): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  const id = organizationIdFor(item);
  return text(
    item.organizationName,
    item.organization,
    payload.organizationName,
    nested.organizationName,
    id ? displayNameFromId(id, names) : "",
  );
}

export function projectIdFor(item: Entity): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  return text(item.projectId, payload.projectId, nested.projectId);
}

export function projectNameFor(item: Entity, names?: EntityNameMap): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  const id = projectIdFor(item);
  const explicitName = text(
    item.projectName,
    payload.projectName,
    nested.projectName,
    item.projectTitle,
    payload.projectTitle,
    nested.projectTitle,
  );
  if (explicitName) return explicitName;

  const projectField = text(item.project, payload.project, nested.project);
  const mappedName = id ? names?.[id] : undefined;
  if (mappedName) return mappedName;
  if (projectField && projectField !== id) return projectField;
  return id ? displayNameFromId(id, names) : projectField;
}

function sectionFromFindings(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const lines = value
    .map((entry) => {
      const record = entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as Entity) : {};
      const title = text(record.title, record.name);
      const description = text(record.description, record.detail, record.content, record.body);
      if (title && description) return `- ${title}: ${description}`;
      if (title) return `- ${title}`;
      if (description) return `- ${description}`;
      return "";
    })
    .filter(Boolean);
  return lines.join("\n");
}

function sectionFromActions(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const lines = value
    .map((entry) => {
      const record = entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as Entity) : {};
      const actionType = text(record.type);
      const title = text(record.title, record.name);
      const description = text(record.description, record.detail, record.content, record.body);
      const head = [actionType, title].filter(Boolean).join(" · ");
      if (head && description) return `- ${head}: ${description}`;
      if (head) return `- ${head}`;
      if (description) return `- ${description}`;
      return "";
    })
    .filter(Boolean);
  return lines.join("\n");
}

function sectionFromRisk(value: unknown): string {
  if (!Array.isArray(value)) return "";
  const lines = value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const record = entry as Entity;
        return text(record.title, record.reason, record.description, record.detail);
      }
      return "";
    })
    .filter(Boolean)
    .map((line) => `- ${line}`);
  return lines.join("\n");
}

function observationBodyFromStructured(payload: Entity, nested: Entity, item: Entity): string {
  const findings = sectionFromFindings(item.findings ?? payload.findings ?? nested.findings);
  const risks = sectionFromRisk(item.risks ?? payload.risks ?? nested.risks);
  const suggestedActions = sectionFromActions(item.suggestedActions ?? payload.suggestedActions ?? nested.suggestedActions);
  const sections = [
    findings ? `Findings\n${findings}` : "",
    risks ? `Risks\n${risks}` : "",
    suggestedActions ? `Suggested Actions\n${suggestedActions}` : "",
  ].filter(Boolean);
  return sections.join("\n\n");
}

export function contentBodyFor(item: Entity): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  return text(
    item.body,
    item.content,
    payload.body,
    payload.content,
    payload.description,
    payload.comment,
    payload.reason,
    nested.body,
    nested.content,
    nested.description,
    nested.comment,
    nested.reason,
    payload.summary,
    nested.summary,
    item.description,
    observationBodyFromStructured(payload, nested, item),
  );
}

export function contentTitleFor(item: Entity): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  return text(
    item.title,
    payload.title,
    nested.title,
    payload.name,
    nested.name,
    item.summary,
    item.eventType,
    item.type,
    item.id,
  );
}

export function actorNameFor(item: Entity): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  return text(
    item.actor,
    item.actorName,
    item.actorId,
    payload.actor,
    payload.actorName,
    payload.actorId,
    payload.createdBy,
    payload.submittedBy,
    payload.reviewerId,
    payload.recipientId,
    nested.actor,
    nested.actorName,
    nested.actorId,
    nested.createdBy,
    nested.submittedBy,
    nested.reviewerId,
  );
}

export function subjectRefFor(item: Entity): string {
  const payload = record(item.payload);
  const nested = nestedPayload(payload);
  const sourceRef = record(payload.sourceRef ?? nested.sourceRef ?? item.sourceRef);
  return text(
    item.objectRef,
    item.subjectRef,
    item.targetRef,
    payload.objectRef,
    payload.proposalId,
    payload.observationId,
    payload.taskId,
    payload.artifactId,
    payload.knowledgeEntryId,
    payload.id,
    nested.id,
    sourceRef.id,
    item.id,
  );
}

export function eventTypeFor(item: Entity): string {
  return text(item.eventType, item.type);
}

export function isContentEvent(item: Entity): boolean {
  const type = eventTypeFor(item).toLowerCase();
  const hasBody = Boolean(contentBodyFor(item));
  const systemEventFragments = [
    "rewardintent",
    "settlement",
    "reviewround",
    "reviewsubmitted",
    "reviewrequested",
    "reviewerselected",
    "taskclaimed",
    "taskaccepted",
    "taskplancreated",
    "proposalcreationrequested",
    "discussionparticipantselected",
    "artifactmerged",
    "member",
    "joined",
  ];
  if (systemEventFragments.some((fragment) => type.includes(fragment))) return false;
  const contentEventFragments = [
    "observationsubmitted",
    "proposalsubmitted",
    "discussioncontribution",
    "knowledgeentrycreated",
    "knowledgeentryupdated",
    "artifactcreated",
    "artifactsubmitted",
  ];
  return hasBody && contentEventFragments.some((fragment) => type.includes(fragment));
}

export function eventSentenceFor(item: Entity, names?: EntityNameMap): string {
  const type = eventTypeFor(item);
  const lower = type.toLowerCase();
  const actor = actorNameFor(item) || "系统";
  const org = organizationNameFor(item, names);
  const title = contentTitleFor(item);

  if (lower.includes("member") && lower.includes("add")) return `${actor} 加入组织 ${org || title}`;
  if (lower.includes("joined")) return `${actor} 加入组织 ${org || title}`;
  if (lower.includes("artifactmerged")) return `${actor} 将成果合并到知识库`;
  if (lower.includes("knowledgeentrycreated")) return `知识库新增条目：${title}`;
  if (lower.includes("knowledgeentryupdated")) return `知识库更新条目：${title}`;
  if (lower.includes("rewardintentapproved")) return `${actor} 的奖励申请已通过`;
  if (lower.includes("rewardintentcreated")) return `${actor} 提交奖励申请`;
  if (lower.includes("settlementconfirmed")) return "奖励结算已确认";
  if (lower.includes("settlementsubmitted")) return "奖励结算已提交";
  if (lower.includes("settlementbatchcreated")) return "创建奖励结算批次";
  if (lower.includes("organizationcreated")) return `创建组织 ${org || title}`;
  if (lower.includes("agentregistered")) return `${actor} 注册为 Agent`;

  return title && title !== type ? `${type}: ${title}` : type || "事件";
}
