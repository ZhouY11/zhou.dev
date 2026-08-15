---
title: 从 0 开始理解 SEO：我在 Astro 博客中做了什么
description: 从一个前端工程师的视角，通过 Astro 个人技术博客的开发过程逐步理解 SEO，目前记录 Title、Description、Canonical、noindex、静态 HTML 与社交分享元数据等基础实践。
publishedAt: 2026-08-11
updatedAt: 2026-08-15
tags:
  - SEO
  - Astro
  - Frontend
series:
  id: astro-blog-from-zero
  order: 1
featured: true
draft: false
---

过去很长一段时间里，我开发的主要都是后台管理系统。

这类系统通常有几个共同特点：

- 需要登录才能访问
- 页面主要服务企业内部用户
- 搜索引擎没有索引这些页面的必要
- SEO 几乎不会成为前端架构设计的重要因素

因此，虽然已经做了很多年前端开发，我对 SEO 的理解其实非常有限。

直到开始搭建自己的个人技术博客，我才第一次真正面对一个问题：

> 如果我写了一篇技术文章，搜索引擎究竟是怎么发现它、理解它，并最终把它展示给用户的？

于是我决定不单独找一套 SEO 八股文来背。

这个博客本身就是我的实验项目。

以后项目真正用到一个 SEO 能力，我就去理解这个能力解决什么问题、它在搜索引擎中的作用是什么，再把学习结果持续更新到这篇文章。

所以这不是一篇一次性完成的 SEO 教程。

它更像是：

```text
开发博客
   ↓
遇到真实 SEO 问题
   ↓
理解原理
   ↓
实现
   ↓
验证
   ↓
更新这篇文章
```

---

## 1. SEO 到底是什么？

SEO 是 **Search Engine Optimization**，即搜索引擎优化。

刚开始接触时，我很容易把 SEO 简化成：

```text
<title>
+
<meta name="description">
+
keywords
```

但随着博客逐渐开发下来，我开始意识到这只是非常小的一部分。

对于一个内容网站，我现在更愿意从三个问题理解 SEO：

```text
搜索引擎能不能发现页面？
           ↓
搜索引擎能不能正确理解页面？
           ↓
页面出现在搜索结果中时，
用户是否能够理解它值不值得点击？
```

如果进一步拆开，大致会涉及：

```text
发现页面
   ↓
Crawling / 抓取
   ↓
Rendering / 渲染
   ↓
Indexing / 索引
   ↓
理解页面内容和页面关系
   ↓
根据搜索请求决定是否展示
   ↓
生成搜索结果中的标题和摘要
```

这也让我意识到：

> SEO 并不是给 HTML 塞几个特殊标签，而是整个内容网站的信息架构问题。

URL、HTML、页面标题、正文结构、站内链接、性能、爬虫访问、内容质量都会逐渐参与进来。

目前我的博客还处在比较早的阶段。

因此我先从最基础的一层开始。

---

# 2. `<title>`：页面首先应该说明自己是谁

博客最早实现 SEO 时，我首先处理的是：

```html
<title>页面标题</title>
```

以前开发后台系统时，我可能会直接写：

```html
<title>采购管理平台</title>
```

然后所有页面共用一个标题。

但对于博客，这显然不合理。

如果有三篇文章：

```text
为什么我开始使用 Astro 搭建个人博客

pnpm 的依赖管理机制

Vue 微前端架构实践
```

搜索引擎看到的却全部是：

```text
Zhou Blog
```

那么 `<title>` 根本没有准确表达页面内容。

因此博客的 `BaseLayout` 接收自己的 title：

```astro
<BaseLayout title={post.data.title} description={post.data.description} />
```

最终不同文章生成不同的：

```html
<title>为什么我开始使用 Astro 搭建个人博客 | Zhou</title>
```

我的理解开始变成：

```text
BaseLayout
负责定义 SEO 的结构

具体 Page
负责提供页面自己的语义
```

而不是：

```text
Layout
负责把所有页面 SEO 内容写死
```

---

## 2.1 `<title>` 不等于 Google 最终展示的标题

这里还有一个非常重要的认知。

以前我会认为：

```html
<title>Astro 博客开发实践</title>
```

意味着 Google 搜索结果一定显示：

```text
Astro 博客开发实践
```

实际上并不是。

搜索引擎会参考很多信息决定最终的搜索结果标题，例如：

- `<title>`
- 页面主要视觉标题
- `<h1>`
- 页面其他文本
- Open Graph title
- 页面中的链接文字
- 其他页面指向当前页面的链接文字

所以 `<title>` 更准确的理解应该是：

> 我向搜索引擎提供的一个非常重要的页面标题信号。

而不是一个不可修改的显示指令。

---

