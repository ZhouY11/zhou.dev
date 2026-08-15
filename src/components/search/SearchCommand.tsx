import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { type BlogSearchResult, prepareBlogSearch, searchBlog } from '@/lib/search/pagefind';

interface SearchSnapshot {
  query: string;
  total: number;
  results: BlogSearchResult[];
  error: boolean;
}

const SEARCH_LIMIT = 8;

const EMPTY_SEARCH_SNAPSHOT: SearchSnapshot = {
  query: '',
  total: 0,
  results: [],
  error: false,
};

const ERROR_MESSAGE = import.meta.env.DEV
  ? '开发模式不会生成全文搜索索引，请运行 pnpm build && pnpm preview 验证搜索。'
  : '搜索暂时不可用，请稍后重试。';

function showSearchDialog(dialog: HTMLDialogElement | null, input: HTMLInputElement | null) {
  if (!dialog || dialog.open) {
    return;
  }

  dialog.showModal();
  input?.focus();
}

function hideSearchDialog(dialog: HTMLDialogElement | null) {
  dialog?.close();
}

export default function SearchCommand() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');

  const [searchSnapshot, setSearchSnapshot] = useState<SearchSnapshot>(EMPTY_SEARCH_SNAPSHOT);

  const normalizedQuery = query.trim();

  const hasQuery = normalizedQuery.length > 0;

  /**
   * 不需要单独维护 loading state。
   *
   * 当前输入的 query 与上一次已经完成搜索的 query 不一致，
   * 就说明当前搜索仍然处于 pending 状态。
   */
  const isSearching = hasQuery && searchSnapshot.query !== normalizedQuery;

  const hasError =
    hasQuery && !isSearching && searchSnapshot.query === normalizedQuery && searchSnapshot.error;

  /**
   * 当用户继续输入时，保留上一轮结果，
   * 等新结果返回后再整体替换。
   *
   * 这样结果区域不会：
   *
   * Results → Loading → Results
   *
   * 反复卸载和重新挂载。
   */
  const visibleResults = hasQuery ? searchSnapshot.results : [];

  const showInitialLoading = hasQuery && isSearching && visibleResults.length === 0;

  const showEmpty = hasQuery && !isSearching && !hasError && visibleResults.length === 0;

  const statusMessage = !hasQuery
    ? ''
    : isSearching
      ? '正在搜索'
      : hasError
        ? ERROR_MESSAGE
        : `找到 ${searchSnapshot.total} 篇相关文章`;

  function openDialog() {
    showSearchDialog(dialogRef.current, inputRef.current);

    /**
     * 用户打开搜索框时只预加载 Pagefind runtime。
     * 搜索索引仍然会根据真正输入的关键词按需加载。
     */
    void prepareBlogSearch().catch(() => {
      /**
       * 这里不显示错误。
       *
       * 如果用户真正输入关键词，
       * searchBlog() 会再次尝试并进入正常错误状态。
       */
    });
  }

  function closeDialog() {
    hideSearchDialog(dialogRef.current);
  }

  function handleDialogClose() {
    /**
     * 这是 dialog close event handler，
     * 不是 Effect。
     *
     * 在这里重置 UI state 不会触发
     * set-state-in-effect 规则。
     */
    setQuery('');
    setSearchSnapshot(EMPTY_SEARCH_SNAPSHOT);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      if (dialog.open) {
        dialog.close();

        return;
      }

      showSearchDialog(dialog, inputRef.current);

      void prepareBlogSearch().catch(() => {
        /**
         * 真正搜索时再显示错误。
         */
      });
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    /**
     * 关键：
     *
     * Effect 内没有任何同步 setState。
     *
     * query 为空时什么都不做，
     * idle 状态直接通过 render 推导。
     */
    if (!normalizedQuery) {
      return;
    }

    let cancelled = false;

    void searchBlog(normalizedQuery, SEARCH_LIMIT)
      .then((response) => {
        /**
         * Pagefind debouncedSearch：
         *
         * 如果已经产生了更新的搜索，
         * 旧搜索会返回 null。
         */
        if (cancelled || response === null) {
          return;
        }

        /**
         * 这是异步搜索完成后的状态同步，
         * 不是 Effect 开头的同步 setState。
         */
        setSearchSnapshot({
          query: normalizedQuery,
          total: response.total,
          results: response.items,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSearchSnapshot({
          query: normalizedQuery,
          total: 0,
          results: [],
          error: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedQuery]);

  function handleResultClick() {
    closeDialog();
  }

  return (
    <>
      <button
        type="button"
        aria-label="搜索文章"
        aria-haspopup="dialog"
        aria-controls="search-command-dialog"
        onClick={openDialog}
        className="inline-flex size-10 min-w-fit items-center justify-center gap-2 rounded-lg border focus-ring border-border px-3 py-2 text-fg-muted transition-colors hover:text-fg"
      >
        <SearchIcon className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">搜索</span>
        <kbd className="hidden rounded border border-border bg-bg-muted px-1.5 py-0.5 text-[10px] text-fg-subtle lg:inline">
          ⌘ / Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        id="search-command-dialog"
        aria-labelledby="search-command-title"
        onClose={handleDialogClose}
        className="m-auto w-[min(42rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-border bg-bg-elevated p-0 text-fg shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <h2 id="search-command-title" className="sr-only">
          搜索文章
        </h2>

        <div className="flex items-center border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="搜索标题、标签或正文..."
            aria-label="搜索文章"
            aria-describedby="search-command-status"
            onChange={(event) => {
              setQuery(event.currentTarget.value);
            }}
            className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />

          <button
            type="button"
            aria-label="关闭搜索"
            onClick={closeDialog}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full focus-ring text-fg-muted transition-colors hover:text-fg"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div id="search-command-status" aria-live="polite" className="sr-only">
          {statusMessage}
        </div>

        <div aria-busy={isSearching} className="max-h-[min(32rem,70vh)] overflow-y-auto p-2">
          {!hasQuery && (
            <div className="px-4 py-10 text-center text-sm text-fg-muted">
              输入关键词搜索文章标题、标签和正文。
            </div>
          )}

          {showInitialLoading && (
            <div className="px-4 py-10 text-center text-sm text-fg-muted">正在搜索…</div>
          )}

          {hasError && (
            <div className="px-4 py-10 text-center text-sm text-fg-muted">{ERROR_MESSAGE}</div>
          )}

          {showEmpty && (
            <div className="px-4 py-10 text-center text-sm text-fg-muted">
              没有找到与「{normalizedQuery}」相关的文章。
            </div>
          )}

          {visibleResults.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-4 px-3 pt-1 pb-2 text-xs text-fg-subtle">
                <span>找到 {searchSnapshot.total} 篇相关文章</span>

                {isSearching && <span>正在更新…</span>}
              </div>

              <ul>
                {visibleResults.map((result) => (
                  <li key={result.url}>
                    <a
                      href={result.url}
                      onClick={handleResultClick}
                      className="block rounded-xl focus-ring px-3 py-3 transition-colors hover:bg-bg-muted"
                    >
                      <h3 className="text-sm font-medium text-fg">{result.title}</h3>

                      {result.excerpt ? (
                        <p
                          className="mt-1.5 line-clamp-2 text-xs leading-5 text-fg-muted [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-fg"
                          dangerouslySetInnerHTML={{
                            __html: result.excerpt,
                          }}
                        />
                      ) : (
                        result.description && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-fg-muted">
                            {result.description}
                          </p>
                        )
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
