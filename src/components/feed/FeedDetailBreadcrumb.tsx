"use client";

import Link from "next/link";
import type { Entity } from "@/lib/coordinator/types";
import type { EntityNameMap } from "@/lib/entities/display";
import { eventTypeFor, organizationIdFor, organizationNameFor, projectNameFor, text } from "@/lib/entities/display";
import { DetailPageHeader, type BreadcrumbItem } from "@/components/layout/DetailPageHeader";

export function FeedDetailBreadcrumb({ event, organizationNames, projectNames }: { event: Entity; organizationNames?: EntityNameMap; projectNames?: EntityNameMap }) {
  const orgId = organizationIdFor(event);
  const org = organizationNameFor(event, organizationNames);
  const project = projectNameFor(event, projectNames);
  const objectType = text(event.objectType, eventTypeFor(event), "Event");
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Vibly", href: "/" }];

  if (org) breadcrumbs.push({ label: org, href: orgId ? `/organizations/${encodeURIComponent(orgId)}` : undefined });
  if (project && project !== org) breadcrumbs.push({ label: project });
  breadcrumbs.push({ label: objectType });

  return (
    <DetailPageHeader
      breadcrumbs={breadcrumbs}
      sticky
      emphasized
      right={
        orgId ? (
          <Link
            href={`/organizations/${encodeURIComponent(orgId)}`}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
          >
            进入组织 Console
          </Link>
        ) : undefined
      }
    />
  );
}
