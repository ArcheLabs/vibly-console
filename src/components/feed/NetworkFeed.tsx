"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, ChevronDown, ChevronRight } from "lucide-react";
import { FeedFilters, type FeedFilter } from "./FeedFilters";
import { FeedItem } from "./FeedItem";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import type { Entity, Page } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import { isContentEvent } from "@/lib/entities/display";
import { feedEventId, feedEventType } from "@/lib/feed/normalize";

const TYPE_MAP: Record<string, string> = {
  organization: "organization",
  observation: "observation",
  proposal: "proposal",
  task: "task",
  artifact: "artifact",
  voting: "voting",
  reward: "reward",
  risk: "risk",
};

function matchesFilter(item: Entity, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  const target = TYPE_MAP[filter] ?? "";
  const type = feedEventType(item).toLowerCase();
  return type.includes(target);
}

type FeedSegment =
  | { type: "content"; item: Entity; key: string }
  | { type: "notifications"; items: Entity[]; key: string };

function isNotification(item: Entity): boolean {
  return !isContentEvent(item);
}

function segmentFeed(items: Entity[]): FeedSegment[] {
  const segments: FeedSegment[] = [];
  let notificationRun: Entity[] = [];

  const flushNotifications = () => {
    if (!notificationRun.length) return;
    const first = notificationRun[0];
    segments.push({
      type: "notifications",
      items: notificationRun,
      key: `notifications:${feedEventId(first) || segments.length}`,
    });
    notificationRun = [];
  };

  items.forEach((item, index) => {
    if (isNotification(item)) {
      notificationRun.push(item);
      return;
    }
    flushNotifications();
    segments.push({ type: "content", item, key: feedEventId(item) || `idx:${index}` });
  });
  flushNotifications();
  return segments;
}

export function NetworkFeed({
  data,
  isLoading,
  error,
  className = "",
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  organizationNames,
  projectNames,
}: {
  data: Page<Entity> | undefined;
  isLoading: boolean;
  error: unknown;
  className?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  organizationNames?: EntityNameMap;
  projectNames?: EntityNameMap;
}) {
  const t = useTranslations("feed");
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all");
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => {
    if (!data?.data) return [];
    const seen = new Set<string>();
    return data.data.filter((item, index) => {
      const key = feedEventId(item) || `idx:${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return matchesFilter(item, activeFilter);
    });
  }, [data, activeFilter]);

  const segments = useMemo(() => segmentFeed(items), [items]);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "360px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div className={`min-h-screen border-x border-[var(--border)] bg-[var(--surface)] ${className}`}>
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/92 px-5 py-4 backdrop-blur-xl">
        <FeedFilters active={activeFilter} onChange={setActiveFilter} />
      </div>

      {isLoading && (
        <div className="p-6">
          <LoadingState label={t("loading")} />
        </div>
      )}

      {!isLoading && !!error && (
        <div className="p-6">
          <ErrorState error={error} title={t("errorTitle")} />
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="p-6">
          <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="divide-y divide-[var(--border)]">
          {segments.map((segment) => {
            if (segment.type === "content") {
              return (
                <FeedItem
                  key={segment.key}
                  item={segment.item}
                  organizationNames={organizationNames}
                  projectNames={projectNames}
                />
              );
            }

            const expanded = expandedNotifications.has(segment.key);
            return (
              <div key={segment.key}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 bg-[var(--surface)] px-5 py-3 text-left transition hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    setExpandedNotifications((current) => {
                      const next = new Set(current);
                      if (next.has(segment.key)) next.delete(segment.key);
                      else next.add(segment.key);
                      return next;
                    });
                  }}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] ring-1 ring-[var(--border)]">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-[var(--text)]">
                    {t("notificationGroup", { count: segment.items.length })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    {expanded ? t("collapseNotifications") : t("expandNotifications")}
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                </button>
                {expanded ? (
                  <div className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface-muted)]/40">
                    {segment.items.map((item, idx) => (
                      <FeedItem
                        key={feedEventId(item) || `${segment.key}:${idx}`}
                        item={item}
                        organizationNames={organizationNames}
                        projectNames={projectNames}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {isLoadingMore ? (
        <div className="px-6 pb-6">
          <LoadingState label={t("loadingMore")} />
        </div>
      ) : null}
    </div>
  );
}
