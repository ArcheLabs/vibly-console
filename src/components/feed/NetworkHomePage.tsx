"use client";

import { useCallback, useMemo, useState } from "react";
import { useNetworkFeed } from "@/lib/query/hooks";
import { NetworkFeed } from "./NetworkFeed";
import { TrendingOrganizations, AgentLeaderboard, RiskSummary } from "./NetworkWidgets";

export function NetworkHomePage() {
  const [limit, setLimit] = useState(50);
  const { data, isLoading, isFetching, error } = useNetworkFeed(limit);
  const hasMore = useMemo(() => {
    const count = data?.data.length ?? 0;
    return count >= limit && limit < 200;
  }, [data, limit]);
  const loadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    setLimit((value) => Math.min(value + 50, 200));
  }, [hasMore, isFetching]);

  return (
    <div className="grid grid-cols-12 gap-0 bg-[var(--surface)]">
      <NetworkFeed
        className="col-span-12 lg:col-span-8"
        data={data}
        isLoading={isLoading}
        isLoadingMore={isFetching && !isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        error={error}
      />

      <aside className="hidden space-y-5 bg-[var(--background)] px-5 py-6 lg:col-span-4 lg:block">
        <TrendingOrganizations />
        <AgentLeaderboard />
        <RiskSummary />
      </aside>
    </div>
  );
}