## 2.2 好的 Title 应该是什么样？

目前我给自己总结的原则是：

### 每个重要页面拥有独立 Title

不要：

```text
Zhou Blog
Zhou Blog
Zhou Blog
Zhou Blog
```

应该是：

```text
首页
Zhou | Frontend Engineer

文章
从 0 开始理解 SEO | Zhou

文章
为什么我开始使用 Astro 搭建个人博客 | Zhou
```

### 描述页面，而不是堆关键词

不要为了 SEO 写：

```text
Astro SEO, Astro 博客, SEO 教程, Astro 教程,
前端 SEO, Astro SEO 优化
```

Title 首先还是给人看的。

### 品牌名称可以存在，但保持克制

例如：

```text
文章标题 | Zhou
```

这样既保留页面主题，也逐渐建立个人品牌名称。

---

# 3. Meta Description：搜索摘要的候选信息

第二个实际加入项目的是：

```html
<meta name="description" content="..." />
```

例如这篇文章：

```yaml
description: 作为一名前端开发者，我通过搭建 Astro 个人博客从零学习 SEO。
```

最终生成：

```html
<meta name="description" content="作为一名前端开发者，我通过搭建 Astro 个人博客从零学习 SEO。" />
```

刚开始我也有一个误区：

> Meta Description 就是 Google 搜索结果标题下面那段文字。

后来才发现并不准确。

搜索结果中的那部分内容通常叫做：

```text
Snippet
```

搜索引擎主要会根据页面实际内容生成 snippet。

当 Meta Description 能更准确地描述当前页面时，也可能采用它。

因此：

```text
Meta Description
```

不是：

```text
强制指定搜索结果摘要
```

更像是：

```text
页面主动提供的一份高质量摘要候选
```

---

## 3.1 为什么仍然值得认真写 Description？

既然搜索引擎可能不用它，为什么还要写？

因为它依然能够非常准确地向搜索引擎描述：

> 这个页面整体在讨论什么。

而且如果最终被用于搜索结果，它会直接影响用户看到这个结果时对文章的第一印象。

因此 Description 不应该写成：

```text
Astro, SEO, Frontend, JavaScript, Blog
```

这种关键词列表。

应该真正概括内容：

```text
通过 Astro 个人博客的实际开发过程，
从零理解 Title、Description、Canonical、
静态 HTML 等 SEO 基础知识。
```

---

## 3.2 不同页面也应该拥有不同 Description

这和 Title 一样。

不要所有页面都写：

```text
一个关于前端开发的个人技术博客。
```

首页可以写：

```text
专注前端架构、工程化、性能优化与 AI Agent
的个人技术博客。
```

SEO 文章可以写：

```text
通过 Astro 博客真实开发过程，
从零理解和实践现代网站 SEO。
```

pnpm 文章可以写：

```text
从依赖结构、磁盘占用和 Monorepo 场景
理解 pnpm 的工程价值。
```

这样：

```text
Content Metadata
```

才真正开始成为：

```text
页面语义的一部分
```

而不是为了“SEO 检查工具不报警”机械添加的标签。

---

# 4. Content Collection 和 SEO 开始发生关系

这个项目使用 Astro Content Collections 管理文章。

每篇文章拥有：

```yaml
---
title: 从 0 开始理解 SEO
description: ...
publishedAt: 2026-08-11
tags:
  - SEO
  - Astro
---
```

一开始我只是把这些东西理解成：

```text
文章数据
```

但现在开始意识到：

```text
Content Model
       ↓
页面内容
+
页面 Metadata
       ↓
SEO
```

例如：

```text
post.data.title
        ↓
<h1>
+
<title>
+
og:title
```

而：

```text
post.data.description
        ↓
文章简介
+
meta description
+
og:description
```

也就是说：

> 一个设计良好的 Content Model，本身就是 SEO 架构的一部分。

如果内容模型从一开始就没有准确的：

```text
title
description
publishedAt
```

后面想做 SEO 时就只能到处临时补数据。

---

# 5. Canonical：这个页面的“正式 URL”是谁？

接下来是我以前几乎完全没接触过的：

```html
<link rel="canonical" href="https://example.com/blog/seo" />
```

刚开始看到它时，我甚至不理解：

> 页面 URL 浏览器不是已经知道了吗？为什么还要再声明一次？

后来才理解它解决的是 **URL 规范化**。

也就是：

```text
Canonicalization
```

---

## 5.1 为什么同一份内容可能对应多个 URL？

假设文章地址是：

```text
https://example.com/blog/astro
```

未来用户可能通过：

```text
https://example.com/blog/astro?utm_source=twitter
```

或者其他参数访问。

甚至一个网站的架构设计不合理时，相同内容还可能通过多个永久 URL 访问。

从人的角度看：

