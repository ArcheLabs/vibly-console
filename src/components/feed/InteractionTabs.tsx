"use client";

import { useState } from "react";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { StatusBadge } from "@/components/common/Badge";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import type { Entity } from "@/lib/coordinator/types";
import { timeAgo } from "@/lib/utils/format";

function CommentsPanel({ items }: { items: Entity[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-sm text-[var(--text-subtle)]">暂无评论</p>;
  }
  return (
    <div className="divide-y divide-[var(--border)]">
      {items.map((c, idx) => (
        <div key={idx} className="flex gap-3 py-5">
          <AgentAvatar name={String(c.author ?? c.actorId ?? "?")} size="h-9 w-9" />
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{String(c.author ?? c.actorId ?? "")}</span>
              {!!c.role && (
                <>
                  <span className="text-[var(--text-subtle)]">·</span>
                  <span className="text-[var(--text-muted)]">{String(c.role)}</span>
                </>
              )}
              {!!(c.time ?? c.createdAt) && (
                <>
                  <span className="text-[var(--text-subtle)]">·</span>
                  <span className="text-[var(--text-subtle)]">{timeAgo(c.time ?? c.createdAt)}</span>
                </>
              )}
            </div>
            <MarkdownBody value={String(c.body ?? c.content ?? "")} className="mt-1 text-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsPanel({ items }: { items: Entity[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-sm text-[var(--text-subtle)]">暂无审核记录</p>;
  }
  return (
    <div className="space-y-3 py-5">
      {items.map((r, idx) => (
        <div key={idx} className="rounded-2xl bg-[var(--surface-muted)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AgentAvatar name={String(r.reviewer ?? r.actorId ?? "?")} size="h-9 w-9" />
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">{String(r.reviewer ?? r.actorId ?? "")}</div>
                {!!r.reliability && (
                  <div className="text-xs text-[var(--text-subtle)]">Reliability {String(r.reliability)}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              {r.score !== undefined && (
                <div className="text-lg font-semibold text-[var(--text)]">{String(r.score)}</div>
              )}
              {!!r.decision && (
                <div className="text-xs text-[var(--success)]">{String(r.decision)}</div>
              )}
            </div>
          </div>
          {!!r.reason && (
            <MarkdownBody value={String(r.reason)} className="mt-3 text-sm" />
          )}
        </div>
      ))}
    </div>
  );
}

function VotesPanel({ votes }: { votes: Entity[] }) {
  if (votes.length === 0) {
    return <p className="py-6 text-sm text-[var(--text-subtle)]">暂无投票数据</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-3 py-5">
      {votes.map((v, idx) => (
        <div key={idx} className="rounded-2xl bg-[var(--surface-muted)] p-4 text-center">
          <div className="text-xl font-semibold text-[var(--text)]">{String(v.value ?? v.count ?? "—")}</div>
          <div className="mt-1 text-xs text-[var(--text-subtle)]">{String(v.label ?? v.type ?? "")}</div>
        </div>
      ))}
    </div>
  );
}

function EventsPanel({ timeline }: { timeline: Entity[] }) {
  if (timeline.length === 0) {
    return <p className="py-6 text-sm text-[var(--text-subtle)]">暂无事件记录</p>;
  }
  return (
    <div className="space-y-0 py-5">
      {timeline.map((event, index) => (
        <div key={index} className="relative flex gap-3 pb-4 last:pb-0">
          {index !== timeline.length - 1 && (
            <div className="absolute left-[13px] top-7 h-full w-px bg-[var(--border)]" />
          )}
          <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-[10px] font-semibold text-[var(--surface)]">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text)]">
              {String(event.type ?? event.eventType ?? "")}
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-subtle)]">
              {String(event.actor ?? event.actorId ?? "")}
              {!!(event.time ?? event.createdAt) &&
                ` · ${timeAgo(event.time ?? event.createdAt)}`}
            </div>
            {!!(event.state ?? event.status) && (
              <div className="mt-1">
                <StatusBadge status={String(event.state ?? event.status)} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { key: "comments", label: "评论" },
  { key: "reviews", label: "审核" },
  { key: "votes", label: "投票" },
  { key: "events", label: "事件" },
] as const;

export function InteractionTabs({
  comments,
  reviews,
  votes,
  timeline,
}: {
  comments: Entity[];
  reviews: Entity[];
  votes: Entity[];
  timeline: Entity[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("comments");

  const counts: Record<string, number> = {
    comments: comments.length,
    reviews: reviews.length,
    votes: votes.length,
    events: timeline.length,
  };

  return (
    <section className="px-6 py-5">
      <div className="flex gap-2 border-b border-[var(--border)] pb-3">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === item.key
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            {item.label}{" "}
            <span className="ml-1 opacity-70">{counts[item.key]}</span>
          </button>
        ))}
      </div>

      {tab === "comments" && <CommentsPanel items={comments} />}
      {tab === "reviews" && <ReviewsPanel items={reviews} />}
      {tab === "votes" && <VotesPanel votes={votes} />}
      {tab === "events" && <EventsPanel timeline={timeline} />}
    </section>
  );
}
