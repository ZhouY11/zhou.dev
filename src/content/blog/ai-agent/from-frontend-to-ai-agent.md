---
title: 从前端开发到 AI Agent：我的 Agent 工程化学习与实践
description: 用于记录和实践 AI Agent 工程化、工具调用、上下文管理与应用开发的实验项目。
publishedAt: 2026-08-19
updatedAt: 2026-08-25
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

## Fastify Route：HTTP 世界与业务世界的边界

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

## Route 不应该承担所有错误处理

Route 容易同时承担：

- HTTP 参数处理
- 调用外部服务
- 业务判断
- 错误转换
- Response Format

这些职责变化原因不同。

更合理的边界：

    Route

    负责 HTTP Boundary

    ↓

    Service

    负责 Application Logic

Service 不应该直接依赖 FastifyReply。

## Application Error 与 HTTP Error 分离

Business Error 不等于 HTTP Error。

例如：

    REPOSITORY_NOT_FOUND

表示 Application 层的业务语义。

经过 HTTP Boundary 后：

    404 Not Found

才是 HTTP Client 理解的协议表达。

因此：

    Application Error

    ↓

    HTTP Mapping

    ↓

    HTTP Response

而不是：

    Service

    ↓

    reply.status(404)

## AppError 与 Error Code

错误判断不应该依赖 message：

```ts
error.message === 'Repository not found';
```

因为文本容易变化。

应该使用稳定 Error Code：

    REPOSITORY_NOT_FOUND

而 message 用于诊断信息。

## Fastify Error Pipeline

Fastify 通过 setErrorHandler 建立统一错误处理边界：

    Request

    ↓

    Validation

    ↓

    Route

    ↓

    Service

    ↓

    Error

    ↓

    Error Handler

    ↓

    HTTP Response

这样 Route 不需要重复编写错误处理逻辑。

## Error 分类

当前阶段主要区分：

### Validation Error

外部输入不符合 Contract。

例如：

    repository id 格式错误

通常返回：

    400

### Application Error

业务逻辑可以明确判断。

例如：

    Repository 不存在

映射：

    REPOSITORY_NOT_FOUND

    ↓

    404

### Unknown Error

系统无法理解业务语义的异常。

不能强行转换为业务错误。

正确方式：

    记录内部错误

    ↓

    返回安全公共错误

## 使用 app.inject 测试 Error Contract

为了验证完整 Fastify 生命周期，不直接调用 errorHandler。

使用：

```ts
app.inject();
```

测试：

    Vitest

    ↓

    Fastify Instance

    ↓

    Request Lifecycle

    ↓

    Error Handler

    ↓

    Response Contract

验证的是最终行为，而不是单个函数。

## buildApp 与 listen 分离

应用构建和服务器启动应该分离：

    app.ts

    负责 Application

    ↓

    server.ts

    负责 listen()

这样测试可以创建 Fastify Instance，而不需要真实监听端口。

## 把 FrontOps Agent 的数据从内存搬进 PostgreSQL

我已经完成了 Fastify、Zod、Route / Service / Repository 分层以及测试体系的基础搭建。

问题第一次从：

```text
“Backend 能不能接住一个请求”
```

变成：

```text
“这些数据到底应该如何被可靠地持久化”
```

这也是我从前端工程思维切换到后端工程思维时，一个非常明显的节点。

对于前端开发来说，很多状态天然存在于：

```text
Component State
Pinia / Vuex
Browser Storage
Remote API Cache
```

但进入后端以后，真正需要长期保存、支持并发访问、保证一致性的数据，必须交给数据库。

这一次我正式把 FrontOps Agent 的项目数据接入 PostgreSQL。

---

### 1. 为什么不能一直使用内存数据

最开始为了验证 Route / Service / Repository 的调用链，Repository 完全可以使用内存数组：

```ts
const projects: Project[] = [];
```

这种实现的价值是：

```text
快速验证架构
+
没有数据库依赖
+
测试简单
```