```text
这是同一篇文章
```

但对于搜索系统来说：

```text
这是多个 URL
```

那么就需要确定：

> 哪一个 URL 最适合代表这份内容？

这个被选中的 URL 就叫：

```text
Canonical URL
```

---

## 5.2 `rel="canonical"` 是信号，不是绝对命令

例如：

```html
<link rel="canonical" href="https://example.com/blog/astro" />
```

我们实际上是在告诉搜索引擎：

> 如果你认为这些页面内容重复，我希望使用这个 URL 作为主要版本。

但是最终搜索引擎仍然可能根据：

```text
redirect
canonical
sitemap
站内链接
HTTPS
内容关系
```

等信息自行判断。

因此应该记住：

```text
Canonical
=
强烈的规范化信号
```

而不是：

```text
我指定以后搜索引擎必须服从
```

---

## 5.3 Self-referencing Canonical

即使当前页面已经是正式页面，也可以：

```html
<link rel="canonical" href="https://example.com/blog/astro" />
```

让它指向自己。

也就是：

```text
Self-referencing Canonical
```

这样页面能够更加明确地说明：

> 我就是这份内容的标准地址。

目前我们的 `BaseLayout` 已经为页面预留了 canonical 能力。

---

# 6. 为什么 Astro `site` 配置和 Canonical 有关系？

Canonical 最终应该是一个完整 URL：

```text
https://example.com/blog/astro
```

而不能只知道：

```text
/blog/astro
```

Astro 提供：

```text
Astro.site;
```

保存站点正式地址。

再结合：

```text
Astro.url.pathname;
```

就可以得到：

```text
Astro.site
+
pathname
        ↓
Canonical URL
```

例如：

```text
Astro.site
https://zhou.dev

pathname
/blog/frontend/astro

↓

https://zhou.dev/blog/frontend/astro
```

这也是为什么项目早期我没有为了让 canonical 立刻出现，就随便配置：

```text
https://example.com
```

这种假的生产域名。

因为 canonical 表示：

> 我认为这个页面真正的正式地址是什么。

那么就应该等生产部署地址真正确定以后，再配置：

```text
site: 'https://真实生产域名';
```

而不是用一个临时地址污染页面 metadata。

---

# 7. `noindex`：能够打开的页面，不一定应该进入搜索结果

目前 `BaseLayout` 还支持：

```text
noindex?: boolean;
```

使用以后能够生成类似：

```html
<meta name="robots" content="noindex" />
```

它表达：

> 我不希望这个页面进入搜索索引。

这里我第一次清楚地区分了两个概念：

```text
用户可以访问
```

和：

```text
搜索引擎应该把它放进搜索结果
```

并不是一回事。

未来可能存在：

```text
测试页面
临时页面
某些重复内容页面
内部用途页面
```

它们可以通过 URL 打开，但并不一定值得进入搜索结果。

---

# 8. `noindex` 和 robots.txt 不是一回事

这也是一个很容易混淆的地方。

我以前可能会简单理解成：

```text
不希望 Google 看
→ robots.txt
```

实际上应该拆开：

```text
robots.txt
主要回答：
爬虫是否允许抓取这个 URL？
```

而：

```text
noindex
主要回答：
这个页面是否应该进入搜索结果？
```

甚至存在一个看起来很反直觉的情况：

如果：

```text
robots.txt
```

已经完全禁止搜索引擎访问页面，

那么搜索引擎可能根本无法抓取：

```html
<meta name="robots" content="noindex" />
```

因为它连 HTML 都没有读取。

所以：

```text
禁止 Crawling
```

和：

```text
禁止 Indexing
```

是两个不同问题。

我们目前还没有真正实现 robots.txt。

等做到 Production SEO 阶段，再继续深入。

---

# 9. 静态 HTML 为什么适合内容网站？

这是 Astro 开发过程中让我印象比较深的一件事。

我的文章构建过程基本是：

```text
Markdown
   ↓
Content Collection
   ↓
Astro
   ↓
HTML
```

最终浏览器拿到页面时，已经存在：

```html
<h1>文章标题</h1>

<p>文章正文...</p>
```

而不是：

```html
<div id="app"></div>
```

然后必须：

```text
加载 JavaScript
   ↓
初始化应用
   ↓
请求数据
   ↓
React/Vue render
   ↓
才看到文章
```

对于一个以内容为核心的网站，这种差异很重要。

---

## 9.1 但“静态 HTML = SEO 排名更高”是错误理解

这里也需要避免走向另一个极端。

不能简单说：

> Astro 静态生成，所以 SEO 一定比 React 好。

搜索引擎本身可以执行 JavaScript。

真正的区别是：

```text
核心内容直接存在 HTML
```

会减少：

