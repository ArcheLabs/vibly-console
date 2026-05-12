"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, RefreshCcw, Send, Wallet } from "lucide-react";
import { useCoordinatorClient } from "@/lib/query/hooks";
import type { Entity } from "@/lib/coordinator/types";

type LocalIdentity = {
  rootAddress: string;
  rootPrivateKey: string;
  agentRegistrarAddress: string;
  agentRegistrarPrivateKey: string;
};

const STORAGE_KEY = "vibly.identity.localKeys.v1";

export function IdentityOnboardingPage() {
  const client = useCoordinatorClient();
  const [evmAddress, setEvmAddress] = useState("");
  const [dotAmount, setDotAmount] = useState("1");
  const [identity, setIdentity] = useState<LocalIdentity>(() => loadIdentity() ?? generateIdentity());
  const [claim, setClaim] = useState<Entity | null>(null);
  const [rotation, setRotation] = useState<Entity | null>(null);
  const [quote, setQuote] = useState<Entity | null>(null);
  const [order, setOrder] = useState<Entity | null>(null);
  const publicIdentity = useMemo(
    () => ({
      rootAddress: identity.rootAddress,
      agentRegistrarAddress: identity.agentRegistrarAddress,
    }),
    [identity],
  );

  const connectWallet = async () => {
    const ethereum = (window as unknown as { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
    if (!ethereum) return;
    const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
    setEvmAddress(accounts[0] ?? "");
  };

  const claimMutation = useMutation({
    mutationFn: async () => {
      const signingPayload = await client.createAirdropPayload({
        evmAddress,
        viblyRootAddress: identity.rootAddress,
        agentRegistrarAddress: identity.agentRegistrarAddress,
      });
      const signature = await signMessage(String(signingPayload.message));
      const nextClaim = await client.submitAirdropClaim({
        evmAddress,
        nonce: signingPayload.nonce,
        signature,
        viblyRootAddress: identity.rootAddress,
        agentRegistrarAddress: identity.agentRegistrarAddress,
      });
      setClaim(nextClaim);
      return nextClaim;
    },
  });

  const rotationMutation = useMutation({
    mutationFn: async () => {
      const nextIdentity = generateIdentity();
      const signingPayload = await client.createRootRotationPayload({
        evmAddress,
        newRootAddress: nextIdentity.rootAddress,
      });
      const signature = await signMessage(String(signingPayload.message));
      const nextRotation = await client.submitRootRotation({
        evmAddress,
        nonce: signingPayload.nonce,
        signature,
        newRootAddress: nextIdentity.rootAddress,
      });
      persistIdentity(nextIdentity);
      setIdentity(nextIdentity);
      setRotation(nextRotation);
      return nextRotation;
    },
  });

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const nextQuote = await client.quoteDotVib({ dotAmount });
      setQuote(nextQuote);
      return nextQuote;
    },
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      const nextOrder = await client.createDotVibOrder({
        dotAmount,
        evmAddress: evmAddress || undefined,
        viblyRootAddress: identity.rootAddress,
      });
      setOrder(nextOrder);
      return nextOrder;
    },
  });

  const resetLocalIdentity = () => {
    const next = generateIdentity();
    persistIdentity(next);
    setIdentity(next);
  };

  return (
    <div className="min-h-screen bg-white px-6 py-6">
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6">
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-5">
            <h1 className="text-2xl font-semibold tracking-normal">Identity onboarding</h1>
            <div className="mt-2 text-sm text-slate-500">EVM entry, local Vibly keys, airdrop claim, root rotation, and DOT to VIB order flow.</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Panel title="Wallet">
              <div className="space-y-3">
                <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm text-white" onClick={connectWallet}>
                  <Wallet className="h-4 w-4" />
                  Connect EVM
                </button>
                <Field label="EVM address" value={evmAddress} onChange={setEvmAddress} placeholder="0x..." />
              </div>
            </Panel>

            <Panel title="Local Vibly keys">
              <div className="space-y-3">
                <KeyValue label="Root" value={identity.rootAddress} />
                <KeyValue label="AgentRegistrar" value={identity.agentRegistrarAddress} />
                <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm" onClick={resetLocalIdentity}>
                  <RefreshCcw className="h-4 w-4" />
                  Regenerate
                </button>
              </div>
            </Panel>
          </div>

          <Panel title="Airdrop claim">
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!evmAddress || claimMutation.isPending} onClick={() => claimMutation.mutate()}>
                <KeyRound className="h-4 w-4" />
                Claim
              </button>
              <Status error={claimMutation.error} entity={claim} />
            </div>
          </Panel>

          <Panel title="Root rotation">
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50" disabled={!evmAddress || rotationMutation.isPending} onClick={() => rotationMutation.mutate()}>
                <RefreshCcw className="h-4 w-4" />
                Rotate root
              </button>
              <Status error={rotationMutation.error} entity={rotation} />
            </div>
          </Panel>

          <Panel title="DOT to VIB">
            <div className="grid grid-cols-[180px_auto] items-end gap-3">
              <Field label="DOT amount" value={dotAmount} onChange={setDotAmount} />
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm" onClick={() => quoteMutation.mutate()}>
                  Quote
                </button>
                <button className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm text-white" onClick={() => orderMutation.mutate()}>
                  <Send className="h-4 w-4" />
                  Create order
                </button>
              </div>
            </div>
            {quote && <JsonBlock value={quote} />}
            {order && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <KeyValue label="DOT address" value={String(order.dotReceivingAddress ?? "")} />
                <KeyValue label="Memo" value={String(order.memo ?? "")} />
                <KeyValue label="DOT amount" value={String(order.dotAmount ?? "")} />
                <KeyValue label="Estimated VIB" value={String(order.quotedVibAmount ?? "")} />
              </div>
            )}
          </Panel>
        </section>

        <aside className="space-y-4 border-l border-slate-200 pl-6">
          <Panel title="Backup">
            <div className="space-y-3 text-sm text-slate-600">
              <p>Root and AgentRegistrar private keys stay in browser local storage and are not sent to Coordinator.</p>
              <JsonBlock value={publicIdentity} />
            </div>
          </Panel>
          <Panel title="Latest order">
            {order ? <JsonBlock value={order} /> : <div className="text-sm text-slate-500">No order yet</div>}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-normal text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange(value: string): void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{label}</span>
      <input className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="break-all font-mono text-xs text-slate-900">{value || "—"}</div>
    </div>
  );
}

