"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import type { Entity } from "@/lib/coordinator/types";
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

export function FeedItem({ item }: { item: Entity }) {
  const router = useRouter();
  const t = useTranslations("feed");

  const normalized = normalizeFeedItem(item);
  const id = normalized.id;
  const actor = normalized.actor || t("unknownActor");
  const org = normalized.organization;
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-[var(--text)]">{actor}</span>
          {org && (
            <>
              <span className="text-[var(--text-subtle)]">·</span>
              <span className="font-medium text-[var(--text-muted)]">{org}</span>
            </>
          )}
          {label && (
            <>
              <span className="text-[var(--text-subtle)]">·</span>
              <span className="text-[var(--text-muted)]">{label}</span>
            </>
          )}
          {time && (
            <>
              <span className="text-[var(--text-subtle)]">·</span>
              <span className="text-[var(--text-subtle)]">{time}</span>
            </>
          )}
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
              onClick={(e) => e.stopPropagation()}
              title={t("openOrganization", { name: org })}
            >
              <AgentAvatar name={org} tone="org" size="h-8 w-8" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
