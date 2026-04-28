# Vibly Console

Vibly Console is the human-facing Web Console for a Vibly / Concord coordination network. It helps sponsors, principals, guardians, reviewers, observers, and developers inspect project state, event streams, protocol traces, work and review flows, knowledge versions, rewards, and high-risk requests.

It is not an agent runtime, wallet, chain UI, governance executor, task worker, or protocol authority. Domain decisions remain in Concord SDK and `vibly-coordinator`; this UI visualizes Coordinator APIs and sends explicit human operations where the Coordinator exposes them.

## Relationship to Other Repositories

- `concord`: protocol kernel, shared domain packages, trace/replay/verify logic.
- `vibly-coordinator`: API, projections, event stream, auth, and source of Console data.
- `vibly-client`: agent-side CLI/daemon; not required by Console at runtime.
- `vibly-chain`: future chain/indexer data source through Coordinator or adapters, not a direct P3 dependency.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open:

```txt
http://localhost:3000
```

Expected local Coordinator:

```txt
http://localhost:8787
```

The P1 development token defaults to:

```txt
dev-token
```

## Environment Variables

```bash
NEXT_PUBLIC_APP_NAME=Vibly Console
NEXT_PUBLIC_COORDINATOR_URL=http://localhost:8787
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
COORDINATOR_URL=http://localhost:8787
NEXT_PUBLIC_DEMO_API_TOKEN=dev-token
```

Console supports two connection modes:

- Direct browser mode: browser calls Coordinator directly. Coordinator must allow CORS.
- Proxy mode: browser calls `/api/coordinator/*`, then Next.js forwards to Coordinator.

The development login stores the API token in browser localStorage. Do not use production secrets here.

## Main Pages

- `/login`: Coordinator URL, token, and mode.
- `/projects`: project list.
- `/projects/:projectId`: dashboard summary.
- `/projects/:projectId/objectives`: objectives.
- `/projects/:projectId/boundary`: boundary and boundary evaluation.
- `/projects/:projectId/agents`: principals, agents, runtime-oriented records.
- `/projects/:projectId/state`: latest StateView.
- `/projects/:projectId/knowledge`: versions and candidates.
- `/projects/:projectId/inputs`: event-derived external inputs when Coordinator lacks a list API.
- `/projects/:projectId/observations`: observation reports.
- `/projects/:projectId/assignments`: assignments and lease-derived rows.
- `/projects/:projectId/actions`: ActionIntent rows and policy-related inspection.
- `/projects/:projectId/negotiations`: negotiation rows and submit-position form.
- `/projects/:projectId/work`: open work orders.
- `/projects/:projectId/reviews`: review rows and human review form.
- `/projects/:projectId/rewards`: reward intents and mock ledger summary.
- `/projects/:projectId/reputation`: evidence display only; not a protocol score.
- `/projects/:projectId/governance`: governance intent and human request event views.
- `/projects/:projectId/guardian`: high-risk request inspection and disabled fallback for unsupported Guardian APIs.
- `/projects/:projectId/traces`: trace list and create trace.
- `/projects/:projectId/traces/:traceId`: trace metadata, event timeline, verify, and replay.
- `/projects/:projectId/events`: event history and SSE stream.
- `/projects/:projectId/settings`: local console configuration.

## Development Commands

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

## Testing

Unit and component tests use Vitest with jsdom:

```bash
pnpm test
```

E2E tests use Playwright and a mocked Coordinator through route interception:

```bash
pnpm e2e
```

If Playwright browsers are not installed locally, install them in your environment before running E2E:

```bash
pnpm exec playwright install
```

## Known Limitations

- Console does not implement SDK domain rules or Coordinator server logic.
- Guardian decisions, HumanRequest lists, ExternalInput lists, SettlementIntent lists, and ReputationEvidence lists degrade to event-derived or disabled UI when Coordinator lacks dedicated APIs.
- Direct browser SSE cannot attach custom authorization headers, so Console uses its Next.js proxy route for project event streams.
- No wallet signing, real OpenGov UI, EVM governor UI, production RBAC, chain transaction flow, or agent execution is included in P3.
- Reputation summaries are UI evidence summaries only, never final protocol scores.
