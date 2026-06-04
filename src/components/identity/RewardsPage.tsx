"use client";

import { Coins, Layers3, Trophy } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/common/States";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAgentRewards, useRewardDays, useTaskRewards } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";
import { useActiveNetworkProfile } from "@/lib/network/profiles";

function asRecord(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}

function asArray(value: unknown): Entity[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

export function RewardsPage() {
  const network = useActiveNetworkProfile();
  const rewardsEnabled = network.features?.rewards !== false;
  const rewardLedgers = useAgentRewards(undefined, 100, rewardsEnabled);
  const rewardDays = useRewardDays(20, rewardsEnabled);
  const taskRewards = useTaskRewards({ limit: 50, enabled: rewardsEnabled });

  if (!rewardsEnabled) {
    return (
      <div className="px-4 py-6 sm:px-8">
        <PageHeader icon={Coins} title="Rewards" description="Protocol rewards are not enabled for the selected network." />
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)] p-6 text-sm text-[var(--text-muted)]">
          Switch to a network manifest with <span className="font-mono">features.rewards=true</span> to view V1 incentive testnet rewards.
        </div>
      </div>
    );
  }

  if (rewardLedgers.isLoading || rewardDays.isLoading || taskRewards.isLoading) {
    return <div className="p-8"><LoadingState label="Loading rewards..." /></div>;
  }
  if (rewardLedgers.error || rewardDays.error || taskRewards.error) {
    return <div className="p-8"><ErrorState error={rewardLedgers.error ?? rewardDays.error ?? taskRewards.error ?? new Error("Unknown")} title="Unable to load rewards" /></div>;
  }

  const ledgers = rewardLedgers.data?.data ?? [];
  const days = rewardDays.data?.data ?? [];
  const tasks = taskRewards.data?.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-8">
      <PageHeader icon={Coins} title="Rewards" description="View chain-synced staking rewards, task rewards, and recent reward-day budgets." />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
            <Layers3 className="h-5 w-5 text-[var(--accent)]" />
            Reward ledgers
          </div>
          <div className="space-y-3">
            {ledgers.length ? ledgers.map((item) => {
              const row = asRecord(item);
              return (
                <div key={String(row.id ?? Math.random())} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--text)]">{String(row.principalId ?? row.chainAgentId ?? "agent")}</div>
                      <div className="font-mono text-xs text-[var(--text-subtle)]">{String(row.identityId ?? "")}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-subtle)]">Claimable</div>
                      <div className="text-xl font-semibold text-[var(--accent)]">{String(row.claimableTotal ?? "0")}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-4">
                    <div>Base: <span className="font-semibold text-[var(--text)]">{String(row.claimableBase ?? "0")}</span></div>
                    <div>Observer: <span className="font-semibold text-[var(--text)]">{String(row.claimableObserver ?? "0")}</span></div>
                    <div>Reviewer: <span className="font-semibold text-[var(--text)]">{String(row.claimableReviewer ?? "0")}</span></div>
                    <div>Task: <span className="font-semibold text-[var(--text)]">{String(row.claimableTask ?? "0")}</span></div>
                  </div>
                </div>
              );
            }) : <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">No reward ledgers synced yet.</div>}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
              <Trophy className="h-5 w-5 text-[var(--accent)]" />
              Task rewards
            </div>
            <div className="space-y-3">
              {tasks.length ? tasks.slice(0, 10).map((item) => {
                const row = asRecord(item);
                return (
                  <div key={String(row.id ?? Math.random())} className="rounded-xl bg-[var(--surface)] p-4">
                    <div className="font-semibold text-[var(--text)]">{String(row.taskId ?? "task")}</div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">
                      Difficulty <span className="font-semibold text-[var(--text)]">{String(row.difficulty ?? "normal")}</span> · Reward <span className="font-semibold text-[var(--accent)]">{String(row.amount ?? "0")}</span>
                    </div>
                  </div>
                );
              }) : <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No task rewards settled yet.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
            <div className="mb-4 text-lg font-semibold text-[var(--text)]">Reward days</div>
            <div className="space-y-3">
              {days.length ? days.slice(0, 10).map((item) => {
                const row = asRecord(item);
                return (
                  <div key={String(row.id ?? Math.random())} className="rounded-xl bg-[var(--surface)] p-4 text-sm">
                    <div className="font-semibold text-[var(--text)]">Day {String(row.dayIndex ?? "0")}</div>
                    <div className="mt-1 text-[var(--text-muted)]">Base released {String(row.baseStakingReleased ?? "0")} · Task released {String(row.taskMarketReleased ?? "0")}</div>
                    <div className="text-[var(--text-subtle)]">Rollover base {String(row.rolloverBaseStaking ?? "0")} · Rollover task {String(row.rolloverTaskMarket ?? "0")}</div>
                  </div>
                );
              }) : <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-muted)]">No reward-day snapshots synced yet.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
