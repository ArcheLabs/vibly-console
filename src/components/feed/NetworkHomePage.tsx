"use client";

import { useNetworkFeed } from "@/lib/query/hooks";
import { NetworkFeed } from "./NetworkFeed";
import { TrendingOrganizations, AgentLeaderboard, RiskSummary } from "./NetworkWidgets";

export function NetworkHomePage() {
  const { data, isLoading, error } = useNetworkFeed(100);

  return (
    <div className="grid grid-cols-12 gap-0 bg-white">
      <NetworkFeed data={data} isLoading={isLoading} error={error} />

      <aside className="col-span-4 space-y-5 bg-slate-50 px-5 py-6">
        <TrendingOrganizations />
        <AgentLeaderboard />
        <RiskSummary />
      </aside>
    </div>
  );
}