但它无法承担真实系统的数据存储职责。

只要 Node.js Process 重启：

```text
Process Exit
    ↓
Memory Lost
    ↓
Projects Lost
```

同时，多进程、多实例部署以后，每个实例都有自己的内存：

```text
API Instance A
→ projects A

API Instance B
→ projects B
```

两份状态彼此不一致。

因此 PostgreSQL 在 FrontOps Agent 中承担的是：

> Persistent Source of Truth。

这和 Vue State 完全不是同一个角色。

可以这样映射：

```text
Vue State
→ 当前 Client Runtime State

PostgreSQL
→ Server Persistent State
```

---

### 2. PostgreSQL Client 和 Connection Pool

第一次接 PostgreSQL 时，一个很容易写出的实现是：

```ts
const client = new Client({
  connectionString,
})

await client.connect()

const result = await client.query(...)
```

这在一次性脚本中完全合理。

但对于长期运行的 API Server：

```text
Request
Request
Request
Request
...
```

数据库连接本身是一种有限资源。

如果每个 Request：

```text
new Client()
→ connect()
→ query()
→ close()
```

不仅增加连接建立成本，也容易在高并发下耗尽数据库的连接资源。

因此 Web Server 更常见的方式是：

```ts
const pool = new Pool(...)
```

然后：

```text
Application Startup
      ↓
Create Pool
      ↓
Request 1
Request 2
Request 3
      ↓
Reuse Connections
```

这里我第一次把数据库连接池和以前理解 TCP / Browser Connection Reuse 的经验建立了映射：

> 连接不是无限资源，没有必要每个操作重新创建。

---

### 3. `Pool`、`Client`、`release()`、`end()` 不是同一个生命周期

我特别容易混淆的是：

```ts
pool.query(...)
pool.connect()
client.release()
pool.end()
```

它们看起来都在操作数据库连接，但语义不同。

#### `pool.query()`

适合：

> 单条独立 Query。

例如：

```ts
await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
```

Pool 会自动帮我：

```text
获取 Client
→ 执行 Query
→ 归还 Client
```

因此调用方不需要手动 `release()`。

---

#### `pool.connect()`

当多个 SQL 操作必须使用 **同一个 Connection** 时，需要显式拿到 Client：

```ts
const client = await pool.connect();

try {
  // ...
} finally {
  client.release();
}
```

典型场景是 Transaction：

```text
BEGIN
 ↓
Query A
 ↓
Query B
 ↓
COMMIT / ROLLBACK
```

这些操作不能分别随机落到 Pool 中不同 Client 上。

因此：

```text
pool.query()
→ 独立 Query

pool.connect()
→ 显式获取同一 Client
```

是两个不同使用场景。

---

#### `client.release()`

`release()` 表示：

> 当前代码不再占用这个 Client，把连接归还 Pool。

它不是：

```text
关闭整个数据库系统
```

而是：

```text
Borrowed Connection
      ↓
release()
      ↓
Return To Pool
```

---

#### `pool.end()`

`pool.end()` 的语义则完全不同：

> 关闭整个 Pool，并结束数据库连接资源。

所以一般发生在：

```text
Application Shutdown
Test Teardown
Script Completion
```

而不是每个 Request 执行之后。

这套生命周期管理让我意识到：

> Backend Resource Lifecycle 必须明确区分 Application Scope、Request Scope 和 Operation Scope。

这个原则后面同样会继续出现在 LLM Client、Agent Task、Tool Execution 等系统里。

---

### 4. 为什么 Repository 应该负责 SQL

数据库接入以后，我仍然保持：

```text
Route
→ Service
→ Repository
```

Repository 开始真正承担：

```text
SQL
Database Mapping
Persistence
```

例如：

```ts
export class ProjectRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateProjectInput) {
    const result = await this.pool.query(
      `
        INSERT INTO projects (
          name,
          repository_url
        )
        VALUES ($1, $2)
        RETURNING
          id,
          name,
          repository_url,
          created_at
      `,
      [input.name, input.repositoryUrl],
    );

    return result.rows[0];
  }
}
```

