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
  const initial = useMemo(() => normalizeInitialDescriptor(initialDescriptor), [initialDescriptor]);
  const [sessionPublicKey, setSessionPublicKey] = useState(initial.sessionPublicKey);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [keyType, setKeyType] = useState(initial.keyType);
  const [authorization, setAuthorization] = useState<Entity | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionPublicKey(initial.sessionPublicKey);
    setDisplayName(initial.displayName);
    setKeyType(initial.keyType);
    setAuthorization(null);
    setError(null);
  }, [initial]);

  const addMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const publicKey = sessionPublicKey.trim();
      if (!publicKey) throw new Error(t("addAgentDialog.publicKeyRequired"));
      return client.authorizeAgentSessionPublicKey({
        sessionPublicKey: publicKey,
        keyType,
        displayName: displayName.trim() || undefined,
        organizationIds: initial.organizationIds,
      });
    },
    onSuccess: async (next) => {
      setAuthorization(next);
      await queryClient.invalidateQueries({ queryKey: queryKeys.personalCenter(network.id) });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : t("addAgentDialog.addFailed")),
  });

  const waitCommand = initial.localAgentId
    ? `npx @vibly-ai/client@latest agent wait-link --local-agent-id ${shellQuote(initial.localAgentId)} --chain-id ${shellQuote(network.id)}${network.coordinatorUrl ? ` --coordinator ${shellQuote(network.coordinatorUrl)}` : ""}`
    : "";

  async function copyWaitCommand() {
    if (!waitCommand) return;
    setCopied(true);
    try { await navigator.clipboard.writeText(waitCommand); } catch {}
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-4">
      <label className="text-sm">
        <span className="mb-2 block font-semibold text-[var(--text-muted)]">{t("addAgentDialog.displayNameLabel")}</span>
        <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--text)]" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-2 block font-semibold text-[var(--text-muted)]">{t("addAgentDialog.sessionPublicKeyLabel")}</span>
        <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-mono text-xs text-[var(--text)]" placeholder={t("addAgentDialog.sessionPublicKeyPlaceholder")} value={sessionPublicKey} onChange={(event) => setSessionPublicKey(event.target.value)} />
      </label>
      <label className="text-sm">
        <span className="mb-2 block font-semibold text-[var(--text-muted)]">{t("addAgentDialog.keyTypeLabel")}</span>
        <select className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--text)]" value={keyType} onChange={(event) => setKeyType(event.target.value)}>
          <option value="sr25519">sr25519</option>
          <option value="ed25519">ed25519</option>
          <option value="ecdsa">ecdsa</option>
          <option value="unknown">unknown</option>
        </select>
      </label>
      <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50" disabled={addMutation.isPending} onClick={() => addMutation.mutate()}>{addMutation.isPending ? t("addAgentDialog.adding") : t("addAgentDialog.add")}</button>
      {authorization ? (
        <div className="grid gap-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-4">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">{t("addAgentDialog.authorizedTitle")}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t("addAgentDialog.authorizedHint")}</div>
          </div>
          {waitCommand ? (
            <>
              <pre className="max-h-44 overflow-auto rounded-lg bg-[var(--background)] p-3 text-xs text-[var(--text)]"><code>{waitCommand}</code></pre>
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]" onClick={copyWaitCommand}><Copy className="h-4 w-4" />{copied ? t("copied") : t("addAgentDialog.copyWaitCommand")}</button>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-400">{error}</div> : null}
    </div>
  );
}

function normalizeInitialDescriptor(input?: Entity | null): {
  sessionPublicKey: string;
  displayName: string;
  keyType: string;
  localAgentId?: string;
  organizationIds: string[];
} {
  const value: Entity = input && Object.keys(input).length ? input : defaultAgentDescriptor;
  return {
    sessionPublicKey: typeof value.sessionPublicKey === "string" ? value.sessionPublicKey : "",
    displayName: typeof value.displayName === "string" ? value.displayName : "observer-agent",
    keyType: typeof value.keyType === "string" ? value.keyType : "sr25519",
    localAgentId: typeof value.localAgentId === "string" ? value.localAgentId : undefined,
    organizationIds: Array.isArray(value.organizationIds) ? value.organizationIds.map(String).filter(Boolean) : ["default"],
  };
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9:_.@/-]+$/.test(value)) return value;
  return JSON.stringify(value);
}
