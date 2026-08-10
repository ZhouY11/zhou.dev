// @ts-check

import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },

  // JavaScript / TypeScript
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],

    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Astro
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],

  // React
  {
    files: ['**/*.{jsx,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

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
