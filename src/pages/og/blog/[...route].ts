import { OGImageRoute } from 'astro-og-canvas';

import { ogConfig } from '@/config/og';
import { getPublishedPosts } from '@/lib/blog';

const posts = await getPublishedPosts();

const pages = Object.fromEntries(
  posts.map(({ id, data }) => [
    id,
    {
      title: data.title,
      description: data.description,
    },
  ]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,

  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,

    bgGradient: ogConfig.bgColor,

    border: {
      color: ogConfig.borderColor,
      width: 8,
      side: 'inline-start',
    },

    padding: 72,

    fonts: ogConfig.fontPaths,

    font: {
      title: {
        size: 64,
        weight: 'SemiBold',
        color: ogConfig.titleColor,
        families: ['Noto Sans SC'],
        lineHeight: 1.15,
      },

      description: {
        size: 28,
        weight: 'Normal',
        color: ogConfig.descriptionColor,
        families: ['Noto Sans SC'],
        lineHeight: 1.45,
      },
    },
  }),
});