```text
内容获取
```

对客户端 JavaScript 执行的依赖。

因此更准确的表述应该是：

> 静态生成和服务端预渲染能够让用户和搜索爬虫更直接地获得核心内容，同时减少客户端运行时成本。

它是一个非常适合内容网站的工程基础。

但不是一个：

```text
用了 Astro
→ Google 自动提高排名
```

的 SEO 魔法。

---

# 10. Semantic HTML：让页面结构真的表达内容

目前博客中大量使用：

```html
<header>
  <nav>
    <main>
      <article>
        <section>
          <footer>
            <h1>
              <h2>
                <p>
                  <a> <time></time></a>
                </p>
              </h2>
            </h1>
          </footer>
        </section>
      </article>
    </main>
  </nav>
</header>
```

而不是所有东西都写：

```html
<div></div>
```

语义化 HTML 首先是正确的 Web 开发实践。

对于搜索引擎，它也能够让 HTML 自己表达：

```text
这是文章
这是主要标题
这是导航
这是正文区域
这是发布时间
这是链接
```

例如文章：

```html
<article>
  <header>
    <h1>从 0 开始理解 SEO</h1>

    <time datetime="2026-08-11"> 2026 年 8 月 11 日 </time>
  </header>

  ...
</article>
```

相比：

```html
<div>
  <div>从 0 开始理解 SEO</div>
  <div>2026-08-11</div>
</div>
```

前者显然携带了更多明确的内容结构。

---

# 11. H1 和 Title 是同一个东西吗？

目前我会刻意区分：

```text
<title>
```

和：

```text
<h1>
```

`<title>` 位于：

```text
<head>
```

主要描述整个 HTML 文档。

而 `<h1>` 是：

```text
用户真正看到的页面主标题
```

例如：

```html
<title>从 0 开始理解 SEO：我的 Astro 博客实践 | Zhou</title>
```

页面正文：

```html
<h1>从 0 开始理解 SEO：我的 Astro 博客实践笔记</h1>
```

两者可以高度相关，但不要求逐字完全一致。

重要的是：

```text
它们都应该明确表达这个页面真正讨论什么
```

而不能：

```text
<title>
Astro SEO 实践
```

页面却：

```text
<h1>
我的学习日记
```

形成明显语义冲突。

---

# 12. `lang="zh-CN"`：重要，但不要神化它的 SEO 作用

我们的根 HTML：

```html
<html lang="zh-CN"></html>
```

这是正确的 HTML 文档语义。

它可以帮助：

```text
浏览器
辅助技术
翻译工具
其他用户代理
```

理解页面主要语言。

但是这里同样容易产生一个 SEO 误解：

> Google 是不是看到 `lang="zh-CN"` 才知道这是中文页面？

并不是。

Google 会根据页面实际内容判断语言，并不依赖 HTML `lang` 属性来完成语言识别。

所以目前我会把：

```text
lang
```

首先看作：

```text
HTML 文档语义
```

而不是某种 SEO 排名技巧。

---

## 12.1 以后如果真的做中英文博客怎么办？

如果未来网站拥有：

```text
/blog/zh/astro

/blog/en/astro
```

这种真正不同语言版本，

那么需要进一步学习的是：

```text
hreflang
```

也就是告诉搜索引擎：

> 这些 URL 是同一内容的不同语言或地区版本。

目前网站还没有国际化内容，因此暂时不提前实现。

---

# 13. Open Graph：SEO 和 Social Sharing 开始分开

项目的 `BaseLayout` 目前还支持：

```html
<meta property="og:title" />
<meta property="og:description" />
<meta property="og:type" />
<meta property="og:url" />
<meta property="og:locale" />
```

这些属于：

```text
Open Graph
```

它们最初解决的是：

> 一个网页被分享到社交平台以后，平台应该如何理解并展示这个页面？

例如：

```text
文章标题
描述
URL
图片
内容类型
```

可以通过 Open Graph metadata 描述。

---

## 13.1 Open Graph 不等于 Google SEO

这是一个很重要的边界。

不能说：

```text
加入 og:title
↓
Google 排名更高
```

Open Graph 更准确的价值是：

```text
网页被分享
        ↓
平台读取 Metadata
        ↓
生成更完整的分享卡片
```

但是 metadata 之间又不是绝对隔离的。

例如搜索系统生成页面标题时，也可能参考：

```text
og:title
```

因此我现在会把网站 metadata 分成两个主要方向：

```text
Page / Search Metadata
├── title
├── description
├── canonical
└── robots

Social Metadata
├── og:title
├── og:description
├── og:type
├── og:url
└── 未来的 og:image
```

它们共享页面内容模型，但解决的问题不同。

---

# 14. Twitter Card 也是 Social Metadata

