"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { clearAuthState, useAuthState } from "@/lib/store/authStore";
import { appConfig } from "@/lib/config/env";
import { groupedSections } from "./ProjectNav";

export function AppShell({
  children,
  projectId,
  projectName,
}: {
  children: React.ReactNode;
  projectId?: string;
  projectName?: string;
}) {
  const auth = useAuthState();
  const router = useRouter();
  const pathname = usePathname();
  const groups = groupedSections();

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-slate-200 bg-white lg:block">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/projects" className="text-lg font-semibold text-slate-950">
            {appConfig.appName}
          </Link>
          <p className="mt-1 text-xs text-slate-500">Human supervision for Vibly coordination.</p>
        </div>
        {projectId ? (
          <nav className="space-y-5 px-3 py-4">
            {Object.entries(groups).map(([group, sections]) => (
              <div key={group}>
                <p className="px-2 text-xs font-semibold uppercase text-slate-500">{group}</p>
                <div className="mt-2 space-y-1">
                  {sections.map((section) => {
                    const href = section.href ? `/projects/${projectId}/${section.href}` : `/projects/${projectId}`;
                    const active = pathname === href || (section.href && pathname.startsWith(href));
                    const Icon = section.icon;
                    return (
                      <Link
                        key={section.href || "dashboard"}
                        href={href}
                        className={`flex items-center gap-2 rounded px-2 py-2 text-sm ${
                          active ? "bg-teal-50 font-medium text-teal-900" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{section.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        ) : (
          <div className="px-5 py-4 text-sm text-slate-600">Select a project to open the full console navigation.</div>
        )}
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-500">{auth.mode.toUpperCase()} mode</p>
              <p className="truncate font-medium text-slate-950">{projectName ?? auth.coordinatorUrl}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${
                  auth.connected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {auth.connected ? "Connected" : "Disconnected"}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => router.refresh()}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => {
                  clearAuthState();
                  router.push("/login");
                }}
                title="Disconnect"
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
