import type { BlogSearchItem } from '../types/blog';
import type { BlogSeriesId } from '@/config/blog-series';

import { getCollection } from 'astro:content';

import {
  buildBlogSeries,
  buildBlogTags,
  buildRelatedPosts,
  buildSeriesContext,
  filterPostsBySeries,
  filterPostsByTag,
} from '@/lib/blog-taxonomy';

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => {
    return !data.draft;
  });

  return posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export async function getFeaturedPosts(limit = 3) {
  const posts = await getPublishedPosts();

  return posts.filter(({ data }) => data.featured).slice(0, limit);
}

export async function getBlogSearchItems(): Promise<BlogSearchItem[]> {
  const posts = await getPublishedPosts();

  return posts.map(({ id, data }) => ({
    title: data.title,
    description: data.description,
    tags: data.tags,
    href: `/blog/${id}`,
  }));
}

export async function getBlogTags() {
  const posts = await getPublishedPosts();

  return buildBlogTags(posts);
}

export async function getPostsByTag(tagSlug: string) {
  const posts = await getPublishedPosts();

  return filterPostsByTag(posts, tagSlug);
}

export async function getBlogSeriesList() {
  const posts = await getPublishedPosts();

  return buildBlogSeries(posts);
}

export async function getPostsBySeries(seriesId: BlogSeriesId) {
  const posts = await getPublishedPosts();

  return filterPostsBySeries(posts, seriesId);
}

export async function getBlogPostNavigation(
  currentPost: Awaited<ReturnType<typeof getPublishedPosts>>[number],
) {
  const posts = await getPublishedPosts();

  return {
    series: buildSeriesContext(posts, currentPost),

    relatedPosts: buildRelatedPosts(posts, currentPost, 3),
  };
}
