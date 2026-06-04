"use client";

import { useMemo, useState } from "react";
import { Coins, ShieldCheck } from "lucide-react";
import { useApproveTaskReward, useCreateTaskRewardSuggestion, useProjects, useTaskV2 } from "@/lib/query/hooks";
import { LoadingState, ErrorState } from "@/components/common/States";
import { MainPost } from "@/components/feed/MainPost";
import { ObjectSummary } from "@/components/feed/ObjectSummary";
import { ContextPanel } from "@/components/coordination/ContextPanel";
import { GuardianActionsPanel } from "@/components/authority/GuardianActionsPanel";
import type { Entity } from "@/lib/coordinator/types";
import { entityNameMap } from "@/lib/entities/display";
import { useActiveNetworkProfile } from "@/lib/network/profiles";
import { useWalletAuth } from "@/lib/wallet/useWalletAuth";

const DIFFICULTIES = ["easy", "normal", "hard", "critical"] as const;
type RewardDifficulty = typeof DIFFICULTIES[number];

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const { data, isLoading, error } = useTaskV2(taskId);
  const suggestReward = useCreateTaskRewardSuggestion();
  const approveReward = useApproveTaskReward();
  const projectsQuery = useProjects(200);
  const network = useActiveNetworkProfile();
  const wallet = useWalletAuth();
  const [difficulty, setDifficulty] = useState<RewardDifficulty>("normal");
  const [rationale, setRationale] = useState("");
  const projectNames = useMemo(() => {
    return entityNameMap((projectsQuery.data?.data ?? []) as Entity[]);
  }, [projectsQuery.data]);

  if (isLoading) return <div className="p-8"><LoadingState label="加载任务中..." /></div>;
  if (error || !data) return <div className="p-8"><ErrorState error={error ?? new Error("Not found")} title="无法加载任务" /></div>;

  const event = data as Entity;
  const targetRef = String(event.id ?? taskId);
  const rewardSuggestions = Array.isArray(event.rewardSuggestions) ? event.rewardSuggestions.map((item) => item as Entity) : [];
  const rewardApproval = asRecord(event.taskRewardApproval);
  const rewardSettlement = asRecord(event.taskRewardSettlement);
  const rewardsEnabled = network.features?.rewards !== false;
  const latestPendingSuggestion = [...rewardSuggestions].reverse().find((suggestion) => String(suggestion.status ?? "pending") === "pending");
  const hasApprovedReward = Boolean(rewardApproval.id || event.approvedDifficulty);
  const canSuggestReward = rewardsEnabled && Boolean(wallet.session) && !hasApprovedReward;
  const canApproveReward = rewardsEnabled && Boolean(wallet.session) && Boolean(latestPendingSuggestion?.id) && !hasApprovedReward;
  const rewardActionError = suggestReward.error ?? approveReward.error;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-12 gap-6 px-6 py-6">
      <section className="col-span-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <MainPost event={event} />
        <ObjectSummary event={event} />
      </section>
      <section className="col-span-4">
        <ContextPanel event={event} timeline={[]} chain={[]} projectNames={projectNames}>
          {rewardsEnabled ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Coins className="h-4 w-4 text-emerald-600" />
              Task reward
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div>Approved difficulty: <span className="font-semibold text-slate-900">{String(event.approvedDifficulty ?? rewardApproval.difficulty ?? "pending")}</span></div>
              <div>Settled reward: <span className="font-semibold text-emerald-700">{String(rewardSettlement.amount ?? "not settled")}</span></div>
              {rewardSuggestions.length ? (
                <div className="space-y-2 pt-1">
                  {rewardSuggestions.slice(-2).map((suggestion) => (
                    <div key={String(suggestion.id ?? Math.random())} className="rounded-xl bg-slate-50 p-3">
                      <div className="font-medium text-slate-900">{String(suggestion.difficulty ?? "normal")}</div>
                      <div className="text-xs text-slate-500">{String(suggestion.rationale ?? "")}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDifficulty(item)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize ${
                      difficulty === item
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:border-emerald-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <textarea
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
                placeholder="Why does this task deserve this difficulty?"
                className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                onClick={() => suggestReward.mutate({ taskId, body: { difficulty, rationale: rationale.trim() || undefined } })}
                disabled={!canSuggestReward || suggestReward.isPending}
              >
                Suggest {difficulty} reward
              </button>
              {latestPendingSuggestion?.id ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  onClick={() => approveReward.mutate({ taskId, body: { approvedTaskRewardSuggestionId: String(latestPendingSuggestion.id) } })}
                  disabled={!canApproveReward || approveReward.isPending}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Approve latest suggestion
                </button>
              ) : null}
            </div>
            {rewardActionError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {rewardActionError instanceof Error
                  ? rewardActionError.message
                  : "Reward action failed."}
              </div>
            ) : null}
          </div>
          ) : null}
          <GuardianActionsPanel targetRef={targetRef} />
        </ContextPanel>
      </section>
    </div>
  );
}

function asRecord(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}
