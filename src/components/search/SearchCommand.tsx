import type { BlogSearchItem } from '../../types/blog';

import { useEffect, useRef, useState } from 'react';

interface SearchCommandProps {
  posts: BlogSearchItem[];
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN');
}

export default function SearchCommand({ posts }: SearchCommandProps) {
  const [query, setQuery] = useState('');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();

    inputRef.current?.focus();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  const normalizedQuery = normalizeSearchText(query);

  const visiblePosts = normalizedQuery
    ? posts.filter((post) =>
        [post.title, post.description, ...post.tags].some((value) =>
          normalizeSearchText(value).includes(normalizedQuery),
        ),
      )
    : posts.slice(0, 6);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();

        openDialog();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-lg border focus-ring border-border px-3 py-2 text-sm text-fg-muted transition-colors hover:border-white/20 hover:text-fg"
        type="button"
        aria-haspopup="dialog"
        onClick={openDialog}
      >
        <span aria-hidden="true">⌕</span>
        <span className="hidden sm:inline">搜索</span>
        <kbd className="hidden rounded border border-border bg-bg-muted px-1.5 py-0.5 text-[10px] text-fg-subtle lg:inline">
          ⌘ / Ctrl K
        </kbd>
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(42rem,calc(100%-2rem))] rounded-2xl border border-border bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        aria-labelledby="search-command-title"
        onClose={() => {
          setQuery('');
        }}
      >
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="search-command-title" className="text-sm font-medium text-fg-muted">
              搜索文章
            </h2>
            <button
              className="rounded-md focus-ring px-2 py-1 text-sm text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg"
              type="button"
              aria-label="关闭搜索"
              onClick={closeDialog}
            >
              ESC
            </button>
          </div>
          <label htmlFor="site-search-input" className="sr-only">
            搜索文章
          </label>
          <input
            ref={inputRef}
            id="site-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、描述或标签..."
            autoComplete="off"
            className="mt-4 w-full border-0 bg-transparent text-lg text-fg outline-none placeholder:text-fg-subtle"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {visiblePosts.length > 0 ? (
            <ul>
              {visiblePosts.map((post) => (
                <li key={post.href}>
                  <a
                    className="block rounded-xl focus-ring px-4 py-3 transition-colors hover:bg-bg-muted"
                    href={post.href}
                    onClick={closeDialog}
                  >
                    <h3 className="font-medium text-fg">{post.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-fg-subtle">
                      {post.description}
                    </p>
                    {post.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs text-brand">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-12 text-center text-sm text-fg-subtle">没有找到相关文章。</p>
          )}
        </div>
      </dialog>
    </>
  );
}
