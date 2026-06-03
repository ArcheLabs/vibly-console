"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCoordinatorClient } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { useActiveNetworkProfile } from "@/lib/network/profiles";
import type { Entity } from "@/lib/coordinator/types";

export const defaultAgentDescriptor = {
  displayName: "observer-agent",
  sessionPublicKey: "",
  keyType: "sr25519",
  capabilities: ["observer", "researcher"],
  organizationIds: ["default"],
  scopes: ["availability", "task_result", "pause_duty", "resume_duty"],
  stakeLimit: "100",
  expiresAt: "",
};

function asRecord(value: unknown): Entity {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Entity) : {};
}

function descriptorJson(value?: Entity | null): string {
  return JSON.stringify(value && Object.keys(value).length ? value : defaultAgentDescriptor, null, 2);
}

export function encodeEnrollmentDescriptor(value: Entity): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") return Buffer.from(json, "utf8").toString("base64url");
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeEnrollmentDescriptor(value: string): Entity {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return asRecord(JSON.parse(new TextDecoder().decode(bytes)));
}

export function AddAgentFlow({ initialDescriptor }: { initialDescriptor?: Entity | null }) {
  const t = useTranslations("personalCenter");
  const client = useCoordinatorClient();
  const network = useActiveNetworkProfile();
  const queryClient = useQueryClient();
  const initialRaw = useMemo(() => descriptorJson(initialDescriptor), [initialDescriptor]);
  const [raw, setRaw] = useState(initialRaw);
  const [authorization, setAuthorization] = useState<Entity | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(initialRaw);
    setAuthorization(null);
    setError(null);
  }, [initialRaw]);

  const addMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const descriptor = JSON.parse(raw) as Record<string, unknown>;
      return client.createAgentEnrollment({ descriptor });
    },
    onSuccess: async (next) => {
      setAuthorization(next);
      await queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : t("addAgentDialog.addFailed")),
  });

  const descriptor = parseDescriptor(raw);
  const linkCommand = authorization ? buildAgentLinkCommand({ authorization, descriptor, networkId: network.id, coordinatorUrl: network.coordinatorUrl }) : "";
  const needsChainSetup = authorization ? linkCommand.includes("<identityId>") || linkCommand.includes("<chainAgentId>") : false;

  async function copyLinkCommand() {
    if (!linkCommand) return;
    setCopied(true);
    try { await navigator.clipboard.writeText(linkCommand); } catch {}
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-4">
      <label className="text-sm">
        <span className="mb-2 block font-semibold text-[var(--text-muted)]">{t("addAgentDialog.descriptorLabel")}</span>
        <textarea className="h-56 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--text)]" value={raw} onChange={(event) => setRaw(event.target.value)} />
      </label>
      <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50" disabled={addMutation.isPending} onClick={() => addMutation.mutate()}>{addMutation.isPending ? t("addAgentDialog.adding") : t("addAgentDialog.add")}</button>
      {authorization ? (
        <div className="grid gap-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-4">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">{t("addAgentDialog.authorizedTitle")}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{needsChainSetup ? t("addAgentDialog.chainSetupNeeded") : t("addAgentDialog.copyLinkHint")}</div>
          </div>
          <pre className="max-h-44 overflow-auto rounded-lg bg-[var(--background)] p-3 text-xs text-[var(--text)]"><code>{linkCommand}</code></pre>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]" onClick={copyLinkCommand}><Copy className="h-4 w-4" />{copied ? t("copied") : t("addAgentDialog.copyLink")}</button>
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-400">{error}</div> : null}
    </div>
  );
}

function parseDescriptor(raw: string): Entity {
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return {};
  }
}

function buildAgentLinkCommand(input: { authorization: Entity; descriptor: Entity; networkId: string; coordinatorUrl?: string }): string {
  const profile = asRecord(input.authorization.profile);
  const organizationIds = Array.isArray(profile.organizationIds) ? profile.organizationIds : Array.isArray(input.descriptor.organizationIds) ? input.descriptor.organizationIds : [];
  const principalId = String(input.authorization.principalId ?? profile.principalId ?? "<principalId>");
  const localAgentId = String(input.descriptor.localAgentId ?? "<localAgentId>");
  const identityId = String(profile.identityId ?? input.descriptor.identityId ?? "<identityId>");
  const chainAgentId = String(profile.chainAgentId ?? input.descriptor.chainAgentId ?? "<chainAgentId>");
  const organizationId = String(organizationIds[0] ?? "default");
  const runtimeToken = typeof input.authorization.runtimeToken === "string" ? input.authorization.runtimeToken : undefined;
  return [
    "npx @vibly-ai/client@latest agent link",
    `  --local-agent-id ${shellQuote(localAgentId)}`,
    `  --principal-id ${shellQuote(principalId)}`,
    `  --identity-id ${shellQuote(identityId)}`,
    `  --chain-agent-id ${shellQuote(chainAgentId)}`,
    `  --organization ${shellQuote(organizationId)}`,
    `  --chain-id ${shellQuote(input.networkId)}`,
    input.coordinatorUrl ? `  --coordinator ${shellQuote(input.coordinatorUrl)}` : undefined,
    runtimeToken ? `  --runtime-token ${shellQuote(runtimeToken)}` : undefined,
  ].filter(Boolean).join(" ");
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9:_.@/-]+$/.test(value)) return value;
  return JSON.stringify(value);
}
