# vibly-console — Agent Operating Rules

This file lists invariants every Cursor agent (and human contributor) must obey when working in `vibly-console`. Violations should block PRs.

## Role

`vibly-console` is the human-facing Web UI for the Vibly coordinator network. It does **not** define HTTP contracts — those come from `@vibly/coordinator-http-contract`, which derives types from `vibly-coordinator`'s Fastify routes.

## Invariants

1. **Do not write new handwritten Coordinator paths.** `scripts/check-handwritten-paths.mjs` scans all of `src/` except `src/lib/coordinator/contractClient.ts` (the proxy/transport adapter). Any other place that emits literals like `fetch("/projects/...")` or `new EventSource("/projects/...")` will fail `pnpm lint`. New code must consume `@vibly/coordinator-http-contract`.
2. **`src/lib/coordinator/client.ts` is 100% contract-backed.** Every method on `CoordinatorClient` uses `this.contract.METHOD("/path", { params, body })` (no `fetch(...)` or hand-built URLs). When adding a new method:
   - call the contract via `this.contract.METHOD("/typed/path", { params, body })`,
   - check `result.response.ok` (the openapi-fetch discriminated union is unreliable when the OpenAPI does not declare error responses),
   - unwrap envelopes via `unwrapEnvelope` / `unwrapListEnvelope` (and `unwrapKey` for `{ key: ... }` payloads, `extractArray` for `{ items: [...] }`-style projections),
   - translate `CoordinatorApiError` (from the contract) into `ConsoleApiError` via `runContract` to keep the existing `ConsoleApiError` surface stable.
   The lone exception is `streamProjectEvents`, which still hand-rolls `/projects/${id}/stream` because the contract package's `sse.ts` currently targets a non-existent `/projects/:id/events` route. Migrate it once the SSE helper realigns.
3. **`Entity` (`Record<string, unknown>`) is still a transitional type.** It survives because every method currently returns `Promise<Entity>` / `Page<Entity>`. The next refactor pass should swap method return types to generated `paths['/...']['get']['responses']['200']['content']['application/json']` projections from `@vibly/coordinator-http-contract/types`. Do not introduce new `Entity` consumers if a typed shape is already available.
4. **Coordinator credentials live server-side only — never in URLs, query strings, or `localStorage`.** Console authenticates users via Auth.js (HttpOnly session cookie). The `/api/coordinator/[...path]` route handler resolves the upstream Coordinator URL and Bearer token from server config (`COORDINATOR_URL`, `COORDINATOR_API_TOKEN`, future per-user OIDC token exchange) via `src/lib/server/coordinatorSession.ts` and injects them as a `Authorization` header. The literals `__apiToken` / `__coordinatorUrl` are forbidden in `src/` (enforced by `scripts/check-handwritten-paths.mjs`). The route handler may strip them defensively, but no code may write or read them as a transport contract.
5. **Route protection lives in `src/proxy.ts` (Next.js 16's middleware).** It guards `/projects/*` and `/api/coordinator/*`. Component-level `auth.connected` checks are belt-and-braces only; do not rely on them to keep unauthenticated traffic out.

## When in doubt

- Adding a new feature? If the data lives at a Coordinator endpoint not yet in `paths`, ask coordinator to add a `schema.response[200]`, refresh `openapi.json`, regenerate contract types, then call `client.contract.GET(...)`.
- Need a feature that only the server can do (Coordinator credentials, per-tenant routing, CORS-bypass)? Add it to `src/lib/server/coordinatorSession.ts` and the `/api/coordinator/[...path]` handler — never push the secret to the browser.
- Need to test multi-user behaviour locally without an IdP? Set `AUTH_DEV_CREDENTIALS=true` to enable the email-only Dev Credentials provider.
