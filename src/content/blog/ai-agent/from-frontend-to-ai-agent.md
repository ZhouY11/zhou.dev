---
title: 从前端开发到 AI Agent：我的 Agent 工程化学习与实践
description: 用于记录和实践 AI Agent 工程化、工具调用、上下文管理与应用开发的实验项目。
publishedAt: 2026-08-19
updatedAt: 2026-08-19
tags:
  - AI Agent
  - TypeScript
  - LLM
series:
  id: from-frontend-to-ai-agent
  order: 1
featured: true
draft: false
---

## 从前端运行时进入 AI Agent 后端

真正开始学习 AI Agent 开发之后，我遇到的第一个问题并不是 Prompt，也不是 RAG，更不是 Agent 框架，而是后端。

作为长期从事前端开发的人，我对 JavaScript、TypeScript、Promise、HTTP 和 Event Loop 并不陌生，但过去大多数代码都运行在浏览器中。

而一个真正的 Agent 系统通常需要完成：

- 调用模型 API
- 保存 Agent Task
- 管理用户会话
- 调用数据库
- 执行 Tool
- 读取代码仓库
- 运行测试
- 保存 Trace
- 管理 API Key
- 执行高风险操作审批

这些能力决定了 Agent 的核心运行环境必须放在服务端。

因此我的 AI Agent 学习并没有直接从某个 Agent Framework 开始，而是先补齐 Node.js 服务端运行模型。

### 浏览器与 Node.js 最大的差异不是 API，而是生命周期

前端 Vue 应用通常跟随浏览器页面生命周期存在：

```text
打开页面
  ↓
加载 JavaScript
  ↓
创建 Vue Application
  ↓
处理用户交互
  ↓
关闭页面
  ↓
运行环境销毁
```

Node.js 服务却完全不同：

```text
启动 Node Process
  ↓
加载配置
  ↓
创建 Application
  ↓
监听 HTTP Port
  ↓
持续处理不同用户请求
  ↓
直到进程关闭或重新部署
```

这意味着一个非常重要的变化：

> Node 服务不是每个请求重新执行一次程序，而是一个长期运行的进程持续处理大量请求。

例如：

```ts
let requestCount = 0;

app.get('/count', async () => {
  requestCount++;

  return {
    requestCount,
  };
});
```

连续访问接口时会得到：

```text
1
2
3
...
```

`requestCount` 并不会因为一次请求结束而自动消失。

这个实验看起来非常简单，却直接影响后面 Agent State 的设计。

如果错误地把：

```ts
let currentUserId: string;
```

放到共享模块状态中，不同用户请求之间就可能互相覆盖。

因此以后设计 Agent 系统时必须持续区分：

```text
Process State
Request State
User State
Session State
Agent Task State
Persistent State
```

这也是服务端开发和前端组件状态管理之间一个很重要的认知迁移。

---

## 为什么 API Key 必须留在服务端

在 Vite 项目里：

```ts
import.meta.env.VITE_OPENAI_API_KEY;
```

即使值最初来自 `.env`，只要它进入客户端构建代码，就不能被视为 Secret。

所以正确的 Agent 调用结构应该是：

```text
Vue
  ↓
自己的 API
  ↓
Fastify
  ↓
LLM Provider
```

浏览器并不直接获得模型 API Key。

这个结构未来还会继续承担：

```text
Authentication
Authorization
Rate Limit
Tool Permission
Cost Control
Audit
Agent State
```

因此 Fastify API 并不是简单的“模型 API 代理层”，而会逐渐成为整个 Agent Runtime 的重要边界。

---

## 使用 Zod 在程序启动阶段验证配置

服务端出现了一个前端开发中容易忽视的问题：

```ts
process.env.PORT;
```

它的类型并不是：

```ts
number;
```

而是：

```ts
string | undefined;
```

即使配置文件里写的是：

```bash
PORT=3000
```

Node 收到的依然是字符串 `"3000"`。

于是我开始使用 Zod 给应用配置建立 Runtime Schema：

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  HOST: z.string().trim().min(1).default('127.0.0.1'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});
```

这里真正重要的并不是 Zod 的 API，而是一个原则：

> TypeScript 只能约束编译时期由我们控制的代码，无法保证运行时进入系统的数据一定符合类型。

环境变量如此。

后面还会遇到：

```text
HTTP Request
LLM Structured Output
Tool Arguments
MCP Input
External API
Database Import
```

这些数据都属于外部输入，都必须重新进行 Runtime Validation。

因此 Zod 后面不仅会出现在 HTTP API 中，还会贯穿整个 Agent 系统。

---

## Fail Fast：配置错误时不要启动服务

对于错误配置：

```text
PORT=abc
```

与其让服务先启动，等用户请求真正进入系统后再失败，不如在程序初始化阶段就阻止服务运行。

```ts
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(z.prettifyError(parsed.error));

  process.exit(1);
}
```

这里引出了另一个服务端概念：Process Exit Code。

```text
0
→ 程序成功退出

