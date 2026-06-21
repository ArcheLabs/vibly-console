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
| `VIBLY_COORDINATOR_NETWORK_PROFILES` | Optional server-side JSON array mapping network profile ids to coordinator URLs |
| `COORDINATOR_API_TOKEN` | Bearer token for coordinator calls (server-side only, never sent to the browser) |
| `NEXT_PUBLIC_COORDINATOR_TRANSPORT` | `proxy` for Next.js server deployments, `direct` for static hosting such as GitHub Pages |

### Public (client-visible)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Display name (default `Vibly Console`) |
| `NEXT_PUBLIC_COORDINATOR_URL` | Coordinator URL for UI display only |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | Set `true` to show developer tooling |
| `NEXT_PUBLIC_VIBLY_NETWORK_ID` | Default Console network profile id |
| `NEXT_PUBLIC_VIBLY_NETWORK_NAME` | Default Console network display name |
| `NEXT_PUBLIC_VIBLY_RPC_URL` | Default Vibly Chain RPC used by browser-side chain actions |
| `NEXT_PUBLIC_POLKADOT_RPC_URL` | Optional Polkadot-compatible RPC alias/fallback for wallet and chain utilities |
| `NEXT_PUBLIC_VIBLY_NETWORK_PROFILES` | Optional JSON array of selectable network profiles. Prefer URL arrays (`coordinatorUrls`, `viblyRpcUrls`) so Console can fail over when one endpoint is down. |
| `NEXT_PUBLIC_VIBLY_NETWORK_MANIFEST_URL` | Bootstrap network manifest URL; defaults to `https://vibly.network/networks.json` |