我不希望 Route 里出现：

```ts
await pool.query(...)
```

也不希望 Service 到处直接写 SQL。

因为：

```text
Route
→ HTTP Boundary

Service
→ Business Logic

Repository
→ Persistence Boundary
```

这三个职责仍然需要分开。

但这里也不能机械分层。

如果一个 Feature 当前只有非常简单的数据操作，不应该为了“企业架构感”继续创建：

```text
DAO
Mapper
Gateway
StorageService
RepositoryImpl
```

每一个 abstraction 都必须解决一个真实问题。

---

### 5. SQL 参数必须参数化

数据库接入之后，第一个非常重要的安全习惯就是：

不要这样：

```ts
const sql = `
  SELECT *
  FROM projects
  WHERE name = '${name}'
`;
```

而应该：

```ts
await pool.query(
  `
    SELECT *
    FROM projects
    WHERE name = $1
  `,
  [name],
);
```

参数化 Query 的核心价值不是“代码更整洁”，而是：

> 把 SQL Structure 和 User Data 分开。

应用传入的数据不会直接成为 SQL 语句结构的一部分。

这一点和前端时代常见的：

```text
HTML String Concatenation
vs
Framework Escaping / Binding
```

有类似的安全思维：

> 不要让外部数据直接进入可执行结构。

---

### 6. 数据库 Schema 是 Runtime Contract 的另一层

第一周前面已经建立：

```text
HTTP Input
   ↓
Zod Validation
```

接入 PostgreSQL 后又多了一层：

```text
Application Data
   ↓
Database Constraints
```

例如：

```sql
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

这里的：

```text
PRIMARY KEY
NOT NULL
DEFAULT
```

并不是可以被 TypeScript 替代的。

即使代码里有：

```ts
type Project = {
  id: number;
  name: string;
};
```

数据库本身仍然必须保证：

```text
id 唯一
name 不能为空
```

因为数据库不只会被某一个 TypeScript function 使用。

未来可能还有：

```text
Migration
Background Job
Admin Script
Other Service
Manual SQL
```

都会直接操作它。

因此：

> Database Constraint 是 Data Source 自己的最后一道 Runtime Contract。

---

### 7. 为什么 `PRIMARY KEY` 应该由数据库保证

我确认了一个非常重要的原则：

```text
Entity Identity
```

不能只依赖 Application “自己记得不重复”。

例如：

```sql
id BIGSERIAL PRIMARY KEY
```

数据库可以保证：

```text
唯一性
+
非空
+
索引语义
```

如果只是 Application 里：

```ts
const id = projects.length + 1;
```

那在并发、多实例环境里根本无法可靠成立。

因此这种全局数据一致性约束：

> 应该尽可能靠近真正的数据源。

---

### 8. `created_at` 为什么由数据库生成

`created_at` 这种字段同样适合：

```sql
created_at TIMESTAMPTZ
  NOT NULL
  DEFAULT NOW()
```

而不是每个调用方都：

```ts
createdAt: new Date();
```

原因是：

```text
created_at
```

描述的是：

> 这一行数据进入数据库时的创建时间。

让数据库负责：

```text
统一
可靠
避免调用方遗漏
```

更加合理。

Application 不需要每次创建项目都记住：

```text
还要生成 createdAt
```

---

### 9. 为什么选择 `TIMESTAMPTZ`

对于 Backend 持久化时间，我使用：

```sql
TIMESTAMPTZ
```

而不是只保存一个没有时区语义的 timestamp。

工程上的考虑不是：

> “数据库里显示哪个时区更漂亮。”

而是希望保存的是一个明确时间点。

不同使用者最终可以根据：

```text
UTC
User Locale
Server Locale
```

转换展示。

这和前端国际化中的时间处理很接近：

```text
Persist absolute instant
        ↓
Presentation layer
        ↓
