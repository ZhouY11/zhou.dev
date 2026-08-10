---
title: "为什么我开始使用 Astro 搭建个人博客"
description: "记录我从 Vue 技术栈转向 Astro 构建个人技术站的过程。"
pubDate: 2026-08-09
tags:
  - Astro
  - Frontend
  - Blog
draft: false
---

# 为什么选择 Astro

这是我的第一篇 Astro 博客。

对于一个技术博客而言，我最关注的几个问题是：

- SEO
- 页面性能
- Markdown 写作体验
- 可扩展性
- 视觉表现力

Astro 的 Islands Architecture 非常适合这种 Content Driven Website。

## Astro Component

Astro 页面中的 JavaScript 默认不会全部发送到浏览器：

\`\`\`astro
---
const message = "Hello Astro";
---

<h1>{message}</h1>
\`\`\`

这也是我选择 Astro 的重要原因之一。