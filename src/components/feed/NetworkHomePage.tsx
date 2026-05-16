"use client";

import { useCallback, useMemo, useState } from "react";
import { useNetworkFeed, useNetworkOrganizations } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";
import { NetworkFeed } from "./NetworkFeed";
import { TrendingOrganizations, AgentLeaderboard, RiskSummary } from "./NetworkWidgets";

export function NetworkHomePage() {
  const [limit, setLimit] = useState(50);
  const { data, isLoading, isFetching, error } = useNetworkFeed(limit);
  const orgsQuery = useNetworkOrganizations(100);
  const organizationNames = useMemo(() => {
    const entries = (orgsQuery.data?.data ?? []).flatMap((org: Entity) => {
      const id = String(org.id ?? "");
      const name = String(org.name ?? org.displayName ?? "");
      return id && name ? [[id, name] as const] : [];
    });
    return Object.fromEntries(entries);
  }, [orgsQuery.data]);
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
        organizationNames={organizationNames}
      />

      <aside className="hidden bg-[var(--background)] px-5 py-6 lg:col-span-4 lg:block">
        <div className="sticky top-6 space-y-5">
          <TrendingOrganizations />
          <AgentLeaderboard />
          <RiskSummary />
        </div>
      </aside>
    </div>
  );
}
