"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertTriangle, PlugZap } from "lucide-react";
import { appConfig } from "@/lib/config/env";
import { writeAuthState } from "@/lib/store/authStore";

interface ConsoleProvider {
  id: string;
  name: string;
}

export function LoginPage({ providers }: { providers: ConsoleProvider[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/projects";
  const [error, setError] = useState<string | null>(params.get("error"));
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function handleOidc(providerId: string) {
    setError(null);
    setSubmitting(providerId);
    try {
      await signIn(providerId, { callbackUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDev(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting("dev");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email) {
      setError("Enter an email address to sign in.");
      setSubmitting(null);
      return;
    }
    const result = await signIn("dev", { email, redirect: false, callbackUrl });
    if (result?.error) {
      setError(result.error);
      setSubmitting(null);
      return;
    }
    // Persist a minimal flag so deep-link redirects in the client know
    // we are connected. The HttpOnly session cookie is the source of truth.
    writeAuthState({ coordinatorUrl: appConfig.defaultCoordinatorUrl, mode: "proxy", connected: true });
    router.push(result?.url ?? callbackUrl);
    setSubmitting(null);
  }

  const oidcProviders = providers.filter((p) => p.id !== "dev");
  const devProvider = providers.find((p) => p.id === "dev");

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-xl space-y-6 rounded border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded bg-teal-700 text-white">
            <PlugZap className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">Sign in to Vibly Console</h1>
          <p className="mt-2 text-sm text-slate-600">
            Authenticate via your identity provider. Console connects to {appConfig.defaultCoordinatorUrl} server-side.
          </p>
        </div>
        {providers.length === 0 ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>No authentication provider configured. Set AUTH_OIDC_ISSUER (and credentials) on the server.</p>
            </div>
          </div>
        ) : null}
        {error ? <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</div> : null}

        {oidcProviders.length > 0 ? (
          <div className="space-y-2">
            {oidcProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                disabled={submitting !== null}
                onClick={() => handleOidc(provider.id)}
                className="w-full rounded bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {submitting === provider.id ? "Signing in..." : `Continue with ${provider.name}`}
              </button>
            ))}
          </div>
        ) : null}

        {devProvider ? (
          <form onSubmit={handleDev} className="space-y-3 rounded border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Dev sign-in</p>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                name="email"
                type="email"
                className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-teal-700"
                placeholder="you@example.com"
                required
              />
            </label>
            <button
              type="submit"
              disabled={submitting !== null}
              className="w-full rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              {submitting === "dev" ? "Signing in..." : "Sign in (dev)"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
