"use client";

import { useMemo, useState } from "react";
import { FeedFilters, type FeedFilter } from "./FeedFilters";
import { FeedItem } from "./FeedItem";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import type { Entity, Page } from "@/lib/coordinator/types";

const TYPE_MAP: Record<string, string> = {
  组织: "organization",
  观察: "observation",
  提案: "proposal",
  任务: "task",
  成果: "artifact",
  投票: "voting",
  奖励: "reward",
  风险: "risk",
};

function matchesFilter(item: Entity, filter: FeedFilter): boolean {
  if (filter === "全部") return true;
  const target = TYPE_MAP[filter] ?? "";
  const type = String(item.eventType ?? item.type ?? "").toLowerCase();
  return type.includes(target);
}

export function NetworkFeed({
  data,
  isLoading,
  error,
}: {
  data: Page<Entity> | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("全部");

  const items = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item) => matchesFilter(item, activeFilter));
  }, [data, activeFilter]);

  return (
    <div className="col-span-8 min-h-screen border-x border-slate-100 bg-white">
      <div className="sticky top-14 z-10 border-b border-slate-100 bg-white/90 px-5 py-4 backdrop-blur-xl">
        <FeedFilters active={activeFilter} onChange={setActiveFilter} />
      </div>

      {isLoading && (
        <div className="p-6">
          <LoadingState label="加载动态中..." />
        </div>
      )}

      {!isLoading && !!error && (
        <div className="p-6">
          <ErrorState error={error} title="无法加载动态" />
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="p-6">
          <EmptyState title="暂无动态" body="当前筛选条件下没有内容。" />
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <FeedItem key={String(item.id ?? item.feedEventId ?? idx)} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
