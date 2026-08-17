import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

import { BLOG_SERIES_IDS } from '@/config/blog-series';

const blog = defineCollection({
  loader: glob({
    base: './src/content/blog',
    pattern: '**/*.md',
  }),

  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),

      description: z.string().min(1),

      publishedAt: z.coerce.date(),

      updatedAt: z.coerce.date().optional(),

      tags: z.array(z.string()).default([]),

      series: z
        .object({
          id: z.enum(BLOG_SERIES_IDS),
          order: z.number().int().positive(),
        })
        .optional(),

      featured: z.boolean().default(false),

      draft: z.boolean().default(false),

      comments: z.boolean().default(true),

      cover: image().optional(),
      coverAlt: z.string().optional(),
    }),
});

const projects = defineCollection({
  loader: glob({
    base: './src/content/projects',
    pattern: '**/*.md',
  }),

  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),

    role: z.string().min(1),

    year: z.string().min(1),

    tags: z.array(z.string()).default([]),

    highlights: z.array(z.string()).default([]),

    featured: z.boolean().default(false),
    draft: z.boolean().default(false),

    repository: z.url().optional(),
    website: z.url().optional(),

    order: z.number().int().default(0),
  }),
});

export const collections = {
  blog,
  projects,
};
