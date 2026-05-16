"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot, Building2, KeyRound, Menu, Network, Rss, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthState } from "@/lib/store/authStore";
import { useNetworkAgents, useNetworkOrganizations } from "@/lib/query/hooks";
import { WalletConnectPanel } from "@/components/wallet/WalletConnectPanel";
import { SettingsMenu } from "@/components/layout/SettingsMenu";

const navItems = [
  { href: "/", key: "feed", icon: Rss },
  { href: "/organizations", key: "organizations", icon: Building2 },
  { href: "/agents", key: "agents", icon: Bot },
  { href: "/onboarding", key: "identity", icon: KeyRound },
] as const;

function NetworkHealthPanel({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("shell");
  const orgsQuery = useNetworkOrganizations(20);
  const agentsQuery = useNetworkAgents(20);
  const orgCount = orgsQuery.data?.data.length ?? "—";
  const agentCount = agentsQuery.data?.data.length ?? "—";

  return (
    <div className={`${compact ? "" : "absolute bottom-5 left-3 right-3"} rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
        <Network className="h-4 w-4" />
        {t("networkHealth")}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-[var(--surface)] p-3 ring-1 ring-[var(--border)]">
          <div className="text-[var(--text-muted)]">{t("organizations")}</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text)]">{orgCount}</div>
        </div>
        <div className="rounded-xl bg-[var(--surface)] p-3 ring-1 ring-[var(--border)]">
          <div className="text-[var(--text-muted)]">{t("agents")}</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text)]">{agentCount}</div>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  const app = useTranslations("app");
  return (
    <div className="flex h-20 items-center gap-3 px-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm">
        <Network className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold tracking-tight text-[var(--text)]">{app("name")}</div>
        <div className="truncate text-xs text-[var(--text-muted)]">{app("tagline")}</div>
      </div>
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
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
            onClick={onNavigate}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const t = useTranslations("shell");
  const app = useTranslations("app");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl lg:block">
        <Brand />
        <Navigation />
        {auth.connected ? <NetworkHealthPanel /> : null}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="absolute inset-0 cursor-default bg-black/45"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[min(22rem,88vw)] border-r border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              <X className="h-4 w-4" />
            </button>
            <Brand />
            <Navigation onNavigate={() => setMobileOpen(false)} />
            <div className="mt-6 px-3">
              <NetworkHealthPanel compact />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/92 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={t("menu")}
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:text-[var(--text)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden truncate text-xs text-[var(--text-muted)] sm:inline">
              {app("coordinator")}: {auth.coordinatorUrl}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SettingsMenu />
            <WalletConnectPanel />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
