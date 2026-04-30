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
- 开发 token：`dev-token`

## 环境变量

```bash
NEXT_PUBLIC_APP_NAME=Vibly Console
NEXT_PUBLIC_COORDINATOR_URL=http://localhost:8787
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
COORDINATOR_URL=http://localhost:8787
NEXT_PUBLIC_DEMO_API_TOKEN=dev-token
```

Console 支持两种连接模式：

- **直连模式**：浏览器直接调用 Coordinator（需要 Coordinator 开启 CORS）
- **代理模式**：浏览器调用 `/api/coordinator/*`，由 Next.js 转发到 Coordinator

## 页面列表

### 全局

- `/login` — Coordinator URL、token 和连接模式
- `/projects` — 项目列表

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
