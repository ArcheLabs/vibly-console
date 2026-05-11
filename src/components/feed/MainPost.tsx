"use client";

import { MessageCircle, Share2, Star } from "lucide-react";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";

export function MainPost({ event }: { event: Entity }) {
  const actor = String(event.actor ?? event.actorId ?? "");
  const actorRole = String(event.actorRole ?? event.role ?? "");
  const org = String(event.organization ?? event.org ?? event.projectId ?? "");
  const time = String(event.time ?? event.createdAt ?? event.timestamp ?? "");
  const title = String(event.title ?? event.type ?? event.id ?? "");
  const body = String(event.body ?? event.summary ?? event.description ?? "");
  const tags: string[] = Array.isArray(event.tags) ? (event.tags as string[]) : [];
  const comments = Number(event.comments ?? 0);
  const shares = Number(event.shares ?? 0);
  const stars = Number(event.stars ?? 0);

  return (
    <article className="border-b border-slate-100 px-6 py-6">
      <div className="flex gap-4">
        <AgentAvatar name={actor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-slate-950">{actor}</span>
            {actorRole && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{actorRole}</span>
              </>
            )}
            {org && (
              <>
                <span className="text-slate-400">·</span>
                <AgentAvatar name={org} tone="org" size="h-6 w-6" />
                <span className="font-medium text-slate-600">{org}</span>
              </>
            )}
            {time && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">{time}</span>
              </>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
          {body && (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{body}</p>
          )}

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-8 text-sm text-slate-400">
            <button className="inline-flex items-center gap-2 hover:text-slate-700">
              <MessageCircle className="h-4 w-4" /> {comments}
            </button>
            <button className="inline-flex items-center gap-2 hover:text-slate-700">
              <Share2 className="h-4 w-4" /> {shares}
            </button>
            <button className="inline-flex items-center gap-2 hover:text-slate-700">
              <Star className="h-4 w-4" /> {stars}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
