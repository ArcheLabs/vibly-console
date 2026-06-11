"use client";

import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGuardianDecision, useNetworkOrganization, useOrganizationFeed, useProjects, useSubmitActionIntent } from "@/lib/query/hooks";
import { StatusBadge, RoleBadge } from "@/components/common/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/States";
import { AgentAvatar } from "@/components/domain/AgentAvatar";
import { NetworkFeed } from "@/components/feed/NetworkFeed";
import { DetailPageHeader } from "@/components/layout/DetailPageHeader";
import type { Entity } from "@/lib/coordinator/types";
import { entityNameMap } from "@/lib/entities/display";
import { formatDateTime } from "@/lib/utils/format";
import { useWalletAuth, type WalletSessionState } from "@/lib/wallet/useWalletAuth";

const TABS = ["feed", "projects", "handbook", "members"] as const;
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

function projectOrganizationId(project: Entity): string {
  const metadata = project.metadata && typeof project.metadata === "object"
    ? (project.metadata as Record<string, unknown>)
    : {};
  return String(
    project.organizationId ??
    metadata.organizationId ??
    "",
  );
}

function ProjectCard({ project }: { project: Entity }) {
  const id = String(project.id ?? "");
  const name = String(project.name ?? project.slug ?? project.id ?? "Project");
  const description = String(project.description ?? "");
  const status = String(project.status ?? "unknown");
  const slug = project.slug ? String(project.slug) : "";
  const updatedAt = project.updatedAt ? formatDateTime(project.updatedAt) : "—";

  return (
    <Link
      href={`/projects/${encodeURIComponent(id)}`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <AgentAvatar name={name} tone="org" size="h-11 w-11" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-[var(--text)]">{name}</h3>
            {slug ? <p className="mt-1 truncate text-xs text-[var(--text-subtle)]">{slug}</p> : null}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {description ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
      <div className="mt-4 text-right text-xs text-[var(--text-subtle)]">{updatedAt}</div>
    </Link>
  );
}

function readCreatedProjectId(result: Entity): string {
  const aggregateRef = result.aggregateRef;
  if (aggregateRef && typeof aggregateRef === "object") {
    const id = (aggregateRef as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return "";
}

function handbookSection(title: string, content: unknown): string | null {
  if (content === null || content === undefined) return null;
  if (typeof content === "string" && !content.trim()) return null;
  const body = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  return [`## ${title}`, "", body].join("\n");
}

function HandbookViewer({ handbook }: { handbook: unknown }) {
  const t = useTranslations("organizations");
  const h = handbook && typeof handbook === "object" ? (handbook as Record<string, unknown>) : null;
  if (!h || Object.keys(h).length === 0) return <EmptyState title={t("handbookEmpty")} />;

  const sections = Object.entries(h)
    .map(([key, value]) => handbookSection(key, value))
    .filter(Boolean) as string[];

  if (sections.length === 0) return <EmptyState title={t("handbookEmpty")} />;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="prose prose-sm max-w-none">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-6 last:mb-0">
            {section.split("\n").map((line, lineIdx) => {
              if (line.startsWith("## ")) return <h3 key={lineIdx} className="text-lg font-semibold text-[var(--text)]">{line.slice(3)}</h3>;
              if (line.startsWith("# ")) return <h2 key={lineIdx} className="text-xl font-semibold text-[var(--text)]">{line.slice(2)}</h2>;
              return <p key={lineIdx} className="text-sm text-[var(--text-muted)]">{line || "\u00A0"}</p>;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function hasOrgAdminAccess(org: Entity, principalId?: string | null): boolean {
  if (!principalId) return false;
  const members = asArray(org.members);
  const authorities = asArray(org.authorities);
  const adminRoles = new Set(["admin", "owner"]);
  return (
    members.some((member) =>
      String(member.principalId ?? member.id ?? "") === principalId &&
      adminRoles.has(String(member.role ?? "").toLowerCase())
    ) ||
    authorities.some((authority) =>
      String(authority.principalId ?? authority.id ?? "") === principalId &&
      String(authority.authority ?? authority.scope ?? authority.role ?? "") === "approve-resource-creation"
    )
  );
}

function CreateProjectDialog({
  orgId,
  onClose,
  onCreated,
  refreshSession,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
  refreshSession: () => Promise<WalletSessionState | null>;
}) {
  const t = useTranslations("organizations.createProject");
  const submitActionIntent = useSubmitActionIntent();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = submitActionIntent.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSlug = slug.trim();
    const trimmedName = name.trim();
    if (!trimmedSlug || !trimmedName || busy) return;
    setError(null);

    const refreshed = await refreshSession();
    if (!refreshed) {
      setError(t("sessionRequired"));
      return;
    }

    try {
      const result = await submitActionIntent.mutateAsync({
        type: "CreateProject",
        payload: {
          organizationId: orgId,
          slug: trimmedSlug,
          name: trimmedName,
          description: description.trim() || undefined,
          metadata: { organizationId: orgId, source: "console" },
        },
        idempotencyKey: `console:create-project:${orgId}:${trimmedSlug}:${Date.now()}`,
      });
      const projectId = readCreatedProjectId(result);
      if (!projectId) throw new Error(t("missingId"));
      onCreated(projectId);
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
          <span className="text-xs text-[var(--text-muted)]">{t("slug")}</span>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            placeholder={t("slugPlaceholder")}
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
            disabled={busy || !slug.trim() || !name.trim()}
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

export function OrganizationPage({ orgId }: { orgId: string }) {
  const t = useTranslations("organizations");
  const router = useRouter();
  const [tab, setTab] = useState<OrganizationTab>("feed");
  const [feedLimit, setFeedLimit] = useState(50);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const { data: org, isLoading, error } = useNetworkOrganization(orgId);
  const feedQuery = useOrganizationFeed(orgId, feedLimit);
  const projectsQuery = useProjects(200);
  const wallet = useWalletAuth();
  const guardian = useGuardianDecision(wallet.session?.address ?? null);
  const hasMore = useMemo(() => {
    const count = feedQuery.data?.data.length ?? 0;
    return count >= feedLimit && feedLimit < 200;
  }, [feedLimit, feedQuery.data]);
  const loadMore = useCallback(() => {
    if (feedQuery.isFetching || !hasMore) return;
    setFeedLimit((value) => Math.min(value + 50, 200));
  }, [feedQuery.isFetching, hasMore]);
  const projectNames = useMemo(() => {
    return entityNameMap((projectsQuery.data?.data ?? []) as Entity[]);
  }, [projectsQuery.data]);
  const organizationProjects = useMemo(() => {
    return ((projectsQuery.data?.data ?? []) as Entity[]).filter((project) => projectOrganizationId(project) === orgId);
  }, [orgId, projectsQuery.data]);

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
  const sessionAddress = wallet.session?.address ?? null;
  const guardianVerified = Boolean(wallet.session && guardian.data?.isGuardian === true && guardian.data?.stale !== true);
  const orgAdminVerified = hasOrgAdminAccess(org, sessionAddress);
  const canCreateProject = status === "active" && Boolean(wallet.session) && (guardianVerified || orgAdminVerified);

  return (
    <div className="w-full py-6">
      <DetailPageHeader
        breadcrumbs={[
          { label: "Vibly", href: "/" },
          { label: t("title"), href: "/organizations" },
          { label: name },
        ]}
        icon={Building2}
        title={name}
        description={description || t("description")}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5 min-w-0 flex-1">
            <AgentAvatar name={name} tone="org" size="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{name}</h1>
              {description ? <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <StatusBadge status={status} />
            {canCreateProject ? (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm"
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus className="h-4 w-4" />
                {t("createProject.button")}
              </button>
            ) : null}
            {wallet.session && status === "active" && !guardianVerified && !orgAdminVerified ? (
              <span className="max-w-56 text-right text-xs text-[var(--text-subtle)]">{t("createProject.notAuthorized")}</span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-subtle)]">
          <span>{t("members")}: {members.length}</span>
          <span>{t("authorities")}: {authorities.length}</span>
          <span>{t("createdAt")}: {createdAt}</span>
          <span>{t("updatedAt")}: {updatedAt}</span>
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
            projectNames={projectNames}
          />
        ) : null}

        {tab === "projects" ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            {projectsQuery.isLoading ? <LoadingState label={t("projectsLoading")} /> : null}
            {!projectsQuery.isLoading && projectsQuery.error ? <ErrorState error={projectsQuery.error} title={t("projectsErrorTitle")} /> : null}
            {!projectsQuery.isLoading && !projectsQuery.error && organizationProjects.length === 0 ? (
              <EmptyState title={t("projectsEmpty")} />
            ) : null}
            {!projectsQuery.isLoading && !projectsQuery.error && organizationProjects.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {organizationProjects.map((project, idx) => (
                  <ProjectCard key={String(project.id ?? idx)} project={project} />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "handbook" ? (
          handbook ? <HandbookViewer handbook={handbook} /> : <EmptyState title={t("handbookEmpty")} />
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
      {createProjectOpen && wallet.session ? (
        <CreateProjectDialog
          orgId={orgId}
          onClose={() => setCreateProjectOpen(false)}
          onCreated={(projectId) => {
            setCreateProjectOpen(false);
            router.push(`/projects/${encodeURIComponent(projectId)}`);
          }}
          refreshSession={wallet.refreshSession}
        />
      ) : null}
    </div>
  );
}
