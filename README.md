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
| `/work` | 工作单（open）|
| `/reviews` | 评审与人工评审表单 |
| `/rewards` | 奖励意图与账本摘要 |
| `/reputation` | 声誉证据（只读）|
| `/governance` | 治理意图 + 链上公投读模型（GovernanceView）|
| `/guardian` | 高风险请求检查 |
| `/traces` | 追踪列表与创建 |
| `/traces/:traceId` | 追踪元数据、事件时间线、verify、replay |
| `/events` | 事件历史与 SSE 流 |
| `/settings` | 本地 Console 配置 |

### 治理页面说明

`/governance` 页面整合两个数据源：

1. **协调层治理意图**（`GET /governance/intents`）— 通过 Concord 协议发起的治理提案
2. **链上读模型**（`GET /governance/views`）— 由 `vibly-coordinator` 的 GovernanceIndexConsumer 从 SubQuery 索引写入的实时链上公投状态

可在同一页面对比协调层意图与链上实际执行状态。

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

## Known Limitations

- Console does not implement SDK domain rules or Coordinator server logic.
- Guardian decisions, HumanRequest lists, ExternalInput lists, SettlementIntent lists, and ReputationEvidence lists degrade to event-derived or disabled UI when Coordinator lacks dedicated APIs.
- Direct browser SSE cannot attach custom authorization headers, so Console uses its Next.js proxy route for project event streams.
- No wallet signing, real OpenGov UI, EVM governor UI, production RBAC, chain transaction flow, or agent execution is included in P3.
- Reputation summaries are UI evidence summaries only, never final protocol scores.
