"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Entity } from "@/lib/coordinator/types";

export function FeedDetailBreadcrumb({ event }: { event: Entity }) {
  const org = String(event.organization ?? event.org ?? event.projectId ?? "");
  const project = String(event.project ?? event.projectId ?? "");
  const objectType = String(event.objectType ?? event.eventType ?? "Event");

  return (
    <div className="sticky top-14 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            返回动态
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500">Vibly</span>
          {org && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-700">{org}</span>
            </>
          )}
          {project && project !== org && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-700">{project}</span>
            </>
          )}
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-950">{objectType}</span>
        </div>
        {org && (
          <Link
            href={`/organizations/${encodeURIComponent(org)}`}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            进入组织 Console
          </Link>
        )}
      </div>
    </div>
  );
}
