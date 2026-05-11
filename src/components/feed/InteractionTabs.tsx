"use client";

import { useState } from "react";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { StatusBadge } from "@/components/common/Badge";
import type { Entity } from "@/lib/coordinator/types";

function CommentsPanel({ items }: { items: Entity[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-sm text-slate-400">暂无评论</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {items.map((c, idx) => (
        <div key={idx} className="flex gap-3 py-5">
          <AgentAvatar name={String(c.author ?? c.actorId ?? "?")} size="h-9 w-9" />
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{String(c.author ?? c.actorId ?? "")}</span>
              {!!c.role && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{String(c.role)}</span>
                </>
              )}
              {!!(c.time ?? c.createdAt) && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-400">{String(c.time ?? c.createdAt)}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{String(c.body ?? c.content ?? "")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsPanel({ items }: { items: Entity[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-sm text-slate-400">暂无审核记录</p>;
  }
  return (
    <div className="space-y-3 py-5">
      {items.map((r, idx) => (
        <div key={idx} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AgentAvatar name={String(r.reviewer ?? r.actorId ?? "?")} size="h-9 w-9" />
              <div>
                <div className="text-sm font-semibold">{String(r.reviewer ?? r.actorId ?? "")}</div>
                {!!r.reliability && (
                  <div className="text-xs text-slate-400">Reliability {String(r.reliability)}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              {r.score !== undefined && (
                <div className="text-lg font-semibold">{String(r.score)}</div>
              )}
              {!!r.decision && (
                <div className="text-xs text-emerald-600">{String(r.decision)}</div>
              )}
            </div>
          </div>
          {!!r.reason && (
            <p className="mt-3 text-sm leading-6 text-slate-600">{String(r.reason)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function VotesPanel({ votes }: { votes: Entity[] }) {
  if (votes.length === 0) {
    return <p className="py-6 text-sm text-slate-400">暂无投票数据</p>;
  }
  return (
    <div className="grid grid-cols-4 gap-3 py-5">
      {votes.map((v, idx) => (
        <div key={idx} className="rounded-2xl bg-slate-50 p-4 text-center">
          <div className="text-xl font-semibold">{String(v.value ?? v.count ?? "—")}</div>
          <div className="mt-1 text-xs text-slate-400">{String(v.label ?? v.type ?? "")}</div>
        </div>
      ))}
    </div>
  );
}

function EventsPanel({ timeline }: { timeline: Entity[] }) {
  if (timeline.length === 0) {
    return <p className="py-6 text-sm text-slate-400">暂无事件记录</p>;
  }
  return (
    <div className="space-y-0 py-5">
      {timeline.map((event, index) => (
        <div key={index} className="relative flex gap-3 pb-4 last:pb-0">
          {index !== timeline.length - 1 && (
            <div className="absolute left-[13px] top-7 h-full w-px bg-slate-200" />
          )}
          <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] font-semibold text-white">
            {index + 1}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800">
              {String(event.type ?? event.eventType ?? "")}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {String(event.actor ?? event.actorId ?? "")}
              {!!(event.time ?? event.createdAt) &&
                ` · ${String(event.time ?? event.createdAt)}`}
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
      <div className="flex gap-2 border-b border-slate-100 pb-3">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === item.key
                ? "bg-slate-950 text-white"
                : "text-slate-500 hover:bg-slate-100"
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