Local timezone formatting
```

不要把最终展示时区和底层持久化语义混在一起。

---

### 10. 数据库命名和 TypeScript 命名不必强行统一

数据库常见：

```text
snake_case
```

TypeScript 常见：

```text
camelCase
```

例如：

```sql
repository_url
created_at
```

而 Application 使用：

```ts
repositoryUrl;
createdAt;
```

这两个世界不需要为了所谓统一而强迫其中一边改变。

Repository Boundary 正好可以负责转换：

```text
Database Row
repository_url
created_at
       ↓
Repository Mapping
       ↓
Application Object
repositoryUrl
createdAt
```

这也是 Repository 存在的另一个实际价值：

> 隔离 persistence representation 和 application representation。

---

### 11. `UNIQUE` 不是所有字段默认都应该加

学习表结构设计时，一个很容易出现的倾向是：

```text
既然唯一性很好，
那 name、URL 都加 UNIQUE。
```

但 `UNIQUE` 实际是业务规则。

例如：

```sql
repository_url TEXT UNIQUE
```

到底对不对，要先回答：

```text
一个 Repository 是否只允许创建一个 Project？

是否允许不同 Workspace 导入同一个 Repository？

同一 Repo 是否可能有不同 Branch / Configuration？
```

如果业务规则没有确定，就不能因为“看起来应该唯一”直接写约束。

所以：

> Database Constraint 必须有业务语义依据。

`PRIMARY KEY` 是 Entity Identity 的基础约束。

而普通字段上的：

```text
UNIQUE
CHECK
FOREIGN KEY
```

则需要结合具体业务规则设计。

---

### 12. Application Validation 和 Database Validation 为什么都需要

这是一个非常重要的边界问题。

例如：

```text
Project Name 不能为空
```

Application 可以：

```ts
z.string().trim().min(1);
```

数据库也可以：

```sql
name TEXT NOT NULL
```

这不是重复浪费。

它们服务的是不同边界。

#### Application Validation

解决：

```text
HTTP Client
   ↓
Invalid Input
   ↓
尽早给出明确业务错误
```

目标是：

```text
开发体验
API Contract
业务语义
```

#### Database Constraint

解决：

```text
任何数据库写入路径
      ↓
最终数据一致性
```

目标是：

```text
Persistence Integrity
```

所以：

```text
Application Validation
+
Database Validation
```

不是二选一。

---

### 13. Repository Test 和真实数据库测试的边界

接入 PostgreSQL 后，我也开始重新理解测试分层。

Service Unit Test 不应该因为 Repository 换成 PostgreSQL 就突然需要数据库。

例如：

```text
ProjectService
      ↓
Fake ProjectRepository
```

仍然应该能够快速、deterministic 地测试业务逻辑。

而真正 SQL 是否正确：

```text
INSERT
SELECT
RETURNING
column mapping
constraint
```

则需要更接近数据库的 integration test。

因此：

```text
Service Unit Test
→ Fake Repository

Repository / Integration Test
→ Real PostgreSQL
```

它们证明的是不同问题。

这和后面 LLM Testing 的：

```text
Service Unit Test
→ Fake LLM

Provider Smoke Test
→ Real Model
```

其实是同一种 Testing Boundary 思维。

---

### 14. 为什么测试结束必须释放资源

数据库测试还有一个前端时代不太常见的问题：

```text
Open Handle
```

如果测试创建了 Pool，却没有：

```ts
await pool.end();
```

Vitest 可能执行完 assertion 之后仍然无法正常退出。

原因不是 Vitest 出问题，而是 Node.js Event Loop 中仍然存在活跃资源。

因此测试需要明确：

```ts
afterAll(async () => {
  await pool.end();
});
```

或者按照实际测试生命周期使用：

```ts
afterEach(...)
```

这个问题让我进一步理解：

> Backend Test 不只验证返回值，还必须管理真实 Resource Lifecycle。

---

### 15. FrontOps Agent 为什么需要 PostgreSQL

目前 PostgreSQL 只保存 Project 这类基础数据。

但 FrontOps Agent 最终还会需要持久化：

```text
Projects

