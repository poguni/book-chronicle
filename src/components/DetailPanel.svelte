<script lang="ts">
  import { formatNumber, monthBars } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { ShelfSpine } from '../lib/shelves';
  import { averageRating, monthCounts, topCategory } from '../lib/stats';
  import EmptyState from './EmptyState.svelte';
  import Icon from './Icon.svelte';
  import MonthBars from './MonthBars.svelte';

  // 상세 패널 (DESIGN 7.3). 선택한 책과 올해의 나이테는 Phase 6에서 채웁니다.
  // "한눈에"는 올해 고정입니다(결정 0001-9). spines는 올해 책장의 책등입니다.
  let {
    today,
    spines,
    open,
    onclose,
  }: { today: Date; spines: ShelfSpine[]; open: boolean; onclose: () => void } = $props();

  const year = $derived(today.getFullYear());
  const bars = $derived(monthBars(monthCounts(spines), year, today));
  const pages = $derived(spines.reduce((sum, s) => sum + (s.knownPages ?? 0), 0));
  const rating = $derived(averageRating(spines));
  const top = $derived(topCategory(spines));
</script>

<aside class="detail" class:open aria-label={ko.detail.label}>
  <button type="button" class="detail-close" aria-label={ko.detail.close} onclick={onclose}>
    <Icon name="close" strokeWidth={2} />
  </button>

  <section class="selected">
    <span class="label">{ko.detail.selected}</span>
    <EmptyState message={ko.detail.noSelection} />
  </section>

  <section class="block">
    <div class="block-h">
      <h3 class="display">{ko.detail.glance(year)}</h3>
      <a href="#/compare">{ko.detail.toCompare}</a>
    </div>
    <div class="stats">
      <div class="stat">
        <span>{ko.detail.statBooks}</span><b>{formatNumber(spines.length)}{ko.top.books}</b>
      </div>
      <div class="stat"><span>{ko.detail.statPages}</span><b>{formatNumber(pages)}</b></div>
      <div class="stat">
        <span>{ko.detail.statRating}</span><b
          >{rating === null ? ko.detail.none : rating.toFixed(1)}</b
        >
      </div>
      <div class="stat">
        <span>{ko.detail.statTop}</span><b class="top">{top ?? ko.detail.none}</b>
      </div>
    </div>
    <MonthBars {bars} label={ko.detail.monthsLabel(year)} />
  </section>
</aside>

<style>
  /* 시안 '상세 패널' 절을 옮김 */
  .detail {
    background: var(--panel);
    border-left: 1px solid var(--line);
    padding: 28px clamp(20px, 2vw, 32px) 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
  }
  .detail-close {
    display: none;
  }
  .selected {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .selected :global(.empty) {
    min-height: 174px;
    border: 1px dashed var(--line);
    border-radius: var(--radius-l);
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 22px;
    border-top: 1px solid var(--line);
  }
  .block-h {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .block-h h3 {
    margin: 0;
    font-size: 18px;
  }
  .block-h a {
    font-size: 12px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .stat {
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--card);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
  }
  .stat span {
    font-size: 12px;
    color: var(--muted);
  }
  .stat b {
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1.3;
  }
  .stat b.top {
    font-size: 18px;
    line-height: 1.75;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 900~1199px: 오른쪽에서 밀려 나오는 서랍 (DESIGN 5.2) */
  @media (max-width: 1199px) {
    .detail {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      height: auto;
      width: min(400px, 92vw);
      z-index: 30;
      transform: translateX(100%);
      visibility: hidden;
      transition:
        transform 0.3s,
        visibility 0.3s;
      box-shadow: -20px 0 40px rgba(0, 0, 0, 0.3);
    }
    .detail.open {
      transform: none;
      visibility: visible;
    }
    .detail-close {
      display: flex;
      align-self: flex-end;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: var(--card);
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex: none;
    }
  }
  /* 900px 미만: 책장 아래로 내려옴 */
  @media (max-width: 899px) {
    .detail {
      position: static;
      width: auto;
      height: auto;
      transform: none;
      visibility: visible;
      transition: none;
      box-shadow: none;
      border-left: 0;
      border-top: 1px solid var(--line);
      padding: 24px 16px 40px;
      overflow: visible;
    }
    .detail-close {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .detail {
      transition: none;
    }
  }
</style>
