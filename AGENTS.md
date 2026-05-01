# vibly-console — Agent Operating Rules

This file lists invariants every Cursor agent (and human contributor) must obey when working in `vibly-console`. Violations should block PRs.

## Role

`vibly-console` is the human-facing Web UI for the Vibly coordinator network. It does **not** define HTTP contracts — those come from `@vibly/coordinator-http-contract`, which derives types from `vibly-coordinator`'s Fastify routes.

## Invariants

1. **Do not write new handwritten Coordinator paths.** Anything matching the patterns enforced by `scripts/check-handwritten-paths.mjs` (e.g. `fetch("/projects/...")`, `new EventSource("/projects/...")`) outside of `src/lib/coordinator/` will fail `pnpm lint`. New code must consume `@vibly/coordinator-http-contract`.
2. **Migration target is `src/lib/coordinator/client.ts`.** Existing handwritten paths inside that file are grandfathered and being migrated method-by-method to `this.contract.GET(...)`. Each migrated method should:
   - call the contract via `this.contract.METHOD("/path", { params, body })`,
   - check `result.response.ok` (the openapi-fetch discriminated union is unreliable when the OpenAPI does not declare error responses),
   - unwrap envelopes via `unwrapEnvelope` / `unwrapListEnvelope`,
   - translate `CoordinatorApiError` (from the contract) into `ConsoleApiError` via `runContract` to keep the existing `ConsoleApiError` surface stable.
3. **`Entity` (`Record<string, unknown>`) is deprecated.** It only exists to keep the legacy un-migrated methods compiling. Any newly-migrated method should expose generated types from `@vibly/coordinator-http-contract/types` (paths/components) instead of `Entity`.
4. **The `/api/coordinator/[...path]` proxy is a transport detail.** Do not add Coordinator path knowledge there. Append-only behaviour like `__coordinatorUrl` / `__apiToken` query forwarding is also slated for removal once the proxy switches to server-side env injection.

## When in doubt

- Adding a new feature? If the data lives at a Coordinator endpoint not yet in `paths`, ask coordinator to add a `schema.response[200]`, refresh `openapi.json`, regenerate contract types, then call `client.contract.GET(...)`.
- Need a feature only the proxy can do (CORS, hosted tokens)? Wire the proxy specifics in `contractClient.ts` middleware, not in component code.
