// @ts-check

import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },

  // JavaScript / TypeScript
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],

    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Astro
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],

  // Common project rules
  {
    plugins: {
      perfectionist,
    },

    rules: {
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          newlinesBetween: 1,
          sortSideEffects: false,

          groups: [
            'type-import',

            ['value-builtin', 'value-external'],

            'value-internal',

            ['value-parent', 'value-sibling', 'value-index'],

            'side-effect',

            'side-effect-style',

            'style',

            'unknown',
          ],
        },
      ],

      'perfectionist/sort-named-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
    },
  },
]);
