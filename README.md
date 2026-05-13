# Vibly Console

Vibly Console is the human-facing Web UI for the Vibly coordination network. It visualises the full state of a Vibly deployment — projects, event streams, protocol traces, work review flows, knowledge versions, rewards, and on-chain governance — for sponsors, principals, guardians, reviewers, observers, and developers.

Console is **not** an agent runtime, wallet, chain explorer, governance executor, or protocol authority. All domain decisions execute inside the Concord SDK and `vibly-coordinator`; Console visualises the Coordinator API and provides explicit human-action entry points.

## System context

```
vibly-chain (solo-node)
       │ ws://9944
       ▼
vibly-indexer (SubQuery GraphQL :3010)
       │
       ▼
vibly-coordinator (REST/SSE :8787)  ←── @concord/sdk
       │ HTTP (server-side proxy)
       ▼
vibly-console (Next.js :3000)           ← this repository
```

`vibly-client` (CLI/daemon) is an independent consumer of the coordinator and is not a dependency of Console.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in required variables
pnpm dev
```

Default addresses: Console `http://localhost:3000` · Coordinator `http://localhost:8787`

## Environment variables

### Required (production)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret for Auth.js session signing (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Set `true` when running behind a reverse proxy or container |
| `AUTH_OIDC_ISSUER` | OIDC provider issuer URL |
| `AUTH_OIDC_CLIENT_ID` | OIDC client ID |
| `AUTH_OIDC_CLIENT_SECRET` | OIDC client secret |
| `COORDINATOR_URL` | Upstream coordinator base URL (server-side only) |
| `COORDINATOR_API_TOKEN` | Bearer token for coordinator calls (server-side only, never sent to the browser) |

### Public (client-visible)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Display name (default `Vibly Console`) |
| `NEXT_PUBLIC_COORDINATOR_URL` | Coordinator URL for UI display only |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | Set `true` to show developer tooling |

### Development only

| Variable | Description |
|---|---|
| `AUTH_DEV_CREDENTIALS` | Set `true` to enable email-only sign-in without an IdP |

## Authentication model

Console uses [Auth.js v5](https://authjs.dev) for server-side authentication:

- Users sign in at `/login` via OIDC (production) or Dev Credentials (development).
- The browser holds only an HttpOnly Auth.js session cookie. `COORDINATOR_API_TOKEN` is **never** sent to the browser, stored in localStorage, or embedded in URLs.
- All coordinator REST/SSE calls are proxied through `/api/coordinator/*`. The Next.js route handler resolves the upstream coordinator URL and Bearer token from server-side configuration (`src/lib/server/coordinatorSession.ts`).
- `src/proxy.ts` (Next.js middleware) protects `/projects/*` and `/api/coordinator/*`; unauthenticated requests are redirected to `/login` or return 401.

## Pages

### Global

| Path | Content |
|---|---|
| `/login` | OAuth/OIDC sign-in (Dev Credentials available when `AUTH_DEV_CREDENTIALS=true`) |
| `/projects` | Project list |

### Project detail (`/projects/:projectId/`)

| Path | Content |
|---|---|
| `/` | Dashboard summary |
| `/objectives` | Project objectives |
| `/boundary` | Boundary and evaluation |
| `/agents` | Principals, agents, runtime bindings |
| `/state` | Latest StateView |
| `/knowledge` | Knowledge versions and candidates |
| `/inputs` | External inputs |
| `/observations` | Observation reports |
| `/assignments` | Assignments and leases |
| `/actions` | Action intents and policy checks |
| `/negotiations` | Negotiations and position submissions |
| `/timeline` | Human-readable collaboration timeline |
| `/work` | Open work items |
| `/reviews` | Reviews and human review forms |
| `/rewards` | Reward intents and ledger summary |
| `/reputation` | Reputation evidence (read-only) |
| `/governance` | Unified governance merged view, backend capabilities, freshness |
| `/guardian` | High-risk request review |
| `/traces` | Trace list and creation |
| `/traces/:traceId` | Trace metadata, event timeline, verify, replay |
| `/events` | Event history and live SSE stream |
| `/settings` | Local Console configuration |

## Live event streaming

Console subscribes to `GET /projects/:projectId/stream` (coordinator SSE) through the Next.js proxy at `/api/coordinator/projects/:id/stream`. Incoming events are appended to the live event list and trigger React Query cache invalidations for affected views. Manual refresh is always available as a fallback.

## Development commands

```bash
pnpm dev        # Next.js development server
pnpm build      # Production build
pnpm lint       # ESLint + check-handwritten-paths (enforces contract-backed calls)
pnpm test       # Vitest unit/component tests (jsdom)
pnpm e2e        # Playwright end-to-end tests
```

### Playwright setup

```bash
pnpm exec playwright install           # install browsers
pnpm exec playwright install-deps chromium  # Linux/WSL system dependencies
pnpm e2e
```

## Known limitations

- No wallet signing, real OpenGov execution, EVM governor UI, production RBAC, or agent execution.
- Direct browser SSE cannot attach custom `Authorization` headers; the Next.js proxy route is used for all project event streams.
- Guardian decisions, external input lists, and reputation summaries are UI-only evidence displays, not final protocol scores.
