export interface BlogSearchResult {
  title: string;
  description: string;
  excerpt: string;
  url: string;
}

export interface BlogSearchResponse {
  total: number;
  items: BlogSearchResult[];
}

interface PagefindResultData {
  url: string;
  excerpt: string;

  meta: {
    title?: string;
    description?: string;
  };
}

interface PagefindResult {
  data(): Promise<PagefindResultData>;
}

interface PagefindSearchResponse {
  results: PagefindResult[];
}

interface PagefindOptions {
  excerptLength?: number;

  ranking?: {
    metaWeights?: Record<string, number>;
  };
}

interface PagefindApi {
  options(options: PagefindOptions): Promise<void>;

  init(): Promise<void>;

  debouncedSearch(
    term: string,
    options?: Record<string, unknown>,
    debounceTimeout?: number,
  ): Promise<PagefindSearchResponse | null>;
}

const PAGEFIND_PATH = '/pagefind/pagefind.js';

const SEARCH_DEBOUNCE = 180;

let pagefindPromise: Promise<PagefindApi> | undefined;

async function loadPagefind() {
  if (!pagefindPromise) {
    pagefindPromise = (async () => {
      const pagefind = (await import(
        /* @vite-ignore */
        PAGEFIND_PATH
      )) as PagefindApi;

      await pagefind.options({
        excerptLength: 30,

        ranking: {
          metaWeights: {
            title: 5,
            tags: 3,
            description: 2,
          },
        },
      });

      await pagefind.init();

      return pagefind;
    })();
  }

  return pagefindPromise;
}

export async function prepareBlogSearch() {
  await loadPagefind();
}

export async function searchBlog(query: string, limit = 8): Promise<BlogSearchResponse | null> {
  const value = query.trim();

  if (!value) {
    return {
      total: 0,
      items: [],
    };
  }

  const pagefind = await loadPagefind();

  const search = await pagefind.debouncedSearch(value, {}, SEARCH_DEBOUNCE);

  if (!search) {
    return null;
  }

  const items = await Promise.all(
    search.results.slice(0, limit).map(async (result) => {
      const data = await result.data();

      return {
        title: data.meta.title ?? '未命名文章',

        description: data.meta.description ?? '',

        excerpt: data.excerpt,

        url: data.url,
      };
    }),
  );

  return {
    total: search.results.length,
    items,
  };
}
