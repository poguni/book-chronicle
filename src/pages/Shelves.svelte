<script lang="ts">
  import EmptyState from '../components/EmptyState.svelte';
  import Icon from '../components/Icon.svelte';
  import LoadingSpines from '../components/LoadingSpines.svelte';
  import Shelf from '../components/Shelf.svelte';
  import ShelfTop from '../components/ShelfTop.svelte';
  import { formatToday, ordinalKo } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { LoadState } from '../lib/library.svelte';
  import { sortSpines, type ShelfSpine, type ShelfYear, type SortKey } from '../lib/shelves';
  import { ringCount, yearSummary } from '../lib/stats';

  // 책장 홈 (PRD F4): 최신 연도가 위, 올해는 비어 있어도 늘 보임
  let {
    today,
    shelves,
    loadState,
    onaddbook,
    onpick,
    onretry,
  }: {
    today: Date;
    shelves: ShelfYear[];
    loadState: LoadState;
    onaddbook: () => void;
    onpick: (spine: ShelfSpine) => void;
    onretry: () => void;
  } = $props();

  const year = $derived(today.getFullYear());
  const dateLine = $derived(
    `${formatToday(today)} · ${ko.top.ring(ordinalKo(ringCount(shelves, year)))}`,
  );
  const summary = $derived(yearSummary(shelves, year));

  // 검색은 F8(P1)에서 붙입니다.
  let query = $state('');
  let sort = $state<SortKey>('date');
</script>

<ShelfTop {dateLine} {summary} bind:query bind:sort />

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
