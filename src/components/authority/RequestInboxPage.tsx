"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { StatusBadge, RiskBadge } from "@/components/common/Badge";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";

const FILTERS = ["全部", "待处理", "高风险", "已完成"] as const;
type Filter = (typeof FILTERS)[number];

function formatTime(value: unknown): string {
  if (!value) return "";
  try {
    return new Date(String(value)).toLocaleString("zh-CN", { timeStyle: "short", dateStyle: "short" });
  } catch {
    return String(value);
  }
}

function matchesFilter(req: Entity, filter: Filter): boolean {
  if (filter === "全部") return true;
  const status = String(req.status ?? "").toLowerCase();
  const risk = String(req.risk ?? req.riskLevel ?? "").toLowerCase();
  if (filter === "待处理") return ["pending", "open", "awaiting"].some((s) => status.includes(s));
  if (filter === "高风险") return ["high", "critical"].some((r) => risk.includes(r));
  if (filter === "已完成") return ["completed", "resolved", "closed", "done"].some((s) => status.includes(s));
  return true;
}

function RequestCard({ req }: { req: Entity }) {
  const title = String(req.title ?? req.type ?? req.requestType ?? req.consoleKind ?? "请求");
  const actor = String(req.guardianId ?? req.requestedBy ?? req.actorId ?? req.actor ?? "");
  const time = formatTime(req.createdAt ?? req.timestamp);
  const status = String(req.status ?? "open");
  const risk = String(req.risk ?? req.riskLevel ?? "");
  const reason = String(req.reason ?? req.description ?? "");
  const targetRef = String(req.objectRef ?? req.id ?? "");
  const projectId = String(req.projectId ?? "");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{title}</span>
            <StatusBadge status={status} />
            {risk && <RiskBadge risk={risk} />}
          </div>
          {actor && (
            <div className="mt-2 flex items-center gap-2">
              <AgentAvatar name={actor} size="h-6 w-6" />
              <span className="text-sm text-slate-500">{actor}</span>
              {time && <span className="text-xs text-slate-400">{time}</span>}
            </div>
          )}
          {reason && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{reason}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {targetRef && !["undefined", "null"].includes(targetRef) && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-600">
                {targetRef}
              </span>
            )}
            {projectId && !["undefined", "null"].includes(projectId) && (
              <Link
                href={`/projects/${projectId}`}
                className="rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100"
              >
                {projectId} →
              </Link>
            )}
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
      </div>
    </div>
  );
}

export function RequestInboxPage() {
  const [filter, setFilter] = useState<Filter>("全部");
  const client = useCoordinatorClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.guardianRequests,
    queryFn: () => client.listGuardianRequests(undefined, { limit: 100 }),
  });

  const items: Entity[] = (data?.data ?? []).filter((r) => matchesFilter(r as Entity, filter)) as Entity[];

  return (
    <div className="mx-auto max-w-3xl px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-slate-700" />
        <h1 className="text-2xl font-semibold">Guardian 请求收件箱</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState label="加载请求列表..." />}
      {error && !isLoading && (
        <ErrorState error={error} title="无法加载 Guardian 请求" />
      )}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="暂无请求" />
      )}

      <div className="space-y-4">
        {items.map((req, idx) => (
          <RequestCard key={String((req as Entity).id ?? idx)} req={req} />
        ))}
      </div>
    </div>
  );
}
