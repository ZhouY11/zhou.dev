import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { env } from 'node:process';
import { visualizer } from 'rollup-plugin-visualizer';

const deployPlatform = env.DEPLOY_PLATFORM ?? 'local';

const site = env.SITE_URL ?? 'https://zhou-dev.vercel.app';

const isVercel = deployPlatform === 'vercel';

// https://astro.build/config
export default defineConfig({
  site,

  output: 'static',

  ...(isVercel ? { adapter: vercel() } : {}),

  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        emitFile: true,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ],
  },

  integrations: [react(), sitemap()],
});
