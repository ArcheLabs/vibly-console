"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PlugZap } from "lucide-react";
import { appConfig } from "@/lib/config/env";
import { createCoordinatorClient } from "@/lib/coordinator/client";
import { ConsoleApiError, errorMessage } from "@/lib/coordinator/errors";
import type { AuthState, ConsoleMode } from "@/lib/coordinator/types";
import { defaultAuthState, useAuthState, writeAuthState } from "@/lib/store/authStore";

export function LoginPage() {
  const current = useAuthState();
  const router = useRouter();
  const [coordinatorUrl, setCoordinatorUrl] = useState(current.coordinatorUrl || defaultAuthState.coordinatorUrl);
  const [apiToken, setApiToken] = useState(current.apiToken || appConfig.demoApiToken);
  const [mode, setMode] = useState<ConsoleMode>(current.mode || "direct");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const next: AuthState = {
      coordinatorUrl: coordinatorUrl.replace(/\/$/, ""),
      apiToken,
      mode,
      connected: false,
    };
    try {
      await createCoordinatorClient(next).health();
      writeAuthState({ ...next, connected: true });
      router.push("/projects");
    } catch (err) {
      const message =
        err instanceof ConsoleApiError && err.status === 401
          ? "Unauthorized. Check the Coordinator API token."
          : errorMessage(err);
      setError(message);
      writeAuthState(next);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-xl space-y-6 rounded border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded bg-teal-700 text-white">
            <PlugZap className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">Connect to Vibly Coordinator</h1>
          <p className="mt-2 text-sm text-slate-600">Configure a local development connection for the human-facing console.</p>
        </div>
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Development console stores the API token locally in the browser. Do not use production secrets here.</p>
          </div>
        </div>
        {error ? <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div> : null}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Coordinator URL</span>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-teal-700"
            value={coordinatorUrl}
            onChange={(event) => setCoordinatorUrl(event.target.value)}
            placeholder="http://localhost:8787"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">API Token</span>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-teal-700"
            value={apiToken}
            onChange={(event) => setApiToken(event.target.value)}
            placeholder="dev-token"
            type="password"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Mode</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["direct", "proxy"] as const).map((item) => (
              <label key={item} className={`rounded border p-3 text-sm ${mode === item ? "border-teal-700 bg-teal-50" : "border-slate-300"}`}>
                <input className="mr-2" type="radio" checked={mode === item} onChange={() => setMode(item)} />
                {item === "direct" ? "Direct browser mode" : "Next.js proxy mode"}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {submitting ? "Checking connection..." : "Connect"}
        </button>
      </form>
    </main>
  );
}
