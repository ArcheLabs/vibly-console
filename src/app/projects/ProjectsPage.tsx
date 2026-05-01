"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { PageHeader } from "@/components/common/EntityViews";
import { StatusBadge } from "@/components/common/Badge";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { compactId, pickString, timeAgo } from "@/lib/utils/format";

export function ProjectsPage() {
  // Route protection lives in `src/proxy.ts` (Next.js 16). By the time
  // this component renders we are guaranteed to have a signed-in session.
  const client = useCoordinatorClient();
  const projects = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => client.listProjects({ limit: 100 }),
  });

  return (
    <AppShell>
      <PageHeader title="Projects" eyebrow="Coordinator workspace" />
      {projects.isLoading ? <LoadingState label="Loading projects" /> : null}
      {projects.error ? <ErrorState error={projects.error} title="Could not load projects" /> : null}
      {projects.data && projects.data.data.length === 0 ? (
        <EmptyState title="No projects found." body="Create or seed a project through vibly-coordinator, then refresh this page." />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.data?.data.map((project) => (
          <Link key={String(project.id)} href={`/projects/${String(project.id)}`} className="rounded border border-slate-200 bg-white p-4 hover:border-teal-600">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-950">{pickString(project.name ?? project.slug ?? project.id)}</h2>
                <p className="mt-1 text-xs text-slate-500">{compactId(project.id)}</p>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-slate-600">{pickString(project.description, "No description")}</p>
            <p className="mt-4 text-xs text-slate-500">Updated {timeAgo(project.updatedAt ?? project.createdAt)}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