目前还配置了：

```html
<meta name="twitter:card" content="summary" />
```

它和 Open Graph 类似，也是在描述页面被分享到相关社交环境时应该怎样展示。

这让我开始重新理解：

```html
<head></head>
```

过去：

```text
<head>
≈
title + css + js
```

现在：

```text
<head>
├── 文档信息
├── Search Metadata
├── Social Metadata
├── Canonical
├── Robots
└── 浏览器行为配置
```

对于一个内容网站来说，`<head>` 本身已经是一个值得认真设计的系统。

---

# 15. React 会不会让 SEO 变差？

这个问题是在项目第一次引入 React Island 以后出现的。

博客本身坚持：

```text
Astro-first
```

但搜索 Command Palette 已经开始使用 React。

于是自然会产生一个问题：

> 页面里出现 React，是不是意味着这些内容要依赖 JavaScript 才能被搜索引擎看到？

答案是：

> 不一定。

关键不是：

```text
有没有 React
```

而是：

```text
核心内容最初是怎样被渲染出来的
```

---

# 16. Rendering 和 Hydration 是两个不同概念

这是 Astro Islands 架构里非常重要的一点。

例如：

```astro
<SearchCommand client:load posts={posts} />
```

看到：

```text
client:load
```

很容易理解成：

```text
浏览器加载 React
↓
React 才开始生成 UI
```

但 Astro 默认不是这样的。

对于使用 React、Vue 等框架的组件，除 `client:only` 之外，Astro 会先生成 HTML。

也就是说：

```text
Build / Server
      ↓
React Component
      ↓
HTML
```

浏览器首先拿到已经存在的 HTML。

然后：

```text
client:load
```

控制的是：

> 什么时候把 React JavaScript 发送到浏览器，并让现有 HTML 获得交互能力。

这个过程就是：

```text
Hydration
```

因此：

```text
Rendering
≠
Hydration
```

可以理解为：

```text
Rendering

组件
 ↓
HTML
```

而：

```text
Hydration

已有 HTML
 ↓
绑定 React runtime
 ↓
获得 state / event / interaction
```

---

# 17. 为什么这个区别和 SEO 有关系？

对于内容型网站：

```text
文章标题
文章正文
项目介绍
导航链接
```

这些重要信息如果已经直接存在于初始 HTML 中，

搜索引擎并不需要先等待：

```text
下载完整 React bundle
↓
执行应用
↓
再生成所有正文
```

才能获得这些内容。

当然，Google 可以运行 JavaScript。

但 Google 自己也仍然推荐使用：

```text
Server-side rendering
Static rendering
Hydration
```

等方式，让页面内容更加直接地可获得。

所以我现在对 React 与 SEO 的理解是：

```text
React
本身不是 SEO 问题
```

真正需要关注的是：

```text
核心内容是否过度依赖
客户端 JavaScript 才能产生
```

---

# 18. Astro Islands 为什么适合这个博客？

这个博客目前逐渐形成：

```text
Article Content
→ Astro / Static HTML

Blog List
→ Astro / Static HTML

Hero
→ Astro + CSS

Theme Switch
→ Astro + 少量原生 JS

Search Command
→ React Island

复杂交互组件
→ 按需 React Island
```

也就是说：

```text
内容
优先直接存在 HTML

交互
按需增加 JavaScript
```

这同时符合：

```text
性能
SEO
渐进增强
Astro-first
```

几个目标。

因此：

> Astro-first 不仅仅是为了减少 JavaScript。

对于一个个人技术博客，它实际上也是一种内容优先的架构选择。

---

# 19. `client:load` 和 `client:visible` 会影响什么？

目前 Search 使用：

```astro
client:load
```

表示：

```text
页面加载
↓
尽快加载组件 JS
↓
Hydration
```

因为：

```text
Ctrl / Cmd + K
```

属于用户进入页面后随时可能使用的能力。

而对于未来首屏以下的复杂组件，可以使用：

```astro
client:visible
```

让组件接近 viewport 后再 hydration。

这里优化的是：

```text
客户端 JavaScript 的加载时机
```

而不是：

```text
SEO Metadata
```

因为这些组件仍然可以在构建阶段先生成 HTML。

所以 hydration strategy 首先是一个：

```text
性能 / 交互优先级问题
```

但它间接支持了我们希望：

```text
核心内容优先
客户端 JS 后置
```

的整体网站架构。

---

# 20. `client:only` 为什么需要更谨慎？

Astro 还有：

```astro
client:only
```

它和前面的方式不同。

`client:only` 会跳过服务端 HTML 渲染。

变成更接近：

```text
Browser
↓
下载框架 JS
↓
Render Component
```

这并不是说：

```text
client:only
不能使用
```

有些真正依赖：

