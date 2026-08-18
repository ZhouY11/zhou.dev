# Zhou.dev Architecture

## Rendering Strategy

The project follows an **Astro-first** architecture.

Use Astro for:

- static pages and layouts
- navigation
- blog/project cards and lists
- Markdown rendering
- taxonomy pages
- SEO metadata
- build-time data/query logic

Use React only for genuine client interaction.

Existing justified React islands:

- `ProjectShowcase` — shadcn / React Aria Tabs
- `SearchCommand` — coordinated full-text search UI

Do not rewrite static Astro components into React for consistency or practice.

## Theme Architecture

```text
<html data-theme>
        ↓
site semantic tokens
        ↓
+-----------------------------+
|                             |
Astro UI                shadcn adapter tokens
                              ↓
                         shadcn React UI
```

The site semantic token layer is the source of truth. shadcn variables adapt from it and must not become an independent theme system.

Theme switching is Astro + vanilla JS, with System / Light / Dark behavior and flash-free initialization.

## Content Architecture

Blog content uses Astro Content Collections.

```text
/blog
├── tags/
│   └── :tag
├── series/
│   └── :series
└── article
    ├── tag links
    ├── series navigation
    └── related posts
```

Navigation rules:

- series article → series previous / next
- non-series article → chronological previous / next
- Related Posts follow navigation

Projects also use an Astro Content Collection:

```text
src/content/projects/*.md
        |
        +---- metadata → homepage / projects index
        |
        +---- Markdown body → `/projects/:id`
```

## Search Architecture

Pagefind provides full-text search.

```text
Markdown
→ Astro static HTML
→ Pagefind post-build indexing
→ `/pagefind/*`
→ SearchCommand
```

Search scope is blog articles only.

Host behavior:

- EdgeOne uses `dist/pagefind`
- Vercel also syncs Pagefind output into `.vercel/output/static/pagefind` when that directory exists
- absence of Vercel output on other hosts is expected and must not fail the build

## Comments

Comments use giscus + GitHub Discussions:

- Astro + native giscus script + vanilla JS
- no React
- mapping strategy: `pathname`
- comments remain outside Pagefind article-body indexing
- production origins stay restricted

## Analytics

Vercel Web Analytics is Vercel-only:

- render it only on Vercel
- do not emit Vercel analytics on EdgeOne
- analytics is not SEO

## OG Images

Open Graph images are generated at build time:

```text
Content Collection
→ OG route
→ image generation
→ static PNG
```

## Deployment Architecture

Hosting provider and canonical website identity are separate concerns.

```text
                        GitHub main
                             |
              +--------------+--------------+
              |                             |
           Vercel                        EdgeOne
              |                             |
DEPLOY_PLATFORM=vercel       DEPLOY_PLATFORM=edgeone
              |                             |
Vercel adapter + Analytics   Plain Astro static output
              |                             |
              +--------------+--------------+
                             |
                         SITE_URL
                             |
                     canonical identity
```

Rules:

- one `main` branch serves all hosting platforms
- do not maintain deployment-specific long-lived branches
- `DEPLOY_PLATFORM` controls provider-specific behavior
- `SITE_URL` controls canonical identity
- during migration validation, `SITE_URL` remains the Vercel URL
- after cutover, both hosts should use `https://zhoudev.com` as canonical identity
- do not operate two equally public canonical sites