Imported Repositories

Agent Tasks

Task Status

Human Approval State

Tool Timeline

Trace Metadata

Eval Results

Cost / Token / Latency Data
```

因此 PostgreSQL 并不是“为了学 Backend 顺手加一个数据库”。

它最终会成为整个 Agent Platform 的持久状态基础。

后续还会继续扩展：

```text
PostgreSQL
    ↓
pgvector
    ↓
Vector Retrieval
```

但当前阶段还没有必要提前学习这些内容。

---

### 16. 从前端状态管理映射到后端持久化

对我最有帮助的一个映射是：

```text
Vue State
≠
Server State
≠
Persistent State
```

前端：

```text
ref()
reactive()
Pinia
```

解决的是当前 Client Runtime 中：

```text
UI 如何随着状态变化
```

而 PostgreSQL 解决的是：

```text
数据如何跨 Request
跨 Process
跨 Deployment
长期存在
```

以前前端调用：

```ts
await api.createProject(...)
```

我更多关注：

```text
loading
error
cache invalidation
UI update
```

现在站在 Backend 侧，需要继续考虑：

```text
Connection
Query
Constraint
Transaction
Persistence
Resource Lifecycle
```

这是从“消费 API”到“实现可靠数据系统”的明显视角变化。

---

### 17. 最终形成的数据链

完成 PostgreSQL 接入后，FrontOps Agent 第一周的 Backend 数据流已经形成：

```text
Client
  ↓
Fastify Route
  ↓
Runtime Validation
  ↓
Service
  ↓
Repository
  ↓
Parameterized SQL
  ↓
PostgreSQL
  ↓
Database Constraints
```

反向：

```text
PostgreSQL Row
     ↓
Repository Mapping
     ↓
Application Object
     ↓
Service
     ↓
Response Serialization
     ↓
Client
```

到这里，我已经不再只是：

> “会用 Node.js 写接口。”

而开始真正接触 Backend Engineering 的几个核心问题：

```text
Persistence
Resource Lifecycle
Data Integrity
Boundary Mapping
Testing
```

---

## 把 LLM 从 API Demo 变成工程能力

进入第二阶段之后，我终于开始真正接触 LLM API。

如果只看最开始的代码，这件事似乎非常简单：

```ts
const response = await client.chat.completions.create({
  model: 'deepseek-v4-flash',
  messages: [
    {
      role: 'user',
      content: 'Explain Vue reactivity.',
    },
  ],
});
```

对于一个有多年 Web 开发经验的工程师来说，这段代码几乎没有学习门槛：创建 Client、发请求、等待 Promise、读取 Response。

但这一阶段真正让我开始建立 AI Application Engineering 视角的地方，并不是“会调用模型 API”，而是逐渐意识到：

> LLM API 的调用形式虽然像普通 HTTP API，但它带来的工程约束和普通 deterministic backend dependency 并不一样。

这也是 FrontOps Agent 第一次真正从普通 Node.js Backend 向 AI Application 演进。

### 1. 从 OpenAI API 切换到 DeepSeek：先学机制，而不是绑定 Provider

最开始我使用 OpenAI API 做实验，但实际调用时遇到了 API credits 不足的问题。

由于这一阶段的重点是：

- Model API
- Message
- Structured Output
- Tool Calling
- Agent Loop
- Runtime Validation
- Timeout
- Cancellation
- Testing

而不是某个特定 Provider，因此我把学习阶段的模型切换到了 DeepSeek。

DeepSeek 提供 OpenAI-compatible API，所以仍然可以使用 `openai` Node SDK：

```ts
const deepSeekApiClient = new OpenAI({
  apiKey: env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
  timeout: 15_000,
  maxRetries: 0,
});
```

这次切换让我提前建立了一个很重要的概念：

```text
OpenAI SDK
≠
OpenAI Provider
```

SDK 是 Client/Protocol 层工具，而真正的 Provider 可以是 DeepSeek。

因此后续架构里我没有让业务代码直接依赖 SDK，而是引入自己的 `LLMClient` boundary。

---

### 2. Conversation State 不是模型自动保存的

第一次做多轮对话实验时，我构造了：

```text
system
user
```

得到模型回复后，再把它作为 `assistant` message 放入第二次请求：

```text
system
user
assistant
user
```

这让我确认了一件以前容易被聊天产品 UI 隐藏起来的事实：

> Conversation State 首先是 Application State。

最基础的 LLM API 并不是某个始终保存着全部聊天记录的对象。

每次 inference 时，Application 都需要决定本次到底向模型提供哪些 context。

因此随着多轮对话不断增长：

```text
Conversation History
        ↓
