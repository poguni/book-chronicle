<script lang="ts" module>
  import { EMPTY_FILTER, type ListFilter } from '../lib/listView';

  // 다른 메뉴에 다녀와도 검색어·거르기를 그대로 둡니다(새로 고침하면 처음 상태, 결정 0020).
  const filter: ListFilter = $state({ ...EMPTY_FILTER });
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import Icon from '../components/Icon.svelte';
  import Stars from '../components/Stars.svelte';
  import { formatNumber } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { LoadState } from '../lib/library.svelte';
  import {
    filterRows,
    isFiltered,
    listRows,
    rowCategories,
    rowYears,
    summarizeRows,
    type ListRow,
    type ListSort,
    type RatingFilter,
  } from '../lib/listView';
  import type { ShelfSpine, ShelfYear } from '../lib/shelves';

  // 전체 목록 (PRD F8): 기록 하나가 한 줄. 줄을 누르면 상세 패널이 그 책으로 바뀝니다.
  let {
    shelves,
    loadState,
    selectedId = null,
    onpick,
    onaddbook,
    onretry,
  }: {
    shelves: ShelfYear[];
    loadState: LoadState;
    selectedId?: string | null;
    onpick: (spine: ShelfSpine) => void;
    onaddbook: () => void;
    onretry: () => void;
  } = $props();

  const PAGE = 100;

  const all = $derived(listRows(shelves));
  const years = $derived(rowYears(all));
  const categories = $derived(rowCategories(all));
  const rows = $derived(filterRows(all, filter));
  const summary = $derived(summarizeRows(rows));
  const hasKind = (kind: ListRow['shelf']) => all.some((r) => r.shelf === kind);

  // 처음에는 100줄만 그리고 "더 보기"로 100줄씩 (기록이 많아도 버벅이지 않게). 조건을 바꾸면 처음부터
  let limit = $state(PAGE);
  $effect(() => {
    void [filter.q, filter.year, filter.category, filter.rating, filter.reread, filter.sort];
    limit = PAGE;
  });
  const shown = $derived(rows.slice(0, limit));

  const sorts: { value: ListSort; label: string }[] = [
    { value: 'newest', label: ko.list.sortNewest },
    { value: 'oldest', label: ko.list.sortOldest },
    { value: 'title', label: ko.list.sortTitle },
    { value: 'rating', label: ko.list.sortRating },
    { value: 'pages', label: ko.list.sortPages },
  ];
  const ratings: { value: RatingFilter; label: string }[] = [
    { value: 'all', label: ko.list.ratingAll },
    { value: 'gte4.5', label: ko.list.ratingGte45 },
    { value: 'gte4', label: ko.list.ratingGte4 },
    { value: 'lte3', label: ko.list.ratingLte3 },
    { value: 'none', label: ko.list.ratingNone },
  ];

  function reset() {
    Object.assign(filter, { ...EMPTY_FILTER, sort: filter.sort });
  }

  function finishedText(s: ShelfSpine): string {
    if (s.status === 'reading') return ko.detail.reading;
    if (s.status === 'dropped') return ko.detail.dropped;
    return s.finishedAt ? ko.detail.finishedValue(s.finishedAt) : ko.detail.finishedUnknown;
  }

  function rowLabel(r: ListRow): string {
    const s = r.spine;
    const base = ko.book.label({
      title: s.title,
      author: s.author,
      pages: s.pages,
      estimated: s.estimated,
      status: s.status,
      finished: s.finishedAt ? ko.book.finishedMonth(s.finishedAt) : null,
      bookOfYear: s.isBookOfYear,
    });
    return [base, r.reads >= 2 && r.nth > 0 ? ko.list.nth(r.nth) : null, ko.detail.rating(s.rating)]
      .filter(Boolean)
      .join(', ');
  }

  // ↑↓로 줄을 옮겨 다님 (Enter·Space는 버튼이라 그대로 상세를 엶)
  let listEl: HTMLElement | undefined = $state();
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...(listEl?.querySelectorAll<HTMLButtonElement>('button.row') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[
      e.key === 'ArrowDown' ? Math.min(i + 1, buttons.length - 1) : Math.max(i - 1, 0)
    ]?.focus();
  }

  async function showMore() {
    const first = limit;
    limit += PAGE;
    await tick();
    listEl?.querySelectorAll<HTMLButtonElement>('button.row')[first]?.focus();
  }