```text
window
document
Canvas
WebGL
浏览器专属 API
```

的组件可能确实需要。

但是对于：

```text
博客正文
文章标题
导航
核心项目描述
```

这种页面核心内容，没有理由使用 `client:only`。

所以以后增加 React Island 时，我会额外问一个问题：

> 这个组件真的需要跳过服务器 / 构建阶段渲染吗？

如果没有明确理由：

```text
不要 client:only
```

---

# 21. Astro-first 和 SEO 的关系

项目最开始确立：

```text
Astro-first
Why React?
```

原本主要是在考虑：

```text
减少客户端 JavaScript
保持页面性能
避免把静态 UI React 化
```

但做了一段时间以后，我发现它和 SEO 的目标天然一致。

例如文章页面：

```text
Markdown
↓
Content Collection
↓
Astro
↓
Semantic HTML
↓
直接输出
```

而不是：

```text
Markdown API
↓
Browser Fetch
↓
React State
↓
Client Render
```

于是：

```text
内容
```

成为网站的一等公民，

而：

```text
JavaScript
```

只是为需要交互的区域增强体验。

这也是我现在越来越认可 Astro 用于个人内容网站的原因。

---

# 22. 到目前为止，我真正实践过哪些 SEO？

目前项目实际涉及：

## 页面身份

```text
<title>
Meta Description
Canonical URL
```

## 搜索引擎控制

```text
robots noindex
```

## 内容表达

```text
Semantic HTML
独立 H1
文章 Metadata
静态 HTML
```

## 文档语言

```text
<html lang="zh-CN">
```

## 社交分享

```text
Open Graph
Twitter Card
```

## Rendering

```text
Static Rendering
React Island
Hydration
client:load
```

这些内容让我对 SEO 的理解已经开始从：

```text
给页面加 meta 标签
```

变化成：

```text
设计一个搜索引擎和用户
都能够正确理解的内容网站
```

---

# 23. 当前几个最重要的纠错

如果现在让我总结最容易犯的错误，我会列出下面这些。

---

## 错误一：Meta Description 决定搜索结果摘要

不准确。

更合理的是：

```text
页面内容
+
Meta Description
+
当前搜索请求
        ↓
搜索引擎决定 Snippet
```

---

## 错误二：`<title>` 就是最终搜索标题

不准确。

Title 是非常重要的输入信号，但搜索引擎可能根据页面实际内容生成不同的 Title Link。

---

## 错误三：Canonical 是强制命令

不准确。

它是非常重要的 canonicalization 信号，但搜索引擎仍然会综合其他信息判断标准 URL。

---

## 错误四：robots.txt 和 noindex 是一回事

错误。

```text
robots.txt
→ Crawling

noindex
→ Indexing
```

是两个不同问题。

---

## 错误五：用了 Astro SEO 就一定更好

错误。

Astro 不会自动提高内容质量，也不会自动提高搜索排名。

它提供的是一个非常适合：

```text
Content-first
Static HTML
Selective Hydration
Low Client JS
```

的技术基础。

---

## 错误六：用了 React SEO 就会变差

同样错误。

真正需要关注：

```text
核心内容什么时候产生？
是否存在于初始 HTML？
客户端 JS 是否被过度依赖？
```

而不是：

```text
React === SEO 差
```

---

# 24. 目前我的 SEO 心智模型

如果现在让我用一张图总结：

```text
                    Content
                       │
          ┌────────────┼────────────┐
          │            │            │
        Title      Description    Body
          │            │            │
          └────────────┼────────────┘
                       ↓
                  Semantic HTML
                       ↓
                     Astro
                       ↓
                  Static HTML
                       ↓
             ┌─────────┴─────────┐
             ↓                   ↓
        Search Engine           User
             │
             ↓
       Crawl / Render
             ↓
           Index
             ↓
        Search Result
```

另外还有一条 URL 线：

```text
Page
 ↓
Canonical
 ↓
确定标准 URL 信号
```

以及一条客户端增强线：

```text
Static HTML
 ↓
React Island
 ↓
Selective Hydration
 ↓
Interaction
```

现在我终于开始理解：

> SEO 并不是一个后期往网站上补几个插件的任务。

它从页面内容模型、URL、HTML 和 Rendering Architecture 就已经开始了。

---

# 25. 下一阶段还需要学习什么？

目前我刻意没有提前实现很多 SEO 能力。

接下来随着博客正式准备上线，还会遇到：

```text
sitemap.xml
robots.txt
Open Graph Image
favicon
Article Structured Data
JSON-LD
RSS
404
redirect
Search Console
索引提交
Core Web Vitals
内部链接
文章发布日期
站点名称
```

如果未来开始做英文内容，还会进一步涉及：

