<script lang="ts">
  import EmptyState from '../components/EmptyState.svelte';
  import Icon from '../components/Icon.svelte';
  import Shelf from '../components/Shelf.svelte';
  import ShelfTop, { type SortKey, type YearSummary } from '../components/ShelfTop.svelte';
  import { formatToday, ordinalKo } from '../lib/format';
  import { ko } from '../lib/i18n/ko';

  // 책장 홈. Phase 3에서는 데이터가 비어 있는 모습만 그립니다(책 불러오기는 Phase 4).
  let { today, onaddbook }: { today: Date; onaddbook: () => void } = $props();

  const year = $derived(today.getFullYear());
  // 올해 책장은 늘 보이므로 나이테는 적어도 한 겹(결정 0001-8)
  const ringCount = 1;
  const dateLine = $derived(`${formatToday(today)} · ${ko.top.ring(ordinalKo(ringCount))}`);
  const summary: YearSummary = { books: 0, pages: 0, averageRating: null, diffFromLastYear: null };

  let query = $state('');
  let sort = $state<SortKey>('date');
</script>

<ShelfTop {dateLine} {summary} bind:query bind:sort />

<div class="shelves">
  <Shelf {year} count={0} pages={0}>
    <EmptyState message={ko.shelf.empty}>
      <button type="button" class="btn-primary" onclick={onaddbook}>
        <Icon name="plus" strokeWidth={2.2} />{ko.side.addBook}
      </button>
    </EmptyState>
  </Shelf>
</div>

<style>
  .shelves {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
</style>