</script>

<div class="top">
  <h1 class="display page-title">{ko.pages.list}</h1>
  <label class="search">
    <Icon name="search" />
    <span class="sr">{ko.list.searchLabel}</span>
    <input type="search" placeholder={ko.list.searchPlaceholder} bind:value={filter.q} />
  </label>
  <div class="filters" role="group" aria-label={ko.list.filters}>
    <select bind:value={filter.year} aria-label={ko.list.year}>
      <option value="all">{ko.list.yearAll}</option>
      {#each years as y (y)}
        <option value={String(y)}>{ko.list.yearOption(y)}</option>
      {/each}
      {#if hasKind('unknown')}<option value="unknown">{ko.list.unknownYear}</option>{/if}
      {#if hasKind('reading')}<option value="reading">{ko.list.reading}</option>{/if}
      {#if hasKind('dropped')}<option value="dropped">{ko.list.dropped}</option>{/if}
    </select>
    <select bind:value={filter.category} aria-label={ko.list.category}>
      <option value="">{ko.list.categoryAll}</option>
      {#each categories as c (c)}
        <option value={c}>{c}</option>
      {/each}
    </select>
    <select bind:value={filter.rating} aria-label={ko.list.rating}>
      {#each ratings as r (r.value)}
        <option value={r.value}>{r.label}</option>
      {/each}
    </select>
    <select bind:value={filter.sort} aria-label={ko.list.sort}>
      {#each sorts as s (s.value)}
        <option value={s.value}>{s.label}</option>
      {/each}
    </select>
    <button
      type="button"
      class="chip"
      aria-pressed={filter.reread}
      onclick={() => (filter.reread = !filter.reread)}>{ko.list.reread}</button
    >
    {#if isFiltered(filter)}
      <button type="button" class="chip" onclick={reset}>{ko.list.reset}</button>
    {/if}
  </div>
  {#if loadState === 'ready' && all.length > 0}
    <p class="summary" aria-live="polite">
      {ko.list.summary({
        count: formatNumber(summary.count),
        pages: formatNumber(summary.pages),
        rating: summary.rating === null ? null : summary.rating.toFixed(1),
      })}
    </p>
  {/if}
</div>

{#if loadState === 'loading' || loadState === 'idle'}
  <EmptyState message={ko.loading} />
{:else if loadState === 'error'}
  <EmptyState message={ko.shelf.loadError}>
    <button type="button" class="btn-primary" onclick={onretry}>{ko.shelf.retry}</button>
  </EmptyState>
{:else if all.length === 0}
  <EmptyState message={ko.list.empty}>
    <button type="button" class="btn-primary" onclick={onaddbook}>
      <Icon name="plus" />{ko.list.addBook}
    </button>
  </EmptyState>
{:else if rows.length === 0}
  <EmptyState message={ko.list.noMatch}>
    <button type="button" class="chip" onclick={reset}>{ko.list.reset}</button>
  </EmptyState>
{:else}
  <div class="table">
    <div class="row head" aria-hidden="true">
      <span></span>
      <span>{ko.list.colTitle}</span>
      <span class="c-author">{ko.list.colAuthor}</span>
      <span class="c-cat">{ko.list.colCategory}</span>
      <span class="c-date">{ko.list.colFinished}</span>
      <span class="c-rating">{ko.list.colRating}</span>
      <span class="c-pages">{ko.list.colPages}</span>
    </div>
    <ul bind:this={listEl} aria-label={ko.list.rows}>
      {#each shown as r (r.spine.readingId)}
        {@const s = r.spine}
        <li>
          <button
            type="button"
            class="row"
            aria-pressed={selectedId === s.readingId}
            aria-label={rowLabel(r)}
            onclick={() => onpick(s)}
            {onkeydown}
          >
            <span class="swatch" style:background={s.palette.base} aria-hidden="true"></span>
            <span class="c-title">
              <b>{s.title}</b>
              {#if r.reads >= 2 && r.nth > 0}<span class="badge">{ko.list.nth(r.nth)}</span>{/if}
            </span>
            <span class="c-author">{s.author ?? ''}</span>
            <span class="c-meta">{[s.author, finishedText(s)].filter(Boolean).join(' · ')}</span>
            <span class="c-cat">{s.category ?? ''}</span>
            <span class="c-date">{finishedText(s)}</span>
            <span class="c-rating">
              {#if s.rating !== null}<Stars value={s.rating} size={13} />{/if}
            </span>
            <span class="c-pages">
              {s.knownPages === null ? ko.detail.pagesUnknown : formatNumber(s.knownPages)}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    {#if rows.length > limit}
      <button type="button" class="chip more" onclick={showMore}>
        {ko.list.more(Math.min(PAGE, rows.length - limit))}
      </button>
    {/if}
  </div>
{/if}

<style>
  .top {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  /* 900px 이상: 목록을 내려도 검색·거르기가 늘 위에 (PRD F8). 스마트폰은 화면을 너무 가려 고정하지 않음 */
  @media (min-width: 900px) {
    .top {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bg);
      padding-block: 12px 8px;
      margin-top: -12px;
    }
  }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 14px;
    border-radius: var(--radius-m);
    background: var(--card);
    border: 1px solid var(--line);
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
  .search:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .search input::placeholder {
    color: var(--muted);
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  select,
  .chip {
    height: 40px;
    padding: 0 12px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    font-size: 13px;
    max-width: 100%;
  }
  .chip {
    color: var(--muted);
    cursor: pointer;
    white-space: nowrap;
  }
  .chip[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--text);
    font-weight: 700;
  }
  .summary {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
  }

  /* 목록: 넓으면 표처럼 칸을 나누고, 좁으면 두 줄 카드 */
  .table {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .row {
    width: 100%;
    display: grid;
    grid-template-columns: 6px minmax(0, 2.4fr) minmax(0, 1.4fr) minmax(0, 1.2fr) 64px 84px 56px;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: var(--radius-s);
    background: transparent;
    color: var(--text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  button.row:hover {
    background: var(--card);
  }
  button.row[aria-pressed='true'] {
    background: var(--card);
    border-color: var(--accent);
  }
  .head {
    cursor: default;
    font-size: 12px;
    color: var(--muted);
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    padding-block: 6px;
  }
  .swatch {
    align-self: stretch;
    min-height: 22px;
    border-radius: 2px;
  }
  .c-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .c-title b {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .badge {
    flex: none;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--muted);
  }
  .c-meta {
    display: none;
    font-size: 13px;
  }
  .c-author,
  .c-cat,
  .c-meta {
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .c-date,
  .c-pages {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .c-pages {
    text-align: right;
  }
  .more {
    align-self: center;
    margin-top: 12px;
  }

  @container (max-width: 639px) {
    .head {
      display: none;
    }
    /* 첫 줄 제목, 둘째 줄 저자 · 완독 · 별점 */
    .row {
      grid-template-columns: 6px minmax(0, 1fr) auto;
      grid-template-areas:
        'sw title title'
        'sw meta rating';
      row-gap: 2px;
      column-gap: 10px;
    }
    .swatch {
      grid-area: sw;
    }
    .c-title {
      grid-area: title;
    }
    .c-meta {
      display: block;
      grid-area: meta;
    }
    .c-rating {
      grid-area: rating;
    }
    .c-author,
    .c-cat,
    .c-date,
    .c-pages {
      display: none;
    }
  }
</style>
