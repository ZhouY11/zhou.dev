---
title: 从前端开发到 AI Agent：我的 Agent 工程化学习与实践
description: 用于记录和实践 AI Agent 工程化、工具调用、上下文管理与应用开发的实验项目。
publishedAt: 2026-08-19
updatedAt: 2026-08-20
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

## Route / Service：先拆开 HTTP 与业务逻辑

随着 Task API 开始出现，我也开始第一次真正处理后端代码的职责边界。

如果把所有逻辑都直接写在 Route Handler 中，很容易得到这样的代码：

```ts
app.post('/tasks', async (request, reply) => {
  // 参数校验
  // 业务规则
  // 数据查询
  // 调用模型
  // 执行 Tool
  // 记录 Trace
  // 构造 Response
});
```

现在接口很简单时看不出问题，但未来 FrontOps Agent 会逐渐增加：

```text
Repository Analysis
Issue Analysis
LLM Calling
Tool Execution
Agent State
Persistence
Tracing
Approval
```

如果这些能力全部继续进入 Handler，HTTP 层和 Agent 业务逻辑会迅速耦合。

因此目前我先建立最小的职责划分：

```text
Route
  ↓
Service
```

Route 负责 HTTP 世界：

```text
Method
URL
Params
Query
Headers
Request Body
Status Code
Response
```

Service 则负责 Application Logic。

例如：

```ts
export function previewTask(input: TaskPreviewInput): TaskPreviewResult {
  return {
    repository: input.repository,
    question: input.question,
    mode: input.mode,
    status: 'ready',
  };
}
```

Service 不接受：

```ts
FastifyRequest;
FastifyReply;
```

也不关心：

```text
HTTP 200
HTTP Header
Cookie
```

这样做不是为了让目录看起来更加“企业级”，而是为了避免业务逻辑被 HTTP Framework 绑死。

以后同一段 Service 完全可能被：

```text
HTTP API
CLI
Background Worker
Agent Worker
```

共同调用。

至于：

```text
Repository
```

目前项目还没有真正进入 Persistence，所以暂时没有创建这一层。

后面开始使用 PostgreSQL 后，再根据真实的数据访问需求把：

```text
Route
  ↓
Service
  ↓
Repository
```

完整建立起来。

这也让我进一步确认了一条工程原则：

> abstraction 应该由真实需求推动，而不是为了提前得到一套“标准目录结构”而创建。

---

## 从手写 `safeParse()` 到 Fastify Validation Pipeline

最开始处理 HTTP Body 时，我在 Handler 中显式执行：

```ts
const parsed = taskPreviewInputSchema.safeParse(request.body);

if (!parsed.success) {
  return reply.status(400).send({
    code: 'INVALID_REQUEST',
  });
}

const result = previewTask(parsed.data);
```

这个版本虽然存在重复，但非常适合作为第一阶段实现。

因为整个 Runtime Boundary 是完全可见的：

```text
request.body
     ↓
untrusted runtime data
     ↓
Zod safeParse()
     ↓
validated input
     ↓
Service
```

通过几个故意构造的请求，我分别验证了：

```json
{
  "repository": 123
}
```

会因为类型不正确被拒绝；

```json
{
  "mode": "agent"
}
```

会因为不属于允许的 enum 被拒绝；

以及：

```json
{
  "repository": "frontend",
  "question": "Analyze",
  "mode": "architecture",
  "admin": true
}
```

会因为 Schema 使用了 `.strict()` 而拒绝未声明字段。

这些实验让我第一次真正从 Runtime 层面确认：

> HTTP Contract 不是 TypeScript interface，而是运行时真正执行的 Schema。

不过这个实现也暴露出了明显的问题。

如果未来每一个 Route 都需要：

```ts
schema.safeParse(request.body);
```

那么应用会逐渐出现大量重复的 Boundary Code。

而 Fastify 本身已经拥有完整的 Validation Lifecycle。

真正更合理的执行方式应该是：

```text
HTTP Request
     ↓
Body Parsing
     ↓
Runtime Validation
     ↓
Handler
     ↓
Service
```

也就是说：

> Validation 应该成为进入 Handler 的前置条件，而不是 Handler 自己记得执行的一项任务。

因此我把 Zod 进一步接入 Fastify Validation Pipeline。

---

## 一个 Zod Schema，同时服务 Runtime 和 TypeScript

完成集成以后，Route 可以直接声明：

```ts
server.post(
  '/preview',
  {
    schema: {
      body: taskPreviewInputSchema,
    },
  },
  async (request, reply) => {
    const result = previewTask(request.body);

    return reply.status(200).send(result);
  },
);
```

原来 Handler 中的：

```ts
safeParse();
```

消失了。

但 Runtime Validation 并没有消失。

