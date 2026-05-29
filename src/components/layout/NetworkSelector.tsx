"use client";

import { Check, ChevronDown, Network } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  networkProfiles,
  selectNetworkProfile,
  useActiveNetworkProfile,
  type NetworkProfile,
} from "@/lib/network/profiles";

export function NetworkSelector() {
  const t = useTranslations("network");
  const active = useActiveNetworkProfile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function onSelect(networkId: string) {
    selectNetworkProfile(networkId);
    setOpen(false);
    void queryClient.invalidateQueries();
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-surface-muted)] px-3 py-2.5 text-left text-[var(--sidebar-text)] shadow-sm transition hover:border-[var(--accent)]/60 hover:bg-[var(--sidebar-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={active.id}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--sidebar-bg)] ring-1 ring-[var(--sidebar-border)]">
          <Network className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase text-[var(--sidebar-text-muted)]">{t("selectorLabel")}</span>
          <span className="block truncate text-sm font-semibold">{active.label}</span>
        </span>
        <StageBadge profile={active} />
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--sidebar-text-muted)] transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] py-1 shadow-xl"
        >
          {networkProfiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              role="option"
              aria-selected={profile.id === active.id}
              onClick={() => onSelect(profile.id)}
              className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left text-sm text-[var(--sidebar-text)] transition hover:bg-[var(--sidebar-surface-muted)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{profile.label}</span>
                <span className="block truncate text-xs text-[var(--sidebar-text-muted)]">{profile.id}</span>
              </span>
              <StageBadge profile={profile} />
              {profile.id === active.id ? <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" /> : <span className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageBadge({ profile }: { profile: NetworkProfile }) {
  const label = profile.stage ?? "custom";
  return (
    <span className="shrink-0 rounded-md border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--sidebar-text-muted)]">
      {label}
    </span>
  );
}
