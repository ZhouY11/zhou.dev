# Zhou.dev Roadmap

## Completed

- Stage 0 — Engineering Baseline ✅
- Stage 1 — Site Foundation ✅
- Stage 2 — Blog Content System ✅
- Stage 3 — Homepage Content ✅
- Stage 4 — Interactive & Visual Foundation ✅
- Stage 5 — Production Readiness ✅
- Stage 6 — GitHub CI + Ruleset ✅
- Stage 7 — Production Deployment / Finalization ✅
- Stage 8 — Personal Brand Evolution ✅
  - 8.1 About / Personal Narrative
  - 8.2 Project Case Studies
  - 8.3 Projects Index
  - 8.4 Homepage Brand Upgrade
  - 8.5 Dynamic OG Image System
  - 8.6 Analytics & Content Feedback
  - 8.7 Blog Information Architecture
  - 8.8 Pagefind Full-text Search
  - 8.9 giscus Comments

## In Progress

### Stage 9 — Multi-platform Deployment & Domain Migration 🚧

#### 9.0 Multi-platform Deployment Foundation

Goal: decouple site identity from Vercel-specific hosting behavior.

Key work:

- environment-driven `SITE_URL`
- environment-driven `DEPLOY_PLATFORM`
- conditional Vercel adapter
- conditional Vercel Analytics
- App / Node TypeScript boundary
- EdgeOne static build compatibility

#### 9.1 EdgeOne Deployment Validation + ICP Preparation

Goal: validate the production build environment and prepare mainland-capable hosting.

Key work:

- finalize Node 24.x on EdgeOne
- keep pnpm `10.27.0`
- validate Astro / Pagefind / React islands / static assets
- complete ICP filing prerequisites and process

#### 9.2 `zhoudev.com` Production Cutover

Goal: make the owned domain the single canonical site identity.

Key work:

- bind `zhoudev.com` to the production EdgeOne deployment
- validate HTTPS and DNS
- switch `SITE_URL` to `https://zhoudev.com`
- update giscus production origin
- validate Canonical / Sitemap / RSS / OG output
- keep Vercel as backup without creating a second canonical site

#### 9.3 Search Console / SEO Migration

Goal: migrate search-engine identity from the Vercel platform domain to the owned domain.

Key work:

- add/verify the new Search Console property
- submit the new sitemap
- preserve the old property for monitoring
- configure old-domain redirects where feasible
- verify canonical selection and indexing

## Future Stages

Define future stages only when a real product, content, performance, or learning requirement appears. Avoid infrastructure for its own sake.