```text
hreflang
国际化 URL
多语言 canonical
```

但我不会为了让：

```text
SEO Checklist
```

看起来全部打勾，就一次性把它们全部加入项目。

这个博客仍然会采用同样的学习方式：

```text
真实需求出现
   ↓
理解 SEO 问题
   ↓
实现
   ↓
验证
   ↓
更新本文
```

---

# 当前阶段总结

开始这个项目之前，我可能会把 SEO 理解成：

```text
关键词
+
meta description
+
让 Google 搜到
```

但现在我的理解已经变成：

```text
让搜索引擎发现内容
        ↓
让它能够获取内容
        ↓
让 HTML 清晰表达内容
        ↓
让 URL 明确表达页面身份
        ↓
通过 Metadata 提供准确页面信息
        ↓
减少核心内容对客户端运行时的不必要依赖
        ↓
最终让真正有价值的内容更容易触达用户
```

而对于个人技术博客来说，

目前我认为最重要的 SEO 基础并不是掌握多少“排名技巧”。

而是：

> 写真正值得搜索的内容，用稳定的 URL 承载它，用清晰的 HTML 和 Metadata 描述它，并尽可能让内容本身成为 Web 的一等公民。

这篇文章还远远没有结束。

我的博客继续成长，它也会继续成长。

---

# Sitemap：主动告诉搜索引擎网站有哪些重要页面

做到博客准备上线时，我第一次真正实现了 sitemap。

以前看到：

```text
sitemap.xml
```

我会简单理解成：

> 做 SEO 的网站都要有这个文件。

现在我更愿意从搜索引擎发现页面的过程理解它。

搜索引擎可以通过链接发现页面：

```text
Home
↓
Blog
↓
Article
```

但对于一个刚上线的网站，它可能：

- 几乎没有外部链接
- 文章数量会持续增加
- 搜索引擎还不了解网站结构

Sitemap 相当于网站主动提供：

```text
这些 URL 是我认为重要的页面。
```

例如：

```text
/
/blog
/blog/astro
/blog/seo
```

但这里需要纠正一个很重要的误区：

```text
进入 Sitemap
≠
一定被 Google 抓取

被抓取
≠
一定被 Google 索引

被索引
≠
一定获得排名
```

因此 Sitemap 首先解决的是：

```text
URL Discovery
```

而不是：

```text
Ranking
```

我的 Astro 博客使用 `@astrojs/sitemap` 根据最终生成的页面自动创建 Sitemap。

这意味着 sitemap 不再单独维护文章列表：

```text
Content Collection
↓
Published Routes
↓
Astro Build
↓
Sitemap
```

没有生成路由的 draft 文章自然不会进入 sitemap。

这也减少了一份需要手动维护的 SEO 状态。

# robots.txt：告诉爬虫哪些路径可以抓取

准备上线时，我也第一次真正创建了：

```text
/robots.txt
```

目前博客的策略非常简单：

```text
User-agent: *
Allow: /
```

意思是允许搜索引擎爬虫抓取整个公开网站。

当生产域名确定后，还会增加：

```text
Sitemap: https://example.com/sitemap-index.xml
```

让访问 robots.txt 的 crawler 同时知道 sitemap 的位置。

这里我也进一步理解了：

```text
robots.txt
→ Crawl Control

noindex
→ Index Control
```

两者不是同一个东西。

甚至如果 robots.txt 完全禁止搜索引擎抓取一个页面：

```text
Disallow: /page
```

搜索引擎可能根本读取不到这个页面内部的：

```html
<meta name="robots" content="noindex" />
```

因此：

> 如果希望通过 `noindex` 阻止页面进入搜索结果，通常仍然需要允许 crawler 访问这个页面，从而让它真正读取到 `noindex`。

这让我开始真正区分：

```text
Discovery
Crawling
Rendering
Indexing
Ranking
```

这些以前经常被我统称成“Google 能不能搜到”的不同阶段。

# Core Web Vitals：性能为什么也会进入 SEO 讨论

准备上线博客时，我第一次系统检查了 Core Web Vitals。

目前主要包括：

- LCP：加载体验
- INP：交互响应
- CLS：视觉稳定

我一开始容易把它理解成：

> Lighthouse 分数越高，SEO 就越好。

但这并不准确。

Core Web Vitals 更本质上是在衡量真实用户体验，Google 的搜索系统也会参考页面体验相关信号，但它并不是一个“性能分数直接换排名”的公式。

在上线前，我主要通过 Lighthouse 做实验室测试：

```text
LCP
CLS
TBT
```

其中 Lighthouse 无法真正测量 INP，因为 INP 依赖真实用户产生的交互。

因此开发阶段可以使用 TBT 帮助发现主线程阻塞问题：