它只是从：

```text
Handler
```

移动到了：

```text
Fastify Validation Pipeline
```

现在一次请求的实际过程变成：

```text
HTTP Request
     ↓
Fastify Parsing
     ↓
validatorCompiler
     ↓
Zod Schema
     │
     ├── invalid → 400
     │
     └── valid
            ↓
         Handler
            ↓
         Service
```

与此同时，TypeScript 还有另一条完全不同的链路：

```text
Zod Schema
     ↓
ZodTypeProvider
     ↓
TypeScript inference
     ↓
request.body
```

例如 Schema：

```ts
const taskPreviewInputSchema = z.object({
  repository: z.string(),
  question: z.string(),
  mode: z.enum(['architecture', 'issue', 'code']),
});
```

可以让：

```ts
request.body.mode;
```

自动得到：

```ts
'architecture' | 'issue' | 'code';
```

这里有一个很容易混淆、但必须明确区分的概念：

```text
validatorCompiler
→ Request Runtime Validation

serializerCompiler
→ Response Runtime Serialization

ZodTypeProvider
→ Compile-time Type Inference
```

前两个属于 Runtime。

Type Provider 属于 TypeScript 编译阶段。

它们共同使用 Schema，但解决的是不同的问题。

因此现在的结构可以抽象成：

```text
                    Zod Schema
                   /          \
                  /            \
                 ▼              ▼
             Runtime        Compile Time
                 │              │
     validatorCompiler    ZodTypeProvider
     serializerCompiler        │
                 │              ▼
                 │        Type Inference
                 ▼
          Fastify Runtime
```

这也是我目前第一次真正体会到 Schema-driven API 的价值：

> Contract 不再只是给开发者看的 TypeScript 类型，而可以同时参与 Runtime Validation、Serialization 和 Static Type Inference。

---

## Structural Validation 不是 Business Validation

Zod 可以证明：

```ts
repository: z.string();
```

意味着真实 Runtime Input 中：

```text
repository
```

确实是一个字符串。

但它无法证明：

```text
这个 Repository 真的存在
```

更无法证明：

```text
当前用户有权访问这个 Repository
```

例如：

```json
{
  "repository": "repository-that-does-not-exist",
  "question": "Analyze",
  "mode": "architecture"
}
```

完全可以通过 Zod。

所以目前我开始明确区分三个不同层次：

```text
Structural Validation
        ↓
数据结构是否合法？

Business Validation
        ↓
业务事实是否成立？

Authorization
        ↓
当前调用者是否有权执行？
```

例如：

```text
mode 必须是 architecture | issue | code
→ Structural Validation

repository 必须真实存在
→ Business Validation

当前用户可以访问 repository
→ Authorization
```

这件事情以后进入 Agent Tool Calling 时会变得更加重要。

因为模型生成：

```json
{
  "path": "../../etc/passwd"
}
```

完全可以满足：

```ts
path: z.string();
```

但：

```text
这个 path 是否允许 Tool 访问？
```

属于另外一层 Security / Permission Boundary。

因此：

> Runtime Schema Validation 是系统建立信任的第一层，但绝对不是最后一层。

---

## Error 也是 API Contract 的一部分

把 Validation 移到 Fastify Pipeline 后，我马上遇到了新的问题。

以前 Handler 自己执行：

```ts
safeParse();
```

时，可以完全控制错误响应：

```json
{
  "code": "INVALID_REQUEST",
  "message": "Request body is invalid"
}
```

Validation 移到 Framework Pipeline 后，非法请求会在 Handler 执行以前失败。

于是错误开始由 Fastify 默认 Error Handler 返回。

这意味着虽然 Validation 的职责位置更加合理，但：

> API Error Contract 开始被 Framework 默认行为控制。

因此现在第一次有了真实理由加入统一 Error Handler。

目前 API 已经能够区分：

```text
INVALID_REQUEST
→ Zod Structural Validation Error

REQUEST_ERROR
→ HTTP / Fastify Request Error

NOT_FOUND
→ Route 没有匹配

INTERNAL_SERVER_ERROR
→ Unexpected Server Error
```

这里最重要的并不是 Error Code 本身，而是开始建立：

```text
Internal Error
      ↓
Error Mapping
      ↓
Public API Error Contract
```

的意识。

例如 Fastify 自己可能产生：

```text
FST_ERR_...
```

这些 Framework Error Code 更适合进入：

```text
Server Log
Trace
Debugging
```

而不是直接成为前端长期依赖的 Public API Contract。

否则：

```text
Frontend
  ↓
依赖 Fastify Error Code
```

就会让外部协议和底层 Framework 强耦合。

---

## Framework Error 不等于 Server Error

这个过程中还有一个很重要的错误分类问题。

