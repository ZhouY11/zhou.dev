import { getCollection } from 'astro:content';

export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => {
    return !data.draft;
  });

  return posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}
