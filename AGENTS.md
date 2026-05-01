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
4. **The `/api/coordinator/[...path]` proxy is a transport detail.** Do not add Coordinator path knowledge there. Append-only behaviour like `__coordinatorUrl` / `__apiToken` query forwarding is also slated for removal once the proxy switches to server-side env injection.

## When in doubt

- Adding a new feature? If the data lives at a Coordinator endpoint not yet in `paths`, ask coordinator to add a `schema.response[200]`, refresh `openapi.json`, regenerate contract types, then call `client.contract.GET(...)`.
- Need a feature only the proxy can do (CORS, hosted tokens)? Wire the proxy specifics in `contractClient.ts` middleware, not in component code.