最简单的 Error Handler 很容易写成：

```ts
if (isValidationError(error)) {
  return reply.status(400).send(...);
}

return reply.status(500).send(...);
```

但：

> 不是 Zod Error，并不代表就是 Server Error。

例如一个 malformed JSON：

```json
{
  "repository":
}
```

请求甚至不会进入 Zod Validation。

它会更早失败：

```text
HTTP Request
     ↓
Body Parsing
     ↓
JSON Parsing ❌
```

这是一个客户端发送了非法 HTTP Payload 的问题，本质应该属于 `4xx`。

如果统一转换成：

```text
500 Internal Server Error
```

反而破坏了 HTTP 语义。

所以现在 Error Handler 至少需要能够区分：

```text
Structural Validation Error
HTTP / Framework Client Error
Unexpected Server Error
```

这也是我第一次真正开始从：

> “发生错误就 catch”

转向：

> “这个错误属于系统中的哪一个 Boundary？”

---

## 404 甚至不经过普通 Error Handler

继续测试：

```text
GET /does-not-exist
```

又暴露了另一个 Fastify Lifecycle 细节。

Router 没有找到 Route 时产生的 `404`，并不会像普通 Error 一样经过统一的 `setErrorHandler()`。

它需要单独的：

```ts
setNotFoundHandler();
```

于是 Request Pipeline 可以进一步展开：

```text
Incoming Request
       │
       ▼
     Router
       │
   ┌───┴─────┐
   │         │
matched   not found
   │         │
   ▼         ▼
Parsing   NOT_FOUND
   │
   ▼
Validation
   │
   ▼
Handler
```

这让我意识到：

> Error 的来源阶段不同，并不意味着最终都一定经过同一个 Error Hook。

以后 Agent Runtime 也会存在类似差异：

```text
Route Not Found
Task Not Found
Tool Not Found
Repository Not Found
```

表面上都叫 “Not Found”，但它们分别属于 HTTP Infrastructure、Application State、Tool Registry 和业务数据层。

---

## Response 也需要自己的 Boundary

完成 Request Validation 后，还有一个容易忽略的问题：

> Service 返回的数据，就应该完整发送给 Client 吗？

不一定。

假设以后 Agent Service 返回：

```ts
{
  answer: '...',
  taskId: 'task-001',
  internalTraceId: 'trace-001',
  rawModelResponse: ...,
  tokenUsage: ...,
  internalPrompt: ...,
}
```

这些数据可能都对 Service 内部有用。

但 Client 真正需要的可能只有：

```json
{
  "answer": "...",
  "taskId": "task-001"
}
```

因此：

```text
Service Result
      ≠
Public API Response
```

我开始为成功 Response 同样定义 Zod Schema：

```ts
const taskPreviewResponseSchema = z.object({
  repository: z.string(),
  question: z.string(),
  mode: z.enum(['architecture', 'issue', 'code']),
  status: z.literal('ready'),
});
```

然后 Route：

```ts
server.post(
  '/preview',
  {
    schema: {
      body: taskPreviewInputSchema,
      response: {
        200: taskPreviewResponseSchema,
      },
    },
  },
  async (request, reply) => {
    const result = previewTask(request.body);

    return reply.status(200).send(result);
  },
);
```

于是 HTTP 两侧开始形成对称结构：

```text
Request
  ↓
Validation
  ↓
Application

Application
  ↓
Serialization
  ↓
Response
```

`serializerCompiler` 也终于有了明确职责：

```text
Service Result
      ↓
Response Schema
      ↓
serializerCompiler
      ↓
Serialized HTTP Response
```

---

## Response Schema 也是安全边界

为了验证 Response Boundary，我做了一个简单实验：

让 Service 临时多返回：

```ts
internalNote: 'do not expose this';
```

但 Response Schema 并没有声明：

```text
internalNote
```

最终 HTTP Response 不应该因为 Service 内部对象出现了额外字段，就自动扩大 Public API Contract。

这个实验让我重新理解 Response Schema 的价值。

它不只是：

> “让返回 JSON 格式正确。”

同时也是：

```text
Data Minimization
API Contract
Sensitive Data Leakage Prevention
```

以后 FrontOps Agent 内部很可能持有：

```text
System Prompt
Raw Model Response
Tool Context
Trace
Filesystem Information
Provider Metadata
Token Usage
Secret-related Context
```

这些都不能因为它们存在于某个 JavaScript Object 中，就默认允许离开 Server Boundary。

所以：

> 输入需要建立信任，输出同样需要控制暴露范围。

---

## 一次真实的 Request Lifecycle 调试

这一阶段还遇到了一个很有代表性的调试问题。

最开始使用 inline `curl` 发送包含中文的 JSON 时，Fastify 返回：

