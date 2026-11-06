<script lang="ts">
  import { formatNumber } from '../lib/format';
  import type { SortKey } from '../lib/shelves';
  import type { YearSummary } from '../lib/stats';
  import { ko } from '../lib/i18n/ko';
  import GoalProgress from './GoalProgress.svelte';
  import Icon from './Icon.svelte';

  let {
    dateLine,
    summary,
    query = $bindable(''),
    sort = $bindable<SortKey>('manual'),
    highlight = $bindable(''),
    categories = [],
    canFold = false,
    allFolded = false,
    onfoldpast,
    year,
    goal = null,
    onsavegoal,
  }: {
    dateLine: string;
    summary: YearSummary;
    year: number;
    /** 올해 목표 권수 (결정 0016) */
    goal?: number | null;
    onsavegoal?: (goal: number | null) => Promise<boolean>;
    query?: string;
    sort?: SortKey;
    /** 강조 보기 값: '' | 'rating' | 'cat:분야' */
    highlight?: string;
    categories?: string[];
    /** 지난해 책장이 있어 접을 수 있는지, 모두 접혀 있는지 */
    canFold?: boolean;
    allFolded?: boolean;
    onfoldpast?: () => void;
  } = $props();

  const sorts: { value: SortKey; label: string }[] = [
    { value: 'manual', label: ko.top.sortManual },
    { value: 'date', label: ko.top.sortDate },
    { value: 'color', label: ko.top.sortColor },
    { value: 'category', label: ko.top.sortCategory },
    { value: 'rating', label: ko.top.sortRating },
    { value: 'pages', label: ko.top.sortPages },
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
    <div class="goal-wrap">
      <GoalProgress {year} books={summary.books} {goal} onsave={onsavegoal} />
    </div>
  </div>
  <!-- 윗줄: 검색(+ 지난해 접기), 아랫줄: 정렬 칩 + 강조 보기. 두 줄의 좌우 끝을 맞춤 -->
  <div class="tools">
    <div class="line">
      <label class="search">
        <Icon name="search" />
        <span class="sr">{ko.top.searchLabel}</span>
        <input type="search" placeholder={ko.top.searchPlaceholder} bind:value={query} />
      </label>
      {#if canFold}
        <button type="button" class="chip" aria-pressed={allFolded} onclick={onfoldpast}>
          {allFolded ? ko.top.unfoldAll : ko.top.foldPast}
        </button>
      {/if}
    </div>
    <div class="line controls">
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
      <label class="hl">
        <span class="sr">{ko.top.highlight}</span>
        <select bind:value={highlight} aria-label={ko.top.highlight}>
          <option value="">{ko.top.highlightNone}</option>
          <option value="rating">{ko.top.highlightRating}</option>
          {#each categories as c (c)}
            <option value="cat:{c}">{ko.top.highlightCategory(c)}</option>
          {/each}
        </select>
      </label>
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
    font-weight: var(--display-weight);
    font-size: 18px;
    margin-right: 2px;
  }
  .goal-wrap {
    margin-top: 8px;
  }
  .summary .up {
    color: var(--accent);
    font-weight: 700;
  }
  .tools {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 1 680px;
    min-width: 0;
  }
  .line {
    display: flex;
    gap: 6px;
  }
  .search {
    flex: 1 1 auto;
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
  /* 정렬 칩은 남는 폭을 나눠 가져 아랫줄이 검색창과 같은 폭이 됨 */
  .sort {
    flex: 1 1 auto;
    display: flex;
    gap: 4px;
  }
  .sort .chip {
    flex: 1 1 auto;
    padding: 0 10px;
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
  .hl {
    flex: none;
    display: flex;
  }
  .hl select {
    height: 46px;
    padding: 0 10px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    font-size: 13px;
    max-width: 220px;
  }
  @media (max-width: 899px) {
    h1 {
      font-size: 24px;
    }
    .tools {
      flex-basis: 100%;
    }
    /* 정렬 칩 6개는 3칸씩 두 줄, 강조 보기는 그 아래 한 줄 가득 */
    .controls {
      flex-wrap: wrap;
    }
    .sort {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .sort .chip,
    .hl select {
      height: 40px;
    }
    .hl,
    .hl select {
      flex: 1 1 100%;
      max-width: none;
    }
  }
</style>