```text
Lab
→ LCP / CLS / TBT

Production
→ LCP / CLS / INP
```

这也让我开始区分：

```text
Lighthouse
→ 开发阶段诊断工具

Core Web Vitals field data
→ 真实用户体验数据
```

所以性能优化的目标不应该是：

```text
Lighthouse 100
```

而应该是：

```text
页面快速出现
+
交互及时响应
+
布局保持稳定
```

# Search Console：上线以后 SEO 才真正开始

博客正式上线之后，我第一次把网站添加到了 Google Search Console。

这让我开始意识到，前面做的：

- title
- canonical
- sitemap
- robots.txt

都只是网站提供给搜索引擎的信号。

真正的过程是：

```text
网站上线
    ↓
Discovery
    ↓
Crawling
    ↓
Rendering
    ↓
Indexing
    ↓
Search Results
```

Sitemap Success 不代表已经被索引

Search Console 中 Sitemap 显示 `Success`，只能说明 Google 成功读取了 Sitemap。

它不代表：

```text
Sitemap Success
=
Indexed
```

更不代表：

```text
Indexed
=
获得排名
```

## URL Inspection

通过 URL Inspection，我可以分别观察：

```text
Crawl allowed?
Indexing allowed?
User-declared canonical
Google-selected canonical
```

其中我第一次真正理解：

```text
User-declared canonical
```

只是网站告诉 Google：

> 我认为这个 URL 是规范版本。

而：

```text
Google-selected canonical
```

才是 Google 在完成抓取和索引之后实际选择的规范 URL。

因此：

```text
Canonical
=
Strong signal

而不是

Canonical
=
Command
```

## Live Test 与 Indexed Version

Search Console 默认展示的是 Google 当前 Index 中保存的页面信息。

而

```text
Test Live URL
```

测试的是网站当前线上版本。

因此刚修复一个 SEO 问题时：

```text
Indexed Version
可能还是旧的

Live URL
已经是新的
```

需要等待 Google 再次抓取以后，两者才会逐渐一致。

这让我第一次真正把 SEO 从：

```text
配置 meta 标签
```

理解成：

```text
网站
↓
向搜索引擎提供信号
↓
搜索引擎抓取
↓
搜索引擎自行判断
```

# Open Graph Image：分享体验不是搜索排名

Open Graph metadata 可以告诉支持它的平台：

- 页面标题
- 描述
- canonical URL
- 代表图片

其中：

```html
<meta property="og:image" content="https://example.com/og/article.png" />
```

会成为页面在社交平台分享时的重要视觉内容。

我的博客没有在运行时生成这些图片，而是：

```text
Content Collection
        ↓
Astro build
        ↓
OG image generator
        ↓
static PNG
```

因此每篇文章虽然拥有独立的动态 OG Image，但生产环境实际提供的仍然只是静态资源。

这让我进一步理解：

> Build-time dynamic 和 runtime dynamic 是两件不同的事情。

OG metadata 会改善内容在社交平台中的展示和传播体验，但它本身不应该被理解为直接提高 Google 排名的手段。

# 信息架构与内部链接：让文章不再成为孤岛

随着博客文章数量增加，我开始发现仅有一个按发布时间排序的文章列表并不够。

原来的结构大致是：

```text
Blog
  ↓
Article
```

用户读完文章以后，除了返回博客列表，很难继续发现相关内容。

因此我增加了：

```text
Tags
Series
Related Posts
```

最终：

```text
Tag
  ↓
Related Articles

Series
  ↓
Article 1
  ↓
Article 2
  ↓
Article 3

Article
  ↓
Related Posts
```

这里让我理解了内部链接的两个价值。

### 对用户

内部链接帮助读者回答：

> 接下来还有什么值得继续阅读？

例如文章中的：

```text
#Astro
```

会链接到所有 Astro 相关文章，而 Series 则提供明确的连续阅读路径。

### 对搜索引擎

Google 可以通过普通的 `<a href>` 链接发现网站中的其他页面。

因此重要页面不应该成为只有 Sitemap 才能发现的孤立 URL。

内部链接也不是简单地：

```text
链接越多越好
```

更重要的是：

```text
相关内容
+
有意义的 anchor text
+
清晰的信息层级
```

因此我的实现没有为了增加链接数量而随机推荐文章，而是只根据：

```text
same series
+
shared tags
```

生成 Related Posts。

如果没有真正相关的文章，则不显示 Related Posts。

这让我开始把 SEO 从单个页面的：

```text
title
description
canonical
```

扩展到整个网站的：

```text
Information Architecture
+
Internal Linking
```

Google 当前也明确建议：站内重要页面应当从其他可发现页面获得至少一个内部链接，并使用能帮助用户和 Google 理解目标内容的 anchor text。