```text
FST_ERR_CTP_INVALID_CONTENT_LENGTH
```

错误信息表示：

```text
Content-Length
≠
实际读取到的 Body bytes
```

一开始很容易把注意力放到：

```text
Zod Schema
Route
Service
```

但这个 Error 实际发生的位置更早：

```text
curl
  ↓
HTTP
  ↓
Fastify Body Parsing ❌
  ↓
Zod
  ↓
Handler
```

通过控制变量继续测试：

```text
payload 文件 + 中文
→ 成功

inline ASCII
→ 成功

inline 中文
→ 失败
```

最终可以把问题范围收缩到：

```text
Shell / command-line argument
→ curl
```

这一层的 Unicode 数据传递，而不是 Fastify Application。

这个问题本身没有继续深入的必要，但调试过程值得保留。

它让我真正体会到：

> 出现一个 `400` 时，不应该马上去检查业务 Validation，而应该先判断 Error 发生在 Request Lifecycle 的哪一个阶段。

以后 Agent 系统也会出现完全相同的问题。

例如一次失败可能来自：

```text
HTTP Parsing
Request Validation
Authentication
Authorization
LLM
Structured Output
Tool Validation
Tool Execution
Persistence
```

最终虽然都可能表现为：

```text
Request Failed
```

但调试入口完全不同。

---

## 从 HTTP Boundary 提前看到 Agent Boundary

目前整个 HTTP Pipeline 已经可以抽象为：

```text
External Input
      ↓
Structural Validation
      ↓
Trusted Application Input
      ↓
Application Logic
      ↓
Internal Result
      ↓
Response Contract
      ↓
External Output
```

这套模型其实已经开始直接映射未来的 Agent Runtime。

HTTP 中：

```text
Request Body
   ↓
Zod
   ↓
Service
```

以后 Tool Calling：

```text
Model-generated Tool Arguments
   ↓
Zod
   ↓
Permission / Sandbox
   ↓
Tool Executor
```

因此现在可以提前得到一个非常重要的 Agent Engineering 原则：

> 模型生成的数据和用户发送的 HTTP 数据一样，都属于 Runtime External Input。

即使后面使用 Structured Outputs，也只是增加了模型输出的结构约束。

真正进入 Tool 执行之前，仍然需要继续考虑：

```text
Runtime Validation
Authorization
Permission
Sandbox
Timeout
Approval
```

也就是说，今天建立的 HTTP Boundary 并不是一个独立的 Fastify 知识点。

它会直接成为后面 Tool Calling、MCP 和 Agent Security 的基础。

---

## 当前阶段得到的核心结论

经过 Node.js、Fastify 和 Zod 这一阶段，我对 AI Agent 开发的理解又进一步发生了变化。

最开始很容易把 Agent 理解成：

```text
Prompt
+
LLM
+
几个 Tool
```

但真正开始搭建运行环境以后，更接近：

```text
Frontend
+
Backend Runtime
+
Boundary Contract
+
Validation
+
State
+
LLM
+
Tool
+
Persistence
+
Security
+
Observability
+
Eval
```

目前虽然还没有真正接入模型，但已经建立了几个之后会持续复用的工程原则。

第一：

> TypeScript 类型只能保护我们控制的代码，任何来自 Runtime Boundary 的数据都需要重新验证。

第二：

> Structural Validation、Business Validation 和 Authorization 是三个不同层次的问题。

第三：

> Route 面向 HTTP Transport，Service 面向 Application Logic，两者不应该因为当前使用 Fastify 就完全耦合。

第四：

> Request 和 Response 都是 Boundary。输入需要验证，输出需要明确控制公开 Contract。

第五：

> Error 同样属于 API Contract。内部 Error、Framework Error 与 Public Error Code 不应该混成一套概念。

现在的 HTTP Boundary 已经可以画成：

```text
                 Client
                   │
                   ▼
                Routing
                   │
          ┌────────┴────────┐
          │                 │
       matched          NOT_FOUND
          │
          ▼
        Parsing
          │
          ├── error → REQUEST_ERROR
          ▼
  Structural Validation
          │
          ├── error → INVALID_REQUEST
          ▼
        Handler
          │
          ▼
        Service
          │
          ▼
    Response Schema
          │
          ▼
      Serialization
          │
          ▼
        Client
```

下一步开始进入另一个只返回普通 JSON 很难解决的问题：

> 如果一次 LLM / Agent 执行需要持续几秒甚至几十秒，服务是否应该一直等到所有工作完成后，才一次性返回 Response？

这会继续把当前的 HTTP Request / Response 模型推进到：

```text
Streaming
SSE
Connection Lifecycle
Abort
Cancellation
```

也会第一次开始为真正接入 LLM API 做准备。
