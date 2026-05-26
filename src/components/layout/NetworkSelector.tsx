"use client";

import { Network } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  networkProfiles,
  selectNetworkProfile,
  useActiveNetworkProfile,
} from "@/lib/network/profiles";
import { NativeSelect } from "@/components/common/NativeSelect";

export function NetworkSelector() {
  const t = useTranslations("network");
  const active = useActiveNetworkProfile();
  const queryClient = useQueryClient();

  function onChange(networkId: string) {
    selectNetworkProfile(networkId);
    void queryClient.invalidateQueries();
  }

  return (
    <label className="flex min-w-0 items-center gap-2 text-xs text-[var(--sidebar-text)]">
      <Network className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
      <span className="sr-only">{t("selectorLabel")}</span>
      <NativeSelect
        value={active.id}
        onChange={(event) => onChange(event.target.value)}
        variant="sidebar"
        className="min-w-0 flex-1"
        title={active.id}
      >
        {networkProfiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
