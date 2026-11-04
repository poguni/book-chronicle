<script lang="ts">
  import EmptyState from '../components/EmptyState.svelte';
  import Icon from '../components/Icon.svelte';
  import LoadingSpines from '../components/LoadingSpines.svelte';
  import Shelf from '../components/Shelf.svelte';
  import ShelfTop from '../components/ShelfTop.svelte';
  import { formatToday, ordinalKo } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { LoadState } from '../lib/library.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import {
    matchesHighlight,
    parseHighlight,
    sortSpines,
    type ShelfSpine,
    type ShelfYear,
    type SortKey,
  } from '../lib/shelves';
  import { categoryCounts } from '../lib/stats';
  import { ringCount, yearSummary } from '../lib/stats';

  // 책장 홈 (PRD F4): 최신 연도가 위, 올해는 비어 있어도 늘 보임
  let {
    today,
    shelves,
    loadState,
    onaddbook,
    onpick,
    onreorder,
    onretry,
    selectedId,
  }: {
    today: Date;
    shelves: ShelfYear[];
    loadState: LoadState;
    onaddbook: () => void;
    onpick: (spine: ShelfSpine) => void;
    onreorder: (readingIds: string[]) => void;
    selectedId: string | null;
    onretry: () => void;
  } = $props();

  const year = $derived(today.getFullYear());
  const dateLine = $derived(
    `${formatToday(today)} · ${ko.top.ring(ordinalKo(ringCount(shelves, year)))}`,
  );
  const summary = $derived(yearSummary(shelves, year));

  // 검색은 F8(P1)에서 붙입니다.
  let query = $state('');
  let sort = $state<SortKey>('manual');

  // 강조 보기 (P1): 별점 4.5 이상 또는 한 분야만 진하게
  let highlight = $state('');
  const hl = $derived(parseHighlight(highlight));
  const highlightFn = $derived(
    hl.kind === 'none' ? null : (s: ShelfSpine) => matchesHighlight(s, hl),
  );
  const categories = $derived(
    [...categoryCounts(shelves.flatMap((s) => s.spines))]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .map(([c]) => c),
  );

  // 지난해 접기 (P1): 올해보다 이전 연도 책장을 책등 색 띠로 접음. 이 기기에 기억
  const pastYears = $derived(
    shelves.flatMap((s) => (s.kind === 'year' && s.year !== null && s.year < year ? [s.year] : [])),
  );
  const allFolded = $derived(
    pastYears.length > 0 && pastYears.every((y) => prefs.folded.includes(y)),
  );
  function foldPast() {
    prefs.setFolded(
      allFolded
        ? prefs.folded.filter((y) => !pastYears.includes(y))
        : [...prefs.folded, ...pastYears],
    );
  }

  /** 끌어 옮기면 그 결과가 '내 순서'가 됩니다(결정 0009). */
  function reorder(readingIds: string[]) {
    sort = 'manual';
    onreorder(readingIds);
  }
</script>

<ShelfTop
  {dateLine}
  {summary}
  bind:query
  bind:sort
  bind:highlight
  {categories}
  canFold={pastYears.length > 0}
  {allFolded}
  onfoldpast={foldPast}
/>

<div class="shelves">
  {#if loadState === 'loading' || loadState === 'idle'}
    <Shelf {year} count={0} pages={0}>
      {#snippet empty()}<LoadingSpines />{/snippet}
    </Shelf>
  {:else if loadState === 'error'}
    <EmptyState message={ko.shelf.loadError}>
      <button type="button" class="btn-primary" onclick={onretry}>{ko.shelf.retry}</button>
    </EmptyState>
  {:else}
    {#each shelves as shelf (`${shelf.kind}-${shelf.year}`)}
      <Shelf
        kind={shelf.kind}
        year={shelf.year}
        count={shelf.count}
        pages={shelf.pages}
        bookOfYearTitle={shelf.bookOfYearTitle}
        spines={sortSpines(shelf.spines, sort)}
        {onpick}
        onreorder={reorder}
        {selectedId}
        highlight={highlightFn}
        foldable={shelf.kind === 'year' && shelf.year !== null && shelf.year < year}
        folded={shelf.kind === 'year' && shelf.year !== null && prefs.folded.includes(shelf.year)}
        ontogglefold={() => shelf.year !== null && prefs.toggleFold(shelf.year)}
      >
        {#snippet empty()}
          <EmptyState message={ko.shelf.empty}>
            <button type="button" class="btn-primary" onclick={onaddbook}>
              <Icon name="plus" strokeWidth={2.2} />{ko.side.addBook}
            </button>
          </EmptyState>
        {/snippet}
      </Shelf>
    {/each}
  {/if}
</div>

<style>
  .shelves {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  /* 불러오는 중 막대는 책장 안을 채움 */
  .shelves :global(.shelf > .loading) {
    flex: 1;
  }
</style>
