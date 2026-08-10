import { getCollection } from 'astro:content';

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
