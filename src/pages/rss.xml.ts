import type { APIRoute } from 'astro';

import rss from '@astrojs/rss';

import { siteConfig } from '@/config/site';
import { getPublishedPosts } from '@/lib/blog';

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('Astro site is required to generate the RSS feed.');
  }

  const posts = await getPublishedPosts();

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site,

    items: posts.map(({ id, data }) => ({
      title: data.title,
      description: data.description,
      pubDate: data.publishedAt,
      link: `/blog/${id}`,
    })),

    customData: `<language>${siteConfig.locale}</language>`,
  });
};
