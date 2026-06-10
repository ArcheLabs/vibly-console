"use client";

import { Check, ChevronDown, Network } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  selectNetworkProfile,
  useActiveNetworkProfile,
  useNetworkProfiles,
} from "@/lib/network/profiles";

export function NetworkSelector() {
  const t = useTranslations("network");
  const active = useActiveNetworkProfile();
  const profiles = useNetworkProfiles();
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
        className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-surface-muted)] px-2.5 py-2 text-left text-[var(--sidebar-text)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--sidebar-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={active.id}
      >
        <Network className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{active.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[var(--sidebar-text-muted)] transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] py-1 shadow-xl"
        >
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              role="option"
              aria-selected={profile.id === active.id}
              onClick={() => onSelect(profile.id)}
              className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm text-[var(--sidebar-text)] transition hover:bg-[var(--sidebar-surface-muted)]"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{profile.label}</span>
              {profile.status && profile.status !== "active" ? <span className="shrink-0 text-[10px] uppercase text-[var(--warning)]">{profile.status}</span> : null}
              {!profile.status || profile.status === "active" ? profile.stage ? <span className="shrink-0 text-[10px] uppercase text-[var(--sidebar-text-muted)]">{profile.stage}</span> : null : null}
              {profile.id === active.id ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden="true" /> : <span className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
