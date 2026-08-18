# Zhou.dev Project Context

Last updated: 2026-08-18

## Current State

Zhou.dev is an Astro-based personal technical blog and portfolio. The site is Chinese-first and uses React only for justified interactive islands.

Current production:

- Hosting: Vercel
- URL: `https://zhou-dev.vercel.app`
- Search Console property: current Vercel URL

New domain:

- Domain: `zhoudev.com`
- Registration: complete
- Real-name verification: complete
- `ServerHold`: removed
- Domain service status: `OK`
- ICP filing: not completed

Migration target:

- Tencent EdgeOne Makers
- Vercel remains available as backup / preview infrastructure during migration

## Current Stage

Stage 9 — Multi-platform Deployment & Domain Migration is in progress.

Planned split:

- 9.0 Multi-platform Deployment Foundation
- 9.1 EdgeOne deployment validation + ICP preparation
- 9.2 `zhoudev.com` production cutover
- 9.3 Search Console / SEO migration

## Stage 9 Implementation Status

Current deployment model:

```text
DEPLOY_PLATFORM
→ controls hosting-specific behavior

SITE_URL
→ controls canonical website identity
```

During migration validation:

```text
DEPLOY_PLATFORM=edgeone
SITE_URL=https://zhou-dev.vercel.app
```

Do **not** switch `SITE_URL` to `https://zhoudev.com` before production cutover.

Vercel-specific behavior:

- `@astrojs/vercel` is enabled only for Vercel builds
- Vercel Web Analytics is rendered only on Vercel deployments

EdgeOne behavior:

- use plain Astro static output where possible
- output directory: `dist`
- EdgeOne deployment has succeeded
- first successful deployment used Node `22.21.1` and produced an engine mismatch warning
- EdgeOne build environment is configured to Node 24.x
- pnpm `10.27.0` has been installed explicitly and successfully

Expected EdgeOne install/build:

```text
npm install --global pnpm@10.27.0 && pnpm install --frozen-lockfile
pnpm build
output: dist
```

## Runtime Baseline

```json
{
  "engines": {
    "node": "24.x"
  },
  "packageManager": "pnpm@10.27.0"
}
```

Do not lower this baseline to match a hosting provider default.

TypeScript/runtime separation:

- `tsconfig.json` → Astro / React / browser application code
- `tsconfig.node.json` → `astro.config.mjs` and Node build tooling

Node tooling may use explicit Node imports:

```js
import { env } from 'node:process';
```

Checked `.mjs` files use JSDoc types when necessary instead of disabling `checkJs`.

App-side deployment environment typing lives in `src/env.d.ts`.

## Migration Constraints

Until production cutover, keep public SEO identity on the current Vercel URL.

Do not prematurely migrate:

- Canonical URLs
- Sitemap URLs
- robots.txt Sitemap reference
- RSS URLs / GUID behavior
- `og:url`
- absolute OG image URLs
- giscus production origin
- Google Search Console

The final domain cutover should be coordinated as one controlled migration.
