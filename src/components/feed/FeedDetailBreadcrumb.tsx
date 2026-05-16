"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Entity } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import { eventTypeFor, organizationIdFor, organizationNameFor, text } from "@/lib/entities/display";

export function FeedDetailBreadcrumb({ event, organizationNames }: { event: Entity; organizationNames?: EntityNameMap }) {
  const orgId = organizationIdFor(event);
  const org = organizationNameFor(event, organizationNames);
  const project = text(event.project, event.projectName, event.projectId);
  const objectType = text(event.objectType, eventTypeFor(event), "Event");

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            <ChevronLeft className="h-4 w-4" />
            返回动态
          </Link>
          <span className="text-[var(--text-subtle)]">/</span>
          <span className="text-[var(--text-muted)]">Vibly</span>
          {org && (
            <>
              <span className="text-[var(--text-subtle)]">/</span>
              <span className="font-medium text-[var(--text)]">{org}</span>
            </>
          )}
          {project && project !== org && (
            <>
              <span className="text-[var(--text-subtle)]">/</span>
              <span className="font-medium text-[var(--text)]">{project}</span>
            </>
          )}
          <span className="text-[var(--text-subtle)]">/</span>
          <span className="font-semibold text-[var(--text)]">{objectType}</span>
        </div>
        {orgId && (
          <Link
            href={`/organizations/${encodeURIComponent(orgId)}`}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
          >
            进入组织 Console
          </Link>
        )}
      </div>
    </div>
  );
}