Input Context
        ↓
prompt_tokens
        ↓
Cost / Latency Pressure
```

这也是后续 Context Management、RAG、Agent State 和 Memory 问题出现的根源。

---

### 3. Context 是有限资源，不是垃圾桶

我通过模型返回的 `usage` 做了两个实验。

第一次只发送很短的 messages。

第二次增加 conversation history 和模拟 Repository Context。

结果很直接：

```text
Context ↑
→ prompt_tokens ↑
```

这个现象看似简单，但对 FrontOps Agent 非常重要。

未来 FrontOps Agent 面对的不是几行文本，而可能是数千甚至上万文件的 Vue / TypeScript Repository。

最粗暴的设计：

```text
Whole Repository
      ↓
Model
```

不仅会增加 token cost，还可能增加 latency，并引入大量 irrelevant context。

因此我开始把 Model Context 理解成一个昂贵的 runtime working set，而不是 persistent storage。

更合理的长期方向一定是：

```text
User Question
      ↓
Search / Retrieve
      ↓
Relevant Context
      ↓
Model
```

也就是说，RAG 和 Tool Calling 并不是为了“让 Agent 看起来更智能”，而是在解决一个已经真实出现的 Context Engineering 问题。

---

### 4. Model Output 必须视为 Untrusted Input

这一阶段最重要的工程认知之一，是把第一周学过的 Runtime Validation 迁移到了模型输出。

假设模型应该返回：

```ts
type Analysis = {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
};
```

这种代码：

```ts
const result = JSON.parse(output) as Analysis;
```

实际上没有建立可靠 contract。

`JSON.parse()` 只能回答：

> 这是不是合法 JSON？

它无法保证：

```text
summary 是不是 string
riskLevel 是否存在
riskLevel 是否属于允许的 enum
```

而：

```ts
as Analysis
```

只是 TypeScript compile-time assertion，不会在 Runtime 做任何验证。

因此更准确的数据流应该是：

```text
Raw Model Output
      ↓
JSON.parse
      ↓
unknown
      ↓
Zod Runtime Validation
      ↓
Trusted Application Value
```

这里我也重新理解了 Prompt 和 Schema 的职责区别：

```text
Prompt Constraint
→ influence generation

Runtime Validation
→ control acceptance
```

Prompt 可以要求模型返回合法数据，但不能成为 Application 接受数据的依据。

Zod 也不能保证模型一定生成正确结果，它保证的是错误结果不会被当成可信业务数据继续执行。

---

### 5. 从 Demo 调用演进到 Provider Boundary

实验阶段，我可以直接：

```ts
await client.chat.completions.create(...)
```

但进入 FrontOps Agent 正式代码之后，我不希望 `AnalysisService` 知道：

- DeepSeek
- OpenAI SDK
- baseURL
- Provider HTTP Status
- API Key

因此目前形成了：

```text
AnalysisService
      ↓
   LLMClient
      ↑
DeepSeekLLMClient
      ↓
OpenAI-compatible SDK
      ↓
