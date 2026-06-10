"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { useGuardianDecision, useNetworkOrganizations, useSubmitActionIntent } from "@/lib/query/hooks";
import { StatusBadge } from "@/components/common/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import type { Entity } from "@/lib/coordinator/types";
import { formatDateTime } from "@/lib/utils/format";
import { useWalletAuth, type WalletSessionState } from "@/lib/wallet/useWalletAuth";

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
      className="relative block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="absolute right-5 top-5">
        <StatusBadge status={status} />
      </div>
      <div className="flex items-start gap-4">
        <AgentAvatar name={name} tone="org" size="h-11 w-11" />
        <div className="min-w-0 flex-1 pr-24">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-[var(--text)]">{name}</h3>
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

function readCreatedOrganizationId(result: Entity): string {
  const aggregateRef = result.aggregateRef;
  if (aggregateRef && typeof aggregateRef === "object") {
    const id = (aggregateRef as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return "";
}

function CreateOrganizationDialog({
  onClose,
  onCreated,
  refreshSession,
  session,
}: {
  onClose: () => void;
  onCreated: (organizationId: string) => void;
  refreshSession: () => Promise<WalletSessionState | null>;
  session: WalletSessionState | null;
}) {
  const t = useTranslations("organizations.create");
  const submitActionIntent = useSubmitActionIntent();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = submitActionIntent.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || busy) return;
    setError(null);

    // Refresh wallet session before submitting
    const refreshed = await refreshSession();
    if (!refreshed) {
      setError(t("sessionRequired") ?? "Please sign the wallet login challenge before creating an organization.");
      return;
    }

    try {
      const result = await submitActionIntent.mutateAsync({
        type: "CreateOrganization",
        payload: {
          name: trimmedName,
          description: description.trim() || undefined,
        },
        idempotencyKey: `console:create-organization:${Date.now()}`,
      });
      const organizationId = readCreatedOrganizationId(result);
      if (!organizationId) throw new Error(t("missingId"));
      onCreated(organizationId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("submitError"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t("close")} onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">{t("title")}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-xs text-[var(--text-muted)]">{t("name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            placeholder={t("namePlaceholder")}
            autoFocus
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs text-[var(--text-muted)]">{t("description")}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            placeholder={t("descriptionPlaceholder")}
          />
        </label>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-500">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {busy ? t("submitting") : t("submit")}
          </button>
        </div>
      </form>
    </div>
  );
}

export function OrganizationsPage() {
  const t = useTranslations("organizations");
  const router = useRouter();
  const { data, isLoading, error } = useNetworkOrganizations(50);
  const wallet = useWalletAuth();
  const guardian = useGuardianDecision(wallet.session?.address ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const orgs = data?.data ?? [];
  const walletConnected = Boolean(wallet.evmAddress || wallet.polkadotAddress);
  const sessionAuthenticated = Boolean(wallet.session);
  const guardianVerified = Boolean(wallet.session && guardian.data?.isGuardian === true && guardian.data?.stale !== true);

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text)] shadow-sm ring-1 ring-[var(--border)]">
            <AgentAvatar name="Org" tone="org" size="h-9 w-9" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{t("title")}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t("description")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionAuthenticated && !guardianVerified ? (
            <span className="text-xs text-[var(--text-subtle)]">{t("notGuardian")}</span>
          ) : null}
          {walletConnected && !sessionAuthenticated ? (
            <span className="text-xs text-[var(--text-subtle)]">{t("sessionRequired")}</span>
          ) : null}
          {guardianVerified ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("create.button")}
            </button>
          ) : null}
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
      {createOpen && wallet.session ? (
        <CreateOrganizationDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(organizationId) => {
            setCreateOpen(false);
            router.push(`/organizations/${encodeURIComponent(organizationId)}`);
          }}
          refreshSession={wallet.refreshSession}
          session={wallet.session}
        />
      ) : null}
    </div>
  );
}
