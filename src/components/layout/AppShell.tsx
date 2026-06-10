"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bot, Building2, Coins, LayoutDashboard, Menu, Network, Rss, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useAuthState } from "@/lib/store/authStore";
import { useNetworkAgents, useNetworkOrganizations } from "@/lib/query/hooks";
import { SettingsMenu } from "@/components/layout/SettingsMenu";
import { WalletConnectPanel } from "@/components/wallet/WalletConnectPanel";
import { NetworkSelector } from "@/components/layout/NetworkSelector";
import { useActiveNetworkProfile, networkPaymentRpcUrls } from "@/lib/network/profiles";
import { refreshPaymentChainInfo } from "@/lib/network/paymentChainInfo";

const navItems = [
  { href: "/", key: "feed", icon: Rss },
  { href: "/organizations", key: "organizations", icon: Building2 },
  { href: "/agents", key: "agents", icon: Bot },
  { href: "/get-vib", key: "getVib", icon: Coins },
  { href: "/rewards", key: "rewards", icon: Sparkles },
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
    <div className="px-5 pb-4 pt-8">
      <div className="flex flex-col items-start gap-3">
        <Link href="/" className="transition-opacity hover:opacity-80" aria-label={app("name")}>
          <img src="/vibly-logo.svg" alt={app("name")} className="h-8 w-auto" />
        </Link>
        <div className="w-full max-w-[13rem]">
          <NetworkSelector />
        </div>
      </div>
    </div>
  );
}

function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const app = useTranslations("app");
  const t = useTranslations("shell");
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-center border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 shadow-sm backdrop-blur-xl lg:hidden">
      <button
        type="button"
        aria-label={t("menu")}
        onClick={onMenuClick}
        className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:text-[var(--text)]"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/" className="transition-opacity hover:opacity-80" aria-label={app("name")}>
        <img src="/vibly-logo.svg" alt={app("name")} className="h-8 w-auto" />
      </Link>
    </header>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const auth = useAuthState();
  const activeNetwork = useActiveNetworkProfile();

  return (
    <nav className="space-y-1 px-3">
      {navItems.map((item) => {
        if (item.key === "rewards" && activeNetwork.features?.rewards === false) return null;
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
  const activeNetwork = useActiveNetworkProfile();

  useEffect(() => {
    refreshPaymentChainInfo(networkPaymentRpcUrls(activeNetwork));
  }, [activeNetwork]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:block">
        <Brand />
        <Navigation />
        <div className="absolute bottom-5 left-3 right-3 space-y-3">
          {auth.connected ? <NetworkHealthPanel /> : null}
          <WalletConnectPanel placement="sidebar" />
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
              {auth.connected ? <NetworkHealthPanel /> : null}
            </div>
            <div className="absolute bottom-5 left-3 right-3 space-y-2">
              <WalletConnectPanel placement="sidebar" />
              <div className="flex justify-end">
                <SettingsMenu placement="sidebar" />
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="min-h-screen lg:ml-72">
        <MobileTopBar onMenuClick={() => setMobileOpen(true)} />
        <main>{children}</main>
      </div>
    </div>
  );
}