DeepSeek
```

`AnalysisService` 负责业务行为：

```ts
return this.llm.generateText({
  instruction: `
    You are a senior frontend engineer.
    Explain the provided frontend code clearly and concisely.
  `,
  content,
});
```

而 `DeepSeekLLMClient` 负责：

- Provider request mapping
- Model selection
- Provider response extraction
- Provider error translation

这让我第一次真正把 LLM 看成一种 Infrastructure Capability，而不是散落在 Service 中的 API 调用。

当前 `generateText(): Promise<string>` 仍然只是教学阶段 abstraction。

进入 Structured Outputs 和 Tool Calling 后，这个 interface 一定会继续演进。

---

### 6. LLM Client 生命周期：不是为了 Singleton Pattern

SDK Client 在 application startup 阶段创建：

```text
Process Start
     ↓
new OpenAI(...)
     ↓
register module
     ↓
listen
     ↓
Request
Request
Request
```

而不是：

```text
Request
  ↓
new OpenAI()
```

这里的重点并不是背一个“LLM Client 应该使用 Singleton”规则。

真正的原因是 SDK Client 保存的是稳定的 Infrastructure Configuration：

- credential
- endpoint
- timeout
- retry policy
- HTTP configuration

这些并不属于 request-specific state。

因此更合理的方式是让它跟随 Application Process 生命周期，通过 Composition Root / Module Wiring 注入需要它的组件。

这个思路和 PostgreSQL Pool 的生命周期设计原则类似，但两者的资源语义不同，因此不能简单认为 `OpenAI Client === DB Pool`。

---

### 7. Timeout、Abort、Retry 必须分开理解

这一阶段第一次真正让我意识到：

```text
Timeout
Abort
Retry
```

不是同一件事。

#### Timeout

Timeout 是 Deadline Policy：

> 这个操作最多允许执行多久。

#### Abort

Abort 是 Cancellation Mechanism：

> 停止一个当前仍在执行的操作。

#### Retry

Retry 是新的 Execution Attempt：

> 某次执行失败之后，再发起一次新的执行。

这也是为什么：

```ts
Promise.race([modelCall(), timeoutPromise]);
```

并不等于真正的 cancellation。

`Promise.race()` 可以让 Application 不再等待 `modelCall()`，但底层 HTTP 请求仍然可能继续运行。

而在 Agent 场景里，这会继续消耗：

- Network
- Token
- Cost
- Tool resources

因此我在 `LLMClient` 中加入了 `AbortSignal`：

```ts
export interface LLMClient {
  generateText(
    input: GenerateTextInput,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<string>;
}
```

并让 signal 从 caller 一路传播：

```text
Caller
  ↓
AnalysisService
  ↓
LLMClient
  ↓
DeepSeekLLMClient
  ↓
Provider Request
```

这是后续 Agent Task Cancellation 的最小基础。

---

### 8. 为什么当前关闭 SDK 自动 Retry

学习阶段我暂时配置：

```ts
maxRetries: 0;
```

这不是因为 Production LLM 永远不应该 retry。

而是为了让当前执行模型保持清晰：

```text
1 Application Call
=
1 Provider Attempt
```

否则如果 SDK 内部自动 retry：

```text
10s timeout
   ↓
retry
   ↓
10s
   ↓
retry
```

Application 看到的一次调用可能已经变成多次真实 Provider Execution。

到了 Agent 系统之后，Retry 还会继续和：

- Token Cost
- Global Deadline
- Tool Side Effects
- Idempotency
- Retry Budget

连接起来。

因此这一阶段我先选择显式失败，后续再单独设计 Production Retry Policy。

---

### 9. Provider Error 需要 Translation

业务代码不应该出现：

```ts
error instanceof OpenAI.APIError;
```

否则 Infrastructure-specific type 已经泄漏进 Application。

因此 Provider Adapter 会把 SDK error 转成自己的 `LLMError`：

```text
SDK / DeepSeek Error
        ↓
DeepSeekLLMClient
        ↓
LLMError
        ↓
Application
```

例如可以抽象成：

```text
timeout
cancelled
rate_limit
authentication
insufficient_balance
provider_unavailable
unknown
```

这里还有一个很重要的 HTTP Boundary 问题。

DeepSeek 返回：

```http
401 Unauthorized
```

并不意味着 FrontOps Agent 的最终用户没有登录。

这个 `401` 表达的是：

```text
Our Backend
   ↓
DeepSeek Provider
   ↓
Provider Credential Failure
```

因此不能机械向 Vue Frontend 透传 `401`。

Public API 和 Upstream Provider 处于不同语义边界。

---

### 10. AI Application 仍然需要传统测试

这一阶段我把测试拆成四层。

#### AnalysisService Unit Test

使用 Fake `LLMClient`。

它验证：

- Application logic
- dependency interaction
- content forwarding
- AbortSignal forwarding
- failure propagation

它不验证 DeepSeek。

#### Route Test

Mock Service。

它验证：

- HTTP Contract
- Runtime Validation
- Service Invocation
- Response Serialization

#### Real Model Smoke Test

显式调用真实 DeepSeek。

它验证的是：

```text
API Key
Network
SDK
Provider
Model
```

这一整条最基本集成链路是否仍然可用。

Smoke Test 不进入默认 `pnpm test`，避免 watch mode 和普通 CI 无意中不断产生真实模型调用和费用。

#### Future Agent Eval

Eval 不负责验证 API 是否能调用，而负责：

> Agent 的实际 AI 行为质量是否满足要求。

例如：

- 是否找到正确文件
- Tool selection 是否正确
- Patch 是否能通过 TypeCheck
- 回答是否引用正确 source

这让我明确区分了：

```text
Traditional Test
→ Code Correctness

Smoke Test
→ Integration Availability

Eval
→ AI Behavior Quality
```

---

### 11. 当前 FrontOps Agent 的变化

第一周项目主要是：

```text
Route
 ↓
Service
 ↓
Repository
 ↓
PostgreSQL
```

现在开始变成：

```text
                    ┌→ Repository
                    │      ↓
Route → Service ────┤  PostgreSQL
                    │
                    └→ LLMClient
                           ↓
                    DeepSeekLLMClient
                           ↓
                       DeepSeek
```

FrontOps Agent 第一次同时拥有：

```text
Persistent Capability
+
Model Capability
```

但现在还不能叫真正的 Agent。

它仍然只是：

```text
Application
   ↓
Model
   ↓
Application
```

下一步 Structured Outputs、Tool Calling 和 Hand-written Agent Loop 才会逐渐让模型从“生成文本”转向“产生受控决策并驱动外部工具”。

---

### 12. 这一阶段的工程结论

完成这一阶段以后，我当前最重要的认知不是“学会了 DeepSeek API”，而是这些更长期的原则：

1. LLM 是 probabilistic external dependency，而不是 deterministic function。
2. Conversation State 首先由 Application 管理。
3. Context 是有限且昂贵的 runtime resource。
4. Model Output 必须视为 untrusted input。
5. Prompt Constraint 不能代替 Runtime Validation。
6. Application 应依赖 LLM capability，而不是 Provider SDK。
7. LLM Client 应有明确的 application-level lifecycle。
8. Timeout、Abort、Retry 是三个不同问题。
9. Cancellation 必须向下传播，不能只改变 UI 状态。
10. Provider Error 不应该直接泄漏到 Application / Public API。
11. Unit Test、Smoke Test、Eval 分别提供不同层次的 confidence。
12. Agent Engineering 的基础仍然是 Backend Engineering，而不是 Prompt 技巧。

这一阶段最大的变化，是我开始不再把 LLM 当成一个“返回智能文本的 API”。

它正在逐渐变成 FrontOps Agent Runtime 中一个必须被：

```text
约束
验证
隔离
取消
测试
观测
```

的外部执行能力。

下一阶段，我会继续从 Message / Prompt Model 开始，为 Structured Outputs 和 Tool Calling 做准备。
