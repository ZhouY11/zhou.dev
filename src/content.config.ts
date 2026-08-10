import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

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

      featured: z.boolean().default(false),

      draft: z.boolean().default(false),

      cover: image().optional(),
    }),
});

export const collections = {
  blog,
};
