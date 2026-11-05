<script lang="ts">
  import { BookApiError, lookupBook, searchBooks, warmUp, type BookInfo } from '../lib/bookApi';
  import { cleanAuthor, cleanTitle } from '../lib/bookMap';
  import { ko } from '../lib/i18n/ko';
  import { toIsbn13 } from '../lib/isbn';
  import BarcodeScanner from './BarcodeScanner.svelte';
  import Icon from './Icon.svelte';

  // 도서 검색 (PRD F2, 카카오·국립중앙도서관 — 결정 0008): 제목·저자 검색 또는 ISBN 조회, 입력 후 300ms 기다렸다가 찾기, 최근 검색어 5개
  let { onpick, autofocus = false }: { onpick: (book: BookInfo) => void; autofocus?: boolean } =
    $props();

  const RECENT_KEY = 'bookchronicle-recent-searches';
  const DEBOUNCE_MS = 300;

  function readRecent(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
      return Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string').slice(0, 5)
        : [];
    } catch {
      return [];
    }
  }

  let query = $state('');
  let results = $state<BookInfo[]>([]);
  let phase = $state<'idle' | 'loading' | 'done' | 'error' | 'denied'>('idle');
  let recent = $state(readRecent());
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function remember(q: string) {
    recent = [q, ...recent.filter((r) => r !== q)].slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      // 기억하지 못해도 검색은 됩니다.
    }
  }

  async function run(q: string) {
    const mine = ++seq;
    phase = 'loading';
    try {
      const isbn = toIsbn13(q);
      const found = isbn
        ? [await lookupBook(isbn)].filter((b) => b !== null)
        : await searchBooks(q);
      if (mine !== seq) return; // 그사이 새로 입력함
      results = found;
      phase = 'done';
    } catch (e) {
      if (mine !== seq) return;
      results = [];
      phase = e instanceof BookApiError && e.kind === 'denied' ? 'denied' : 'error';
    }
  }

  function oninput() {
    warmUp();
    clearTimeout(timer);
    const q = query.trim();
    if (q.length < 2 && !toIsbn13(q)) {
      seq++;
      results = [];
      phase = 'idle';
      return;
    }
    timer = setTimeout(() => run(q), DEBOUNCE_MS);
  }

  function choose(book: BookInfo) {
    remember(query.trim());
    results = [];
    phase = 'idle';
    query = '';
    onpick(book);
  }

  function useRecent(q: string) {
    query = q;
    clearTimeout(timer);
    void run(q);
  }

  // 바코드 스캔 (P1): 카메라를 쓸 수 있는 기기에서만 버튼을 보여 줍니다.
  const canScan =
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
  let scanning = $state(false);
  function scanned(isbn: string) {
    scanning = false;
    query = isbn;
    clearTimeout(timer);
    void run(isbn);
  }

  // Enter는 대화 상자 저장이 아니라 바로 찾기
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timer);
      if (query.trim()) void run(query.trim());
    }
  }
</script>

<section class="search-box" aria-labelledby="book-search-label">
  <label class="search" for="book-search">
    <Icon name="search" />
    <span class="sr" id="book-search-label">{ko.search.label}</span>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id="book-search"
      type="search"
      bind:value={query}
      {oninput}
      {onkeydown}
      placeholder={ko.search.placeholder}
      autocomplete="off"
      {autofocus}
    />
    {#if canScan}
      <button
        type="button"
        class="scan"
        aria-label={ko.search.barcode}
        aria-pressed={scanning}
        onclick={() => (scanning = !scanning)}
      >
        <Icon name="barcode" strokeWidth={1.8} />
      </button>
    {/if}
  </label>

  {#if scanning}
    <BarcodeScanner onisbn={scanned} onclose={() => (scanning = false)} />
  {/if}

  {#if query.trim() === '' && recent.length > 0}
    <div class="recent" role="group" aria-label={ko.search.recent}>
      <span class="label">{ko.search.recent}</span>
      {#each recent as r (r)}
        <button type="button" class="chip" onclick={() => useRecent(r)}>{r}</button>
      {/each}
    </div>
  {/if}

  <div class="status" role="status">
    {#if phase === 'loading'}
      {ko.search.loading}
    {:else if phase === 'error'}
      <Icon name="warning" size={16} strokeWidth={2} />{ko.search.error}
    {:else if phase === 'denied'}
      <Icon name="warning" size={16} strokeWidth={2} />{ko.search.denied}
    {:else if phase === 'done' && results.length === 0}
      {ko.search.empty}
    {:else if phase === 'done'}
      {ko.search.count(results.length)}
    {/if}
  </div>

  {#if results.length > 0}
    <ul class="results">
      {#each results as book, i (book.isbn13 ?? `${book.title}-${i}`)}
        <li>
          <button type="button" class="result" onclick={() => choose(book)}>
            {#if book.cover}
              <img src={book.cover} alt="" loading="lazy" referrerpolicy="no-referrer" />
            {:else}
              <span class="no-cover" aria-hidden="true"></span>
            {/if}
            <span class="info">
              <b>{cleanTitle(book.title)}</b>
              <span>{cleanAuthor(book.author) ?? ''}</span>
              <small>
                {[book.publisher, book.pubDate?.slice(0, 4)].filter(Boolean).join(' · ')}
              </small>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="credit">{ko.search.credit}</p>
</section>

<style>
  .scan {
    flex: none;
    width: 40px;
    height: 40px;
    margin-right: -8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 10px;
    background: none;
    color: var(--muted);
    cursor: pointer;
  }
  .scan[aria-pressed='true'] {
    color: var(--accent);
  }
  .search-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: var(--radius-l);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 14px;
    border-radius: var(--radius-m);
    background: var(--panel);
    border: 1px solid var(--line);
  }
  .search:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .search :global(svg) {
    color: var(--muted);
    flex: none;
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 15px;
  }
  .search input::placeholder {
    color: var(--muted);
  }
  .recent {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .chip {
    height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    min-height: 1em;
  }
  .status:empty {
    display: none;
  }
  .status :global(svg) {
    color: var(--accent);
    flex: none;
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .result {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .result:hover,
  .result:focus-visible {
    background: var(--accent-soft);
  }
  .result img,
  .no-cover {
    width: 40px;
    height: 58px;
    object-fit: cover;
    border-radius: 2px 4px 4px 2px;
    background: var(--line);
    flex: none;
  }
  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.4;
  }
  .info b,
  .info span,
  .info small {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .info span,
  .info small {
    font-size: 13px;
    color: var(--muted);
  }
  .credit {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
</style>
