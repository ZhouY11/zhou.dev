import type { CollectionEntry } from 'astro:content';

import { type BlogSeriesId, getBlogSeries } from '@/config/blog-series';

export type BlogEntry = CollectionEntry<'blog'>;

export interface BlogPostSummary {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  tags: string[];
  href: string;
}

export interface BlogTagSummary {
  slug: string;
  label: string;
  count: number;
}

export interface BlogSeriesSummary {
  id: BlogSeriesId;
  title: string;
  description: string;
  count: number;
}

export interface BlogSeriesContext {
  id: BlogSeriesId;
  title: string;
  description: string;

  position: number;
  total: number;

  previous?: BlogPostSummary;
  next?: BlogPostSummary;
}

export function toBlogPostSummary(post: BlogEntry): BlogPostSummary {
  return {
    id: post.id,
    title: post.data.title,
    description: post.data.description,
    publishedAt: post.data.publishedAt,
    tags: post.data.tags,
    href: `/blog/${post.id}`,
  };
}

export function slugifyBlogTag(tag: string) {
  return tag
    .trim()
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function getBlogTagPath(tag: string) {
  return `/blog/tags/${slugifyBlogTag(tag)}`;
}

export function buildBlogTags(posts: BlogEntry[]): BlogTagSummary[] {
  const tagMap = new Map<
    string,
    {
      label: string;
      count: number;
    }
  >();

  for (const post of posts) {
    for (const rawTag of post.data.tags) {
      const label = rawTag.trim();
      const slug = slugifyBlogTag(label);

      if (!slug) {
        throw new Error(`Unable to generate a tag slug for "${rawTag}" in "${post.id}".`);
      }

      const existing = tagMap.get(slug);

      if (existing && existing.label !== label) {
        throw new Error(
          `Blog tag slug collision: "${existing.label}" and "${label}" both resolve to "${slug}".`,
        );
      }

      tagMap.set(slug, {
        label,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  return [...tagMap.entries()]
    .map(([slug, tag]) => ({
      slug,
      label: tag.label,
      count: tag.count,
    }))
    .sort((a, b) => {
      return a.label.localeCompare(b.label, 'zh-CN');
    });
}

export function filterPostsByTag(posts: BlogEntry[], tagSlug: string) {
  return posts.filter((post) => {
    return post.data.tags.some((tag) => slugifyBlogTag(tag) === tagSlug);
  });
}

export function filterPostsBySeries(posts: BlogEntry[], seriesId: BlogSeriesId) {
  const seriesPosts = posts
    .filter((post) => post.data.series?.id === seriesId)
    .sort((a, b) => {
      return (a.data.series?.order ?? 0) - (b.data.series?.order ?? 0);
    });

  const orders = new Map<number, string>();

  for (const post of seriesPosts) {
    const order = post.data.series?.order;

    if (!order) continue;

    const existing = orders.get(order);

    if (existing) {
      throw new Error(
        `Duplicate series order "${order}" in "${seriesId}": "${existing}" and "${post.id}".`,
      );
    }

    orders.set(order, post.id);
  }

  return seriesPosts;
}

export function buildBlogSeries(posts: BlogEntry[]): BlogSeriesSummary[] {
  const countMap = new Map<BlogSeriesId, number>();

  for (const post of posts) {
    const id = post.data.series?.id;

    if (!id) continue;

    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  return [...countMap.entries()].map(([id, count]) => {
    const series = getBlogSeries(id);

    return {
      id,
      title: series.title,
      description: series.description,
      count,
    };
  });
}

export function buildSeriesContext(
  posts: BlogEntry[],
  currentPost: BlogEntry,
): BlogSeriesContext | undefined {
  const seriesId = currentPost.data.series?.id;

  if (!seriesId) {
    return undefined;
  }

  const seriesPosts = filterPostsBySeries(posts, seriesId);

  const index = seriesPosts.findIndex((post) => post.id === currentPost.id);

  if (index === -1) {
    return undefined;
  }

  const series = getBlogSeries(seriesId);

  const previous = seriesPosts[index - 1];
  const next = seriesPosts[index + 1];

  return {
    id: seriesId,
    title: series.title,
    description: series.description,

    position: index + 1,
    total: seriesPosts.length,

    previous: previous ? toBlogPostSummary(previous) : undefined,

    next: next ? toBlogPostSummary(next) : undefined,
  };
}

export function buildRelatedPosts(
  posts: BlogEntry[],
  currentPost: BlogEntry,
  limit = 3,
): BlogPostSummary[] {
  const currentTags = new Set(currentPost.data.tags);
  const currentSeries = currentPost.data.series?.id;

  return posts
    .filter((post) => post.id !== currentPost.id)
    .map((post) => {
      const sharedTagCount = post.data.tags.filter((tag) => currentTags.has(tag)).length;

      const sameSeries = Boolean(currentSeries) && post.data.series?.id === currentSeries;

      const score = sharedTagCount * 2 + (sameSeries ? 6 : 0);

      return {
        post,
        score,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.post.data.publishedAt.getTime() - a.post.data.publishedAt.getTime();
    })
    .slice(0, limit)
    .map(({ post }) => toBlogPostSummary(post));
}
