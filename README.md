# Vibly Console

Vibly Console 是面向人类参与者的 Web 控制台，用于可视化 Vibly / Concord 协调网络的完整状态。支持赞助方、委托人、监护人、评审者、观察者和开发者查看项目状态、事件流、协议追踪、工作评审流程、知识版本、奖励，以及链上治理读模型。

Console **不是** agent 运行时、钱包、链浏览器、治理执行器或协议权威。所有领域决策在 Concord SDK 和 `vibly-coordinator` 中执行；Console 仅可视化 Coordinator API，并提供明确的人工操作入口。

## 仓库关系

```
vibly-chain (solo-node, OpenGov)
       │ ws://9944
       ▼
vibly-indexer (SubQuery, GraphQL :3010)
       │
       ▼
vibly-coordinator (REST API :8787)  ←── concord (SDK 内核)
       │ HTTP
       ▼
vibly-console (Next.js :3000)        ← 本仓库
       ▲
vibly-client (CLI, 独立运行，不被 Console 依赖)
```

## 本地启动

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

默认地址：

- Console：`http://localhost:3000`
- Coordinator：`http://localhost:8787`

## 认证模型

Console 是面向多用户的正式 Web UI，使用 [Auth.js v5](https://authjs.dev) 在服务端做身份验证：

- 用户走 `/login` 登录到 OIDC IdP（生产环境）或 Dev Credentials（开发环境）。
- 浏览器只持有 HttpOnly Auth.js session cookie，**不**存储 Coordinator API token，也**不**把 token 放进 URL/查询串/localStorage。
- 所有 Coordinator REST/SSE 请求走同源 `/api/coordinator/*`，由 Next.js 路由处理器在服务端从 env / session 解析 Coordinator URL 与 Bearer token，再转发到上游。
- `src/proxy.ts`（Next.js 16 代替 `middleware.ts`）保护 `/projects/*` 与 `/api/coordinator/*`，未登录会被重定向到 `/login` 或返回 401。

## 环境变量

服务端必填（生产）：

```bash
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true            # 当部署在反代/容器后面时设置
AUTH_OIDC_ISSUER=https://idp.example.com
AUTH_OIDC_CLIENT_ID=...
AUTH_OIDC_CLIENT_SECRET=...
COORDINATOR_URL=http://localhost:8787
COORDINATOR_API_TOKEN=<server-side coordinator token>
```

仅前端展示用（公开）：

```bash
NEXT_PUBLIC_APP_NAME=Vibly Console
NEXT_PUBLIC_COORDINATOR_URL=http://localhost:8787
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
```

开发可选：

```bash
AUTH_DEV_CREDENTIALS=true       # 启用 dev email-only sign-in（无需配置 IdP）
```

> 注意：`COORDINATOR_API_TOKEN` 永远只存在于服务端 env，不会下发到浏览器。

## 页面列表

### 全局

- `/login` — OAuth/OIDC 登录入口（dev 模式下还提供 email-only sign-in）
- `/projects` — 项目列表（受 `src/proxy.ts` 保护）

### 项目详情（`/projects/:projectId/`）

| 路径 | 内容 |
|---|---|
| `/` | Dashboard 摘要 |
| `/objectives` | 目标列表 |
| `/boundary` | 边界与评估 |
| `/agents` | 委托人、Agent、运行时绑定 |
| `/state` | 最新 StateView |
| `/knowledge` | 知识版本和候选 |
| `/inputs` | 外部输入（事件派生）|
| `/observations` | 观察报告 |
| `/assignments` | 分配与租约 |
| `/actions` | 行动意图与策略检查 |
| `/negotiations` | 协商与立场提交 |
| `/timeline` | Phase G 人类可读协作 timeline |
| `/work` | 工作单（open）|
| `/reviews` | 评审与人工评审表单 |
| `/rewards` | 奖励意图与账本摘要 |
| `/reputation` | 声誉证据（只读）|
| `/governance` | 统一治理 merged view、人类请求、backend capability 与 freshness 摘要 |
| `/phase-f` | Phase F 测试 Agent 协作 smoke 结果与 Guardian/trace 状态 |
| `/phase-h` | Phase H mock ledger 激励、声誉、slash 与 Guardian 风险状态 |
| `/guardian` | 高风险请求检查 |
| `/traces` | 追踪列表与创建 |
| `/traces/:traceId` | 追踪元数据、事件时间线、verify、replay |
| `/events` | 事件历史与 SSE 流 |
| `/settings` | 本地 Console 配置 |

### 治理页面说明

`/governance` 页面整合 coordinator 的统一治理读模型：

1. **Merged governance view**（`GET /governance/merged`）— coordinator 合并后的 intent、链上 subject、投票活动与 checkpoint freshness。
2. **Backend descriptors**（`GET /governance/backends`）— 用于显示 `substrate-opengov`、`evm-governor` 等后端的读写 capability、health/freshness 与只读/钱包动作占位状态。
3. **Human requests**（`GET /events` 派生）— 高风险人工请求仍作为辅助记录展示。

Phase E 中，治理表格还会展示 submit receipt、pending indexer readback、linked subject 与 vote readback 状态。Console 仍不直接调用 EVM RPC、SubQuery 或链上 signer；所有链状态都来自 coordinator merged view。EVM Governor 在 Phase D.5 中只作为 coordinator 返回的 backend-neutral merged subject 和 fixture backend 渲染，钱包签名 UI 暂不实现。

### Phase F 页面说明

`/phase-f` 页面通过 coordinator 读取 `/phase-f/runs` 与 `/guardian-requests`，展示 Observer、Delegate、Worker、Reviewer、Guardian 的 scripted smoke 结果、accepted work/review 状态、Guardian request 状态以及 trace verify/replay 摘要。开发工具开启时，可从页面触发 coordinator 的 dev-only `/phase-f/smoke`；Console 仍不直接运行 agent。

### Phase G 页面说明

Phase G 让项目 Dashboard、`/timeline`、`/phase-f`、`/guardian`、`/governance` 和 trace detail 以人类可读方式解释协作过程。Console 会默认订阅 `GET /projects/:projectId/stream` 的 SSE 事件流，通过 Next.js proxy 连接 coordinator；收到事件后局部追加 live events，并刷新相关 React Query 视图。SSE 不可用时，用户仍可使用手动刷新。

### Phase H 页面说明

`/phase-h` 页面读取 coordinator 的 Phase H overview/runs、reward intents、reputation evidence 与 slash requests，展示 mock ledger 激励/风险闭环。Dashboard 会显示 claimable rewards、reputation evidence、slash requests 与 Guardian risk counts；Rewards 页面提供 mock reserve/claim 操作。Console 不直接调用链 RPC，Phase H 的真实 Vibly chain settlement 留给后续阶段。

## 开发命令

```bash
pnpm dev        # Next.js 开发服务器
pnpm build      # 生产构建
pnpm lint       # ESLint
pnpm test       # Vitest 单元/组件测试（jsdom）
pnpm e2e        # Playwright E2E 测试
```

E2E tests use Playwright and a mocked Coordinator through route interception:

```bash
pnpm e2e
```

If Playwright browsers are not installed locally, install them in your environment before running E2E:

```bash
pnpm exec playwright install
```

On fresh Linux/WSL environments, install browser system dependencies as well:

```bash
pnpm exec playwright install-deps chromium
```

## Known Limitations

- Console does not implement SDK domain rules or Coordinator server logic.
- Guardian decisions, ExternalInput lists, SettlementIntent lists, and ReputationEvidence lists degrade to event-derived or disabled UI when Coordinator lacks dedicated APIs.
- Direct browser SSE cannot attach custom authorization headers, so Console uses its Next.js proxy route for project event streams.
- No wallet signing, real OpenGov UI, EVM governor UI, production RBAC, chain transaction flow, or agent execution is included in P3.
- Reputation summaries are UI evidence summaries only, never final protocol scores.
