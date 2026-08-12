import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site) : undefined;

  const content = ['User-agent: *', 'Allow: /', sitemap && `Sitemap: ${sitemap}`]
    .filter(Boolean)
    .join('\n');

  return new Response(`${content}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
