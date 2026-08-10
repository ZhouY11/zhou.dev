---
title: 为什么我开始使用 Astro 搭建个人博客
description: 从 Vue 技术栈出发，记录 Astro 个人技术站的搭建过程。
publishedAt: 2026-08-10
updatedAt: 2026-08-10
tags:
  - Astro
  - Frontend
featured: true
draft: false
---

# 为什么选择 Astro

这是我的第一篇 Astro 博客。

对于一个技术博客而言，我比较关注：

- SEO
- 页面性能
- Markdown 写作体验
- 内容管理
- 可扩展性

## Astro Component

Astro Component 中的逻辑可以在构建阶段执行：

```astro
---
const message = 'Hello Astro';
---

<h1>{message}</h1>
```
