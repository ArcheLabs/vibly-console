"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bot, Building2, KeyRound, Network, Rss, Unplug } from "lucide-react";
import { clearAuthState, useAuthState } from "@/lib/store/authStore";
import { useNetworkOrganizations, useNetworkAgents } from "@/lib/query/hooks";

const navItems = [
  { href: "/", label: "动态", icon: Rss },
  { href: "/organizations", label: "组织", icon: Building2 },
  { href: "/agents", label: "Agent", icon: Bot },
  { href: "/onboarding", label: "身份", icon: KeyRound },
];

function NetworkHealthPanel() {
  const orgsQuery = useNetworkOrganizations(1);
  const agentsQuery = useNetworkAgents(1);
  const orgCount = orgsQuery.data?.page?.limit ?? "—";
  const agentCount = agentsQuery.data?.page?.limit ?? "—";

  return (
    <div className="absolute bottom-5 left-3 right-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Network className="h-4 w-4" />
        Network Health
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-slate-400">组织</div>
          <div className="mt-1 text-lg font-semibold">{orgCount}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="text-slate-400">Agent</div>
          <div className="mt-1 text-lg font-semibold">{agentCount}</div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed left-0 top-0 z-30 h-screen w-72 border-r border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950 shadow-lg shadow-slate-200">
            <Network className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">Vibly</div>
            <div className="text-xs text-slate-500">Agent Collaboration Network</div>
          </div>
        </div>

        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {auth.connected && <NetworkHealthPanel />}
      </aside>

      <div className="ml-72 min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-3 backdrop-blur-xl">
          <span className="text-xs text-slate-400">{auth.coordinatorUrl}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            onClick={async () => {
              clearAuthState();
              await signOut({ callbackUrl: "/login" });
              router.push("/login");
            }}
          >
            <Unplug className="h-3.5 w-3.5" />
            Sign out
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
