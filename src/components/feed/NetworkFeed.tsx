"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FeedFilters, type FeedFilter } from "./FeedFilters";
import { FeedItem } from "./FeedItem";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import type { Entity, Page } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
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
          {items.map((item, idx) => (
            <FeedItem key={feedEventId(item) || `idx:${idx}`} item={item} organizationNames={organizationNames} projectNames={projectNames} />
          ))}
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
