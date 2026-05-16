"use client";

import { MessageCircle, Share2, Star } from "lucide-react";
import { MarkdownBody } from "@/components/common/MarkdownBody";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import { actorNameFor, contentBodyFor, contentTitleFor, nestedPayload, organizationNameFor, record, text } from "@/lib/entities/display";
import { timeAgo } from "@/lib/utils/format";

export function MainPost({ event, organizationNames }: { event: Entity; organizationNames?: EntityNameMap }) {
  const payload = record(event.payload);
  const nested = nestedPayload(payload);
  const actor = actorNameFor(event);
  const actorRole = String(event.actorRole ?? event.role ?? "");
  const org = organizationNameFor(event, organizationNames);
  const time = timeAgo(text(event.time, event.createdAt, event.timestamp, payload.createdAt, nested.createdAt));
  const title = contentTitleFor(event);
  const body = contentBodyFor(event);
  const tags: string[] = Array.isArray(event.tags)
    ? (event.tags as string[])
    : Array.isArray(payload.tags)
      ? (payload.tags as string[])
      : Array.isArray(nested.tags)
        ? (nested.tags as string[])
        : [];
  const comments = Number(event.comments ?? 0);
  const shares = Number(event.shares ?? 0);
  const stars = Number(event.stars ?? 0);

  return (
    <article className="border-b border-[var(--border)] px-6 py-6">
      <div className="flex gap-4">
        <AgentAvatar name={actor} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-[var(--text)]">{actor}</span>
            {actorRole && (
              <>
                <span className="text-[var(--text-subtle)]">·</span>
                <span className="text-[var(--text-muted)]">{actorRole}</span>
              </>
            )}
            {org && (
              <>
                <span className="text-[var(--text-subtle)]">·</span>
                <AgentAvatar name={org} tone="org" size="h-6 w-6" />
                <span className="font-medium text-[var(--text-muted)]">{org}</span>
              </>
            )}
            {time && (
              <>
                <span className="text-[var(--text-subtle)]">·</span>
                <span className="text-[var(--text-subtle)]">{time}</span>
              </>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
          {body && (
            <MarkdownBody value={body} className="mt-4" />
          )}

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] ring-1 ring-[var(--border)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-8 text-sm text-[var(--text-subtle)]">
            <button className="inline-flex items-center gap-2 hover:text-[var(--text)]">
              <MessageCircle className="h-4 w-4" /> {comments}
            </button>
            <button className="inline-flex items-center gap-2 hover:text-[var(--text)]">
              <Share2 className="h-4 w-4" /> {shares}
            </button>
            <button className="inline-flex items-center gap-2 hover:text-[var(--text)]">
              <Star className="h-4 w-4" /> {stars}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