非 0
→ 程序异常退出
```

这个值不仅是 Node 自己使用。

它还会被：

```text
Shell
Docker
CI/CD
Process Manager
Cloud Platform
```

读取。

所以一个后端程序最终不仅要“能运行”，还需要正确地向运行环境表达自己的状态。

---

## Graceful Shutdown：服务不是直接关掉就结束了

本地开发时按下：

```text
Ctrl + C
```

通常会触发：

```text
SIGINT
```

而 Docker、云平台或 Linux 服务停止时通常会发送：

```text
SIGTERM
```

如果程序收到信号后立即消失，正在执行的：

```text
HTTP Request
Database Transaction
Agent State Write
Trace Export
File Operation
```

都有可能被直接中断。

所以服务需要一个 Graceful Shutdown：

```ts
async function shutdown() {
  await app.close();
}
```

完整思路是：

```text
收到关闭信号
  ↓
停止接收新请求
  ↓
处理已有请求
  ↓
释放数据库等资源
  ↓
完成 Trace / Log
  ↓
退出 Node Process
```

这个知识点后面进入 Agent Task Persistence 时会变得更加重要。

一个可能执行几十秒甚至几分钟的 Agent，不应该因为一次服务器更新就无条件丢失整个执行状态。

---

## 为什么当前没有使用 tsup

前端工程经验让我一开始很自然地想到：

> TypeScript 项目是不是应该再用一个 Bundler？

但目前的 Fastify API 并不需要。

现在的执行链：

```text
TypeScript
  ↓
tsc
  ↓
ESM JavaScript
  ↓
Node.js
```

已经完整。

浏览器需要 Bundling 的一个重要原因是资源需要跨网络加载，而 Node.js 中：

```ts
import './app.js';
```

是服务器本地模块加载。

所以：

```text
100 个 Node Module
```

并不等于：

```text
浏览器产生 100 个 HTTP Request
```

当前使用 Bundler 反而会引入：

```text
entry
external
bundle
splitting
format
```

等额外复杂度。

因此目前：

```text
Fastify Application
→ tsc

未来需要 npm Library / CLI Distribution
→ 再评估 tsdown 等 Bundler
```

这是我在这个项目中逐渐形成的一条工程原则：

> 构建工具应该解决真实存在的问题，而不是因为“现代项目通常这么做”就默认引入。

---

# Fastify Route：HTTP 世界与业务世界的边界

建立最小服务之后，第二步开始理解 Fastify Route。

一个 HTTP Request：

```http
POST /projects/p-001/tasks?notify=true

Authorization: Bearer xxx

{
  "title": "Analyze repository"
}
```

进入 Fastify 后，可以拆成：

```text
Params
→ p-001

Query
→ notify=true

Headers
→ Authorization

Body
→ title
```

对应：

```ts
request.params;
request.query;
request.headers;
request.body;
```

Fastify Route Generic 可以为这些属性提供 TypeScript 类型：

```ts
app.post<{
  Params: Params;
  Querystring: Query;
  Body: Body;
  Headers: Headers;
}>('/projects/:projectId/tasks', handler);
```

但这里出现了一个非常重要的陷阱。

假设：

```ts
interface CreateTaskBody {
  title: string;
}
```

即使我告诉 TypeScript：

```ts
Body: CreateTaskBody;
```

客户端依然完全可以发送：

```json
{
  "title": 123
}
```

因为 TypeScript 类型在代码编译之后已经不存在。

所以：

```text
Route Generic
→ 给开发者提供 Compile-time Type

Runtime Schema
→ 验证真实 HTTP Input
```

两者解决的是完全不同的问题。

这也自然引出了下一阶段：

> 如何让 Fastify 的 HTTP Runtime Validation、Zod Schema 和 TypeScript 类型真正统一起来。

---

## Route / Service / Repository

随着 Task API 增加，我也开始把后端代码按职责拆开：

```text
Route
  ↓
Service
  ↓
Repository
```

Route 负责：

```text
HTTP 输入
HTTP Status
Header
Response
```

Service 负责：

```text
业务规则
权限判断
任务状态变化
Agent 业务流程
```

Repository 负责：

```text
数据存取
```

例如：

```text
读取 request.body
→ Route

一个 Project 最多同时运行 3 个 Agent Task
→ Service

INSERT PostgreSQL
→ Repository

返回 HTTP 201
→ Route
```

这种分层并不是为了模仿某种“企业级架构”。

它真正解决的问题是：

> HTTP、业务逻辑和数据存储不应该因为彼此变化而全部耦合在一起。

未来 Repository 会从：

```text
Map
```

切换为：

```text
PostgreSQL
```

但 Service 不应该因此重写。

同样，未来 Agent Tool 可能会由普通函数切换成 MCP Tool，核心业务规则也不应该完全跟着变化。

---

## 当前阶段得到的核心结论

经过最开始的学习，我对 AI Agent 开发的理解已经发生了一点变化。

原本很容易把 Agent 开发想成：

```text
Prompt
+
LLM
+
几个 Tool
```

但真正开始做工程之后，更接近：

```text
Frontend
+
Backend Runtime
+
Validation
+
State
+
Tool
+
LLM
+
Persistence
+
Security
+
Observability
+
Eval
```

模型只是其中一个非常重要的组件，而不是整个系统。

目前我们甚至还没有真正接入模型。

但这部分 Node、HTTP、Runtime Validation 和服务生命周期的基础，会直接决定后面 Agent 系统能不能做成一个真正可靠的软件产品。

下一步会继续解决目前代码中故意留下的问题：

```ts
interface CreateTaskBody {
  title: string;
}
```

为什么不能保护真实接口？

以及：

> 如何使用 Zod + Fastify 同时获得 Runtime Validation 和 TypeScript 类型安全。
