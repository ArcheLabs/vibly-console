"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Share2 } from "lucide-react";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { RiskBadge, StatusBadge } from "@/components/common/Badge";
import type { Entity } from "@/lib/coordinator/types";

/** Map raw event type strings to a human-readable Chinese label */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    organization: "组织",
    observation: "观察",
    proposal: "提案",
    task: "任务",
    artifact: "成果",
    voting: "投票",
    reward: "奖励",
    risk: "风险",
  };
  const lower = type.toLowerCase();
  for (const [key, label] of Object.entries(map)) {
    if (lower.includes(key)) return label;
  }
  return type;
}

export function FeedItem({ item }: { item: Entity }) {
  const router = useRouter();

  const id = String(item.id ?? item.feedEventId ?? "");
  const actor = String(item.actor ?? item.actorId ?? item.type ?? "");
  const org = String(item.organization ?? item.org ?? item.projectId ?? "");
  const label = typeLabel(String(item.eventType ?? item.type ?? ""));
  const time = String(item.time ?? item.createdAt ?? item.timestamp ?? "");
  const title = String(item.title ?? item.type ?? id);
  const summary = String(item.summary ?? item.body ?? "");
  const project = String(item.project ?? item.projectId ?? "");
  const status = String(item.status ?? item.stage ?? "");
  const risk = String(item.risk ?? item.riskLevel ?? "low");
  const comments = Number(item.comments ?? 0);
  const shares = Number(item.shares ?? 0);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => id && router.push(`/feed/${id}`)}
      onKeyDown={(e) => e.key === "Enter" && id && router.push(`/feed/${id}`)}
      className="group flex cursor-pointer gap-4 bg-white px-5 py-5 transition hover:bg-slate-50/80"
    >
      <AgentAvatar name={actor} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-slate-950">{actor}</span>
          {org && (
            <>
              <span className="text-slate-400">·</span>
              <span className="font-medium text-slate-600">{org}</span>
            </>
          )}
          {label && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{label}</span>
            </>
          )}
          {time && (
            <>
              <span className="text-slate-400">·</span>
              <span className="text-slate-400">{time}</span>
            </>
          )}
        </div>

        <h3 className="mt-1 text-[15px] font-semibold leading-6 text-slate-950">{title}</h3>
        {summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{summary}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {project && (
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
              {project}
            </span>
          )}
          {status && <StatusBadge status={status} />}
          <RiskBadge risk={risk} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-7 text-sm text-slate-400">
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 transition hover:text-slate-700"
              aria-label="评论"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{comments}</span>
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 transition hover:text-slate-700"
              aria-label="分享"
            >
              <Share2 className="h-4 w-4" />
              <span>{shares}</span>
            </button>
          </div>

          {org && (
            <button
              onClick={(e) => e.stopPropagation()}
              title={`进入组织：${org}`}
            >
              <AgentAvatar name={org} tone="org" size="h-8 w-8" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