function Status({ error, entity }: { error: unknown; entity: Entity | null }) {
  if (error) return <span className="text-sm text-red-600">{error instanceof Error ? error.message : "Request failed"}</span>;
  if (entity) return <span className="text-sm text-emerald-700">{String(entity.status ?? "submitted")}</span>;
  return <span className="text-sm text-slate-500">Idle</span>;
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(value, null, 2)}</pre>;
}

function loadIdentity(): LocalIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalIdentity;
  } catch {
    return null;
  }
}

function persistIdentity(identity: LocalIdentity): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

function generateIdentity(): LocalIdentity {
  const rootPrivateKey = randomHex(32);
  const agentRegistrarPrivateKey = randomHex(32);
  const identity = {
    rootPrivateKey,
    agentRegistrarPrivateKey,
    rootAddress: `vibly_${randomHex(32).slice(2)}`,
    agentRegistrarAddress: `vibly_${randomHex(32).slice(2)}`,
  };
  if (typeof window !== "undefined") persistIdentity(identity);
  return identity;
}

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(array);
  return `0x${Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function signMessage(message: string): Promise<string> {
  const ethereum = (window as unknown as { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
  if (!ethereum) return `0x${"11".repeat(65)}`;
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  return String(await ethereum.request({ method: "personal_sign", params: [message, accounts[0]] }));
}
