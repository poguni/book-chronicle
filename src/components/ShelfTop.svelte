<script lang="ts">
  import { formatNumber } from '../lib/format';
  import type { SortKey } from '../lib/shelves';
  import type { YearSummary } from '../lib/stats';
  import { ko } from '../lib/i18n/ko';
  import Icon from './Icon.svelte';

  let {
    dateLine,
    summary,
    query = $bindable(''),
    sort = $bindable<SortKey>('date'),
  }: {
    dateLine: string;
    summary: YearSummary;
    query?: string;
    sort?: SortKey;
  } = $props();

  const sorts: { value: SortKey; label: string }[] = [
    { value: 'date', label: ko.top.sortDate },
    { value: 'color', label: ko.top.sortColor },
    { value: 'category', label: ko.top.sortCategory },
  ];
</script>

<div class="top">
  <div>
    <div class="sub">{dateLine}</div>
    <h1 class="display">{ko.top.title}</h1>
    <div class="summary">
      <span><b>{formatNumber(summary.books)}</b>{ko.top.books}</span>
      <span><b>{formatNumber(summary.pages)}</b>{ko.top.pages}</span>
      {#if summary.averageRating !== null}
        <span>{ko.top.average} <b>{summary.averageRating.toFixed(1)}</b>{ko.top.point}</span>
      {/if}
      {#if summary.diffFromLastYear !== null && summary.diffFromLastYear > 0}
        <span class="up">{ko.top.moreThanLastYear(summary.diffFromLastYear)}</span>
      {:else if summary.diffFromLastYear !== null && summary.diffFromLastYear < 0}
        <span>{ko.top.fewerThanLastYear(-summary.diffFromLastYear)}</span>
      {/if}
    </div>
  </div>
  <div class="tools">
    <label class="search">
      <Icon name="search" />
      <span class="sr">{ko.top.searchLabel}</span>
      <input type="search" placeholder={ko.top.searchPlaceholder} bind:value={query} />
    </label>
    <div class="sort" role="group" aria-label={ko.top.sortLabel}>
      {#each sorts as s (s.value)}
        <button
          type="button"
          class="chip"
          aria-pressed={sort === s.value}
          onclick={() => (sort = s.value)}>{s.label}</button
        >
      {/each}
    </div>
  </div>
</div>

<style>
  /* 시안 '상단' 절을 옮김 */
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px 24px;
  }
  h1 {
    margin: 0;
    font-size: clamp(26px, 2.3vw, 34px);
    line-height: 1.25;
  }
  .sub {
    font-size: 13px;
    color: var(--muted);
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin-top: 6px;
    font-size: 14px;
    color: var(--muted);
  }
  .summary b {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 18px;
    margin-right: 2px;
  }
  .summary .up {
    color: var(--accent);
    font-weight: 700;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 0 1 560px;
    justify-content: flex-end;
  }
  .search {
    flex: 1 1 260px;
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
  .sort {
    display: flex;
    gap: 4px;
  }
  .chip {
    height: 46px;
    padding: 0 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .chip[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--text);
    font-weight: 700;
  }
  @media (max-width: 899px) {
    h1 {
      font-size: 24px;
    }
    .tools {
      flex-basis: 100%;
    }
    .sort {
      width: 100%;
    }
    .sort .chip {
      flex: 1;
      height: 40px;
    }
  }
</style>
