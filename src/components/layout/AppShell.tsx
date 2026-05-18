"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot, Building2, LayoutDashboard, Menu, Network, Rss, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthState } from "@/lib/store/authStore";
import { useNetworkAgents, useNetworkOrganizations } from "@/lib/query/hooks";
import { SettingsMenu } from "@/components/layout/SettingsMenu";

const navItems = [
  { href: "/", key: "feed", icon: Rss },
  { href: "/organizations", key: "organizations", icon: Building2 },
  { href: "/agents", key: "agents", icon: Bot },
  { href: "/personal-center", key: "identity", icon: LayoutDashboard },
] as const;

function NetworkHealthPanel() {
  const t = useTranslations("shell");
  const orgsQuery = useNetworkOrganizations(20);
  const agentsQuery = useNetworkAgents(20);
  const orgCount = orgsQuery.data?.data.length ?? "—";
  const agentCount = agentsQuery.data?.data.length ?? "—";

  return (
    <div className="rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface-muted)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sidebar-text)]">
        <Network className="h-4 w-4" />
        {t("networkHealth")}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-[var(--sidebar-bg)] p-3 ring-1 ring-[var(--sidebar-border)]">
          <div className="text-[var(--sidebar-text-muted)]">{t("organizations")}</div>
          <div className="mt-1 text-lg font-semibold text-[var(--sidebar-text)]">{orgCount}</div>
        </div>
        <div className="rounded-xl bg-[var(--sidebar-bg)] p-3 ring-1 ring-[var(--sidebar-border)]">
          <div className="text-[var(--sidebar-text-muted)]">{t("agents")}</div>
          <div className="mt-1 text-lg font-semibold text-[var(--sidebar-text)]">{agentCount}</div>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  const app = useTranslations("app");
  return (
    <Link href="/" className="flex h-20 items-center gap-3 px-5 hover:opacity-80 transition-opacity">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[var(--sidebar-surface-muted)] shadow-sm ring-1 ring-[var(--accent)]/30">
        <img src="/vibly-logo.png" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold tracking-tight text-[var(--sidebar-text)]">{app("name")}</div>
        <div className="truncate text-xs text-[var(--sidebar-text-muted)]">{app("tagline")}</div>
      </div>
    </Link>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const auth = useAuthState();

  return (
    <nav className="space-y-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
        const label = item.key === "identity" && !auth.connected ? t("loginWallet") : t(item.key);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
              active
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                : "text-[var(--sidebar-nav-inactive)] hover:bg-[var(--sidebar-surface-muted)] hover:text-[var(--sidebar-text)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  const t = useTranslations("shell");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:block">
        <Brand />
        <Navigation />
        <div className="absolute bottom-5 left-3 right-3 space-y-3">
          {auth.connected ? <NetworkHealthPanel /> : null}
          <div className="flex justify-end">
            <SettingsMenu placement="sidebar" />
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="absolute inset-0 cursor-default bg-black/45"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[min(22rem,88vw)] border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-surface-muted)] hover:text-[var(--sidebar-text)]"
            >
              <X className="h-4 w-4" />
            </button>
            <Brand />
            <Navigation onNavigate={() => setMobileOpen(false)} />
            <div className="mt-6 px-3">
              <NetworkHealthPanel />
            </div>
            <div className="absolute bottom-5 right-5">
              <SettingsMenu placement="sidebar" />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:ml-72">
        <button
          type="button"
          aria-label={t("menu")}
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:text-[var(--text)] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <main>{children}</main>
      </div>
    </div>
  );
}
