"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useNetworkOrganization, useOrganizationFeed } from "@/lib/query/hooks";
import { StatusBadge, RoleBadge } from "@/components/common/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { NetworkFeed } from "@/components/feed/NetworkFeed";
import { JsonViewer } from "@/components/common/JsonViewer";
import type { Entity } from "@/lib/coordinator/types";
import { formatDateTime } from "@/lib/utils/format";

const TABS = ["feed", "handbook", "members"] as const;
type OrganizationTab = (typeof TABS)[number];

function asArray(value: unknown): Entity[] {
  return Array.isArray(value) ? (value as Entity[]) : [];
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <div className="text-xs text-[var(--text-subtle)]">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

export function OrganizationPage({ orgId }: { orgId: string }) {
  const t = useTranslations("organizations");
  const [tab, setTab] = useState<OrganizationTab>("feed");
  const [feedLimit, setFeedLimit] = useState(50);
  const { data: org, isLoading, error } = useNetworkOrganization(orgId);
  const feedQuery = useOrganizationFeed(orgId, feedLimit);
  const hasMore = useMemo(() => {
    const count = feedQuery.data?.data.length ?? 0;
    return count >= feedLimit && feedLimit < 200;
  }, [feedLimit, feedQuery.data]);
  const loadMore = useCallback(() => {
    if (feedQuery.isFetching || !hasMore) return;
    setFeedLimit((value) => Math.min(value + 50, 200));
  }, [feedQuery.isFetching, hasMore]);

  if (isLoading) return <div className="p-8"><LoadingState label={t("loading")} /></div>;
  if (error || !org) return <div className="p-8"><ErrorState error={error ?? new Error("Not found")} title={t("errorTitle")} /></div>;

  const name = String(org.name ?? org.id ?? t("unknown"));
  const description = String(org.description ?? "");
  const status = String(org.status ?? "unknown");
  const members = asArray(org.members);
  const authorities = asArray(org.authorities);
  const handbook = org.handbook && typeof org.handbook === "object" ? org.handbook : null;
  const createdAt = org.createdAt ? formatDateTime(org.createdAt) : "—";
  const updatedAt = org.updatedAt ? formatDateTime(org.updatedAt) : "—";
  const organizationNames = { [orgId]: name };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <AgentAvatar name={name} tone="org" size="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">{name}</h1>
            {description ? <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Stat label={t("members")} value={members.length} />
          <Stat label={t("authorities")} value={authorities.length} />
          <Stat label={t("createdAt")} value={createdAt} />
          <Stat label={t("updatedAt")} value={updatedAt} />
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-[var(--border)]">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`px-4 py-3 text-sm font-medium transition ${
              tab === item
                ? "border-b-2 border-[var(--accent)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t(`tabs.${item}`)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "feed" ? (
          <NetworkFeed
            className="rounded-2xl"
            data={feedQuery.data}
            isLoading={feedQuery.isLoading}
            isLoadingMore={feedQuery.isFetching && !feedQuery.isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            error={feedQuery.error}
            organizationNames={organizationNames}
          />
        ) : null}

        {tab === "handbook" ? (
          handbook ? <JsonViewer value={handbook} /> : <EmptyState title={t("handbookEmpty")} />
        ) : null}

        {tab === "members" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">{t("members")}</h2>
              <div className="mt-4 space-y-3">
                {members.length === 0 ? <p className="text-sm text-[var(--text-subtle)]">{t("membersEmpty")}</p> : null}
                {members.map((member, idx) => {
                  const memberName = String(member.displayName ?? member.name ?? member.principalId ?? member.id ?? "");
                  return (
                    <div key={String(member.id ?? member.principalId ?? idx)} className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-3">
                      <AgentAvatar name={memberName} size="h-9 w-9" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[var(--text)]">{memberName || "—"}</div>
                        <div className="truncate text-xs text-[var(--text-muted)]">{String(member.principalId ?? member.id ?? "")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">{t("authorities")}</h2>
              <div className="mt-4 space-y-3">
                {authorities.length === 0 ? <p className="text-sm text-[var(--text-subtle)]">{t("membersEmpty")}</p> : null}
                {authorities.map((authority, idx) => (
                  <div key={String(authority.id ?? authority.principalId ?? idx)} className="rounded-xl bg-[var(--surface-muted)] p-3">
                    <div className="font-medium text-[var(--text)]">{String(authority.principalId ?? authority.id ?? "—")}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <RoleBadge role={authority.role ?? authority.scope ?? "authority"} />
                      {authority.status ? <StatusBadge status={authority.status} /> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
