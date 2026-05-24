"use client";

import { useRouter } from "next/navigation";
import { CircleDot, MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import type { Entity } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import { normalizeFeedItem } from "@/lib/feed/normalize";

function typeKey(type: string): string {
  const map: Record<string, string> = {
    organization: "organization",
    observation: "observation",
    proposal: "proposal",
    task: "task",
    artifact: "artifact",
    voting: "voting",
    reward: "reward",
    risk: "risk",
  };
  const lower = type.toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value;
  }
  return "";
}

function eventMessageKey(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes("member") || lower.includes("joined")) return "memberJoined";
  if (lower.includes("artifactmerged")) return "artifactMerged";
  if (lower.includes("knowledgeentrycreated")) return "knowledgeCreated";
  if (lower.includes("knowledgeentryupdated")) return "knowledgeUpdated";
  if (lower.includes("rewardintentapproved")) return "rewardApproved";
  if (lower.includes("rewardintentcreated")) return "rewardCreated";
  if (lower.includes("settlementconfirmed")) return "settlementConfirmed";
  if (lower.includes("settlementsubmitted")) return "settlementSubmitted";
  if (lower.includes("settlementbatchcreated")) return "settlementBatchCreated";
  if (lower.includes("organizationcreated")) return "organizationCreated";
  if (lower.includes("agentregistered")) return "agentRegistered";
  if (lower.includes("reviewroundcreated")) return "reviewRoundCreated";
  if (lower.includes("reviewroundcompleted")) return "reviewRoundCompleted";
  if (lower.includes("reviewrequested")) return "reviewRequested";
  if (lower.includes("reviewerselected")) return "reviewerSelected";
  if (lower.includes("taskclaimed")) return "taskClaimed";
  if (lower.includes("taskaccepted")) return "taskAccepted";
  if (lower.includes("taskplancreated")) return "taskPlanCreated";
  if (lower.includes("proposalcreationrequested")) return "proposalCreationRequested";
  if (lower.includes("discussionparticipantselected")) return "discussionParticipantSelected";
  return "fallback";
}

export function FeedItem({ item, organizationNames, projectNames }: { item: Entity; organizationNames?: EntityNameMap; projectNames?: EntityNameMap }) {
  const router = useRouter();
  const t = useTranslations("feed");
  const eventT = useTranslations("events");

  const normalized = normalizeFeedItem(item, organizationNames, projectNames);
  const id = normalized.id;
  const actor = normalized.actor || t("unknownActor");
  const org = normalized.organization;
  const orgId = normalized.organizationId;
  const labelKey = typeKey(normalized.type);
  const label = labelKey ? t(`filters.${labelKey}`) : normalized.type;
  const time = normalized.createdAt;
  const title = normalized.title || t("unknownTitle");
  const summary = normalized.summary;
  const project = normalized.project;
  const status = normalized.status;
  const risk = normalized.risk;
  const comments = normalized.comments;
  const shares = normalized.shares;
  const eventText = eventT(eventMessageKey(normalized.type), {
    actor,
    org,
    title,
    type: normalized.type || eventT("event"),
  });

  if (!normalized.isContent) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={() => id && router.push(`/feed/${id}`)}
        onKeyDown={(e) => e.key === "Enter" && id && router.push(`/feed/${id}`)}
        className="group flex cursor-pointer gap-4 bg-[var(--surface)] px-5 py-4 transition hover:bg-[var(--surface-muted)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] ring-1 ring-[var(--border)]">
          <CircleDot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-normal leading-6 text-[var(--text)]">{eventText}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-subtle)]">
                {org ? (
                  <button
                    type="button"
                    className="font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (orgId) router.push(`/organizations/${encodeURIComponent(orgId)}`);
                    }}
                  >
                    {org}
                  </button>
                ) : null}
                {label ? <span>{label}</span> : null}
              </div>
            </div>
            {time ? <span className="shrink-0 text-xs text-[var(--text-subtle)]">{time}</span> : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => id && router.push(`/feed/${id}`)}
      onKeyDown={(e) => e.key === "Enter" && id && router.push(`/feed/${id}`)}
      className="group flex cursor-pointer gap-4 bg-[var(--surface)] px-5 py-5 transition hover:bg-[var(--surface-muted)]"
    >
      <AgentAvatar name={actor} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <button
              type="button"
              className="truncate font-semibold text-[var(--text)] hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                if (actor) router.push(`/agents/${encodeURIComponent(actor)}`);
              }}
            >
              {actor}
            </button>
            {org && (
              <>
                <span className="text-[var(--text-subtle)]">·</span>
                <button
                  type="button"
                  className="font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (orgId) router.push(`/organizations/${encodeURIComponent(orgId)}`);
                  }}
                >
                  {org}
                </button>
              </>
            )}
            {label && (
              <>
                <span className="text-[var(--text-subtle)]">·</span>
                <span className="text-[var(--text-muted)]">{label}</span>
              </>
            )}
          </div>
          {time && <span className="shrink-0 text-xs text-[var(--text-subtle)]">{time}</span>}
        </div>

        <h3 className="mt-1 text-[15px] font-semibold leading-6 text-[var(--text)]">{title}</h3>
        {summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{summary}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project && (
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] ring-1 ring-[var(--border)]">
              {project}
            </span>
          )}
          {status && <StatusBadge status={status} />}
          <RiskBadge risk={risk} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-7 text-sm text-[var(--text-subtle)]">
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 transition hover:text-[var(--text)]"
              aria-label={t("comments")}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{comments}</span>
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 transition hover:text-[var(--text)]"
              aria-label={t("shares")}
            >
              <Share2 className="h-4 w-4" />
              <span>{shares}</span>
            </button>
          </div>

          {org && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                if (orgId) router.push(`/organizations/${encodeURIComponent(orgId)}`);
              }}
              title={t("openOrganization", { name: org })}
              type="button"
            >
              <AgentAvatar name={org} tone="org" size="h-8 w-8" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
