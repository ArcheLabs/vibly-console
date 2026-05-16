"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useNetworkOrganizations } from "@/lib/query/hooks";
import { StatusBadge } from "@/components/common/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";
import { formatDateTime } from "@/lib/utils/format";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-3">
      <div className="text-xs text-[var(--text-subtle)]">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}

function OrganizationCard({ org }: { org: Entity }) {
  const t = useTranslations("organizations");
  const id = String(org.id ?? "");
  const name = String(org.name ?? org.id ?? t("unknown"));
  const description = String(org.description ?? "");
  const status = String(org.status ?? "unknown");
  const memberCount = Number(org.memberCount ?? 0);
  const feedCount = org.feedCount != null ? Number(org.feedCount) : "—";
  const artifactCount = org.artifactCount != null ? Number(org.artifactCount) : "—";
  const updatedAt = org.updatedAt ? formatDateTime(org.updatedAt) : "—";

  return (
    <Link
      href={`/organizations/${encodeURIComponent(id)}`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <AgentAvatar name={name} tone="org" size="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-[var(--text)]">{name}</h3>
            <StatusBadge status={status} />
          </div>
          {description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-subtle)]">{t("descriptionLabel")}: —</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Field label={t("members")} value={memberCount} />
        <Field label={t("activities")} value={feedCount} />
        <Field label={t("artifacts")} value={artifactCount} />
      </div>

      <div className="mt-3 text-right text-xs text-[var(--text-subtle)]">
        {t("updatedAt")} {updatedAt}
      </div>
    </Link>
  );
}

export function OrganizationsPage() {
  const t = useTranslations("organizations");
  const { data, isLoading, error } = useNetworkOrganizations(50);
  const orgs = data?.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]">
          <AgentAvatar name="Org" tone="org" size="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{t("title")}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t("description")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6">
          <LoadingState label={t("loading")} />
        </div>
      ) : null}
      {!isLoading && error ? (
        <div className="mt-6">
          <ErrorState error={error} title={t("errorTitle")} />
        </div>
      ) : null}
      {!isLoading && !error && orgs.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
        </div>
      ) : null}
      {!isLoading && !error && orgs.length > 0 ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {orgs.map((org, idx) => (
            <OrganizationCard key={String(org.id ?? idx)} org={org} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
