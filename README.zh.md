# Vibly Console

Vibly Console 是 Vibly 协调网络面向人类用户的 **Web 控制台**。它为赞助方、委托人、守护者、审核者、观察者和开发者呈现 Vibly 部署的完整状态 — 项目、事件流、协议追踪、工作审核流程、知识版本、奖励及链上治理。

Console **不是**代理运行时、钱包、链浏览器、治理执行器或协议权威。所有领域决策在 Concord SDK 和 `vibly-coordinator` 内部执行；Console 可视化 Coordinator API 并提供人工操作入口。

## 系统上下文

```
vibly-chain（单节点）
       │ ws://9944
       ▼
vibly-indexer（SubQuery GraphQL :3010）
       │
       ▼
vibly-coordinator（REST/SSE :8787）  ←── @concord/sdk
       │ HTTP（服务端代理）
       ▼
vibly-console（Next.js :3000）           ← 本仓库
```

`vibly-client`（CLI/守护进程）是协调器的独立消费者，不是 Console 的依赖项。

## 快速开始

```bash
pnpm install
cp .env.example .env.local   # 填写必要变量
pnpm dev
```

默认地址：Console `http://localhost:3000` · 协调器 `http://localhost:8787`

## 环境变量

### 必填（生产环境）

| 变量 | 说明 |
|---|---|
| `AUTH_SECRET` | Auth.js session 签名随机密钥（`openssl rand -base64 32`） |
| `AUTH_TRUST_HOST` | 运行在反向代理或容器后时设为 `true` |
| `AUTH_OIDC_ISSUER` | OIDC 提供商签发者 URL |
| `AUTH_OIDC_CLIENT_ID` | OIDC 客户端 ID |
| `AUTH_OIDC_CLIENT_SECRET` | OIDC 客户端密钥 |
| `COORDINATOR_URL` | 上游协调器基础 URL（仅服务端） |
| `VIBLY_COORDINATOR_NETWORK_PROFILES` | 可选的服务端 JSON 数组，用于按网络 profile id 映射协调器 URL |
| `COORDINATOR_API_TOKEN` | 协调器调用的 Bearer token（仅服务端，永不发送至浏览器） |

### 公开变量（客户端可见）

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | 显示名称（默认 `Vibly Console`） |
| `NEXT_PUBLIC_COORDINATOR_URL` | 仅用于 UI 展示的协调器 URL |
| `NEXT_PUBLIC_ENABLE_DEV_TOOLS` | 设为 `true` 以显示开发者工具 |
| `NEXT_PUBLIC_VIBLY_NETWORK_ID` | 默认 Console 网络 profile id |
| `NEXT_PUBLIC_VIBLY_NETWORK_NAME` | 默认 Console 网络显示名称 |
| `NEXT_PUBLIC_VIBLY_RPC_URL` | 默认 Vibly Chain RPC，用于浏览器领取流程 |
| `NEXT_PUBLIC_VIBLY_NETWORK_PROFILES` | 可选的网络 profile JSON 数组（`id`、`label`、`stage`、`polkadotRpcUrl`、`viblyRpcUrl`、`relayTokenSymbol`） |

### 仅限开发

| 变量 | 说明 |
|---|---|
| `AUTH_DEV_CREDENTIALS` | 设为 `true` 以启用无 IdP 的仅邮箱登录 |

## 认证模型

Console 使用 [Auth.js v5](https://authjs.dev) 进行服务端认证：

- 用户通过 OIDC（生产）或开发凭证（开发）在 `/login` 登录。
- 浏览器仅持有 HttpOnly Auth.js session cookie。`COORDINATOR_API_TOKEN` **永不**发送至浏览器、存储在 localStorage 或嵌入 URL。
- 所有协调器 REST/SSE 调用均通过 `/api/coordinator/*` 代理。Next.js 路由处理器从服务端配置（`src/lib/server/coordinatorSession.ts`）解析上游协调器 URL 和 Bearer token。
- `src/proxy.ts`（Next.js 中间件）保护 `/projects/*` 和 `/api/coordinator/*`；未认证请求将被重定向至 `/login` 或返回 401。

## 页面

### 全局

| 路径 | 内容 |
|---|---|
| `/login` | OAuth/OIDC 登录（`AUTH_DEV_CREDENTIALS=true` 时可用开发凭证） |
| `/projects` | 项目列表 |

### 项目详情（`/projects/:projectId/`）

| 路径 | 内容 |
|---|---|
| `/` | 仪表板摘要 |
| `/objectives` | 项目目标 |
| `/boundary` | 边界与评估 |
| `/agents` | 委托人、代理、运行时绑定 |
| `/state` | 最新 StateView |
| `/knowledge` | 知识版本与候选 |
| `/inputs` | 外部输入 |
| `/observations` | 观察报告 |
| `/assignments` | 任务分配与租约 |
| `/actions` | 动作意图与策略检查 |
| `/negotiations` | 协商与立场提交 |
| `/timeline` | 人类可读的协作时间线 |
| `/work` | 开放工作项 |
| `/reviews` | 审核与人工审核表单 |
| `/rewards` | 奖励意图与账本摘要 |
| `/reputation` | 信誉证据（只读） |
| `/governance` | 统一治理合并视图、后端能力、新鲜度 |
| `/guardian` | 高风险请求审核 |
| `/traces` | 追踪列表与创建 |
| `/traces/:traceId` | 追踪元数据、事件时间线、验证、重放 |
| `/events` | 事件历史与实时 SSE 流 |
| `/settings` | 本地 Console 配置 |

## 实时事件流

Console 通过 Next.js 代理路由 `/api/coordinator/projects/:id/stream` 订阅 `GET /projects/:projectId/stream`（协调器 SSE）。传入事件被追加到实时事件列表，并触发受影响视图的 React Query 缓存失效。手动刷新始终可作为备选方案。

## 开发命令

```bash
pnpm dev        # Next.js 开发服务器
pnpm build      # 生产构建
pnpm lint       # ESLint + check-handwritten-paths（强制合约驱动调用）
pnpm test       # Vitest 单元/组件测试（jsdom）
pnpm e2e        # Playwright 端到端测试
```

### Playwright 配置

```bash
pnpm exec playwright install                    # 安装浏览器
pnpm exec playwright install-deps chromium      # Linux/WSL 系统依赖
pnpm e2e
```

## 已知限制

- 不支持钱包签名、真实 OpenGov 执行、EVM 治理 UI、生产级 RBAC 或代理执行。
- 浏览器直接 SSE 无法附加自定义 `Authorization` 请求头；所有项目事件流均通过 Next.js 代理路由传输。
- 守护者决策、外部输入列表和信誉摘要仅为 UI 证据展示，不代表最终协议得分。
