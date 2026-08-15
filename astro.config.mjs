// @ts-check

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { visualizer } from 'rollup-plugin-visualizer';
// https://astro.build/config
export default defineConfig({
  site: 'https://zhou-dev.vercel.app',

  output: 'static',
  adapter: vercel(),

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
