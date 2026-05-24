"use client";

import { useCallback, useMemo, useState } from "react";
import { Rss } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNetworkFeed, useNetworkOrganizations, useProjects } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";
import { entityNameMap } from "@/lib/entities/display";
import { PageHeader } from "@/components/layout/PageHeader";
import { NetworkFeed } from "./NetworkFeed";
import { TrendingOrganizations, AgentLeaderboard, RiskSummary } from "./NetworkWidgets";

export function NetworkHomePage() {
  const t = useTranslations("feed");
  const [limit, setLimit] = useState(50);
  const { data, isLoading, isFetching, error } = useNetworkFeed(limit);
  const orgsQuery = useNetworkOrganizations(100);
  const projectsQuery = useProjects(200);
  const organizationNames = useMemo(() => {
    return entityNameMap((orgsQuery.data?.data ?? []) as Entity[]);
  }, [orgsQuery.data]);
  const projectNames = useMemo(() => {
    return entityNameMap((projectsQuery.data?.data ?? []) as Entity[]);
  }, [projectsQuery.data]);
  const hasMore = useMemo(() => {
    const count = data?.data.length ?? 0;
    return count >= limit && limit < 200;
  }, [data, limit]);
  const loadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    setLimit((value) => Math.min(value + 50, 200));
  }, [hasMore, isFetching]);

  return (
    <div>
      <div className="border-b border-[var(--border)] px-4 py-6 sm:px-8">
        <PageHeader icon={Rss} title={t("pageTitle")} description={t("pageDescription")} />
      </div>
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
        projectNames={projectNames}
      />

      <aside className="hidden bg-[var(--background)] px-5 py-6 lg:col-span-4 lg:block">
        <div className="sticky top-6 space-y-5">
          <TrendingOrganizations />
          <AgentLeaderboard />
          <RiskSummary />
        </div>
      </aside>
    </div>
    </div>
  );
}
