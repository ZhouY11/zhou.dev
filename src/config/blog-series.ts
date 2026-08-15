export const BLOG_SERIES_IDS = ['astro-blog-from-zero'] as const;

export type BlogSeriesId = (typeof BLOG_SERIES_IDS)[number];

interface BlogSeriesDefinition {
  title: string;
  description: string;
}

export const blogSeries = {
  'astro-blog-from-zero': {
    title: '从 0 到 1 构建 Astro 个人博客',
    description: '记录这个个人网站从工程基线、内容系统、SEO、上线到个人品牌演进的完整实践。',
  },
} satisfies Record<BlogSeriesId, BlogSeriesDefinition>;

export function getBlogSeries(id: BlogSeriesId) {
  return blogSeries[id];
}
