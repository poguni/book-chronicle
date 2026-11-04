<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatNumber } from '../lib/format';
  import { ko } from '../lib/i18n/ko';

  // 한 연도 = 머리글 + 책장 + 선반 판 (DESIGN 6.1). 책등은 Phase 4에서 children으로 넣습니다.
  let {
    year,
    count,
    pages,
    children,
  }: { year: number; count: number; pages: number; children: Snippet } = $props();
</script>

<section class="shelf-wrap" id="y{year}" aria-labelledby="y{year}-title">
  <div class="shelf-head">
    <h2 class="display" id="y{year}-title">{year}</h2>
    <span class="meta">{ko.shelf.meta(count, formatNumber(pages))}</span>
  </div>
  <div class="shelf">
    {@render children()}
  </div>
  <div class="plank" aria-hidden="true"></div>
</section>

<style>
  /* 시안 '책장' 절을 옮김 */
  .shelf-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    scroll-margin-top: 16px;
  }
  .shelf-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 16px;
  }
  .shelf-head h2 {
    margin: 0;
    font-size: 24px;
  }
  .shelf-head .meta {
    font-size: 13px;
    color: var(--muted);
  }
  .shelf {
    container-type: inline-size;
    background: var(--shelf-back);
    box-shadow: var(--shelf-shadow);
    border-radius: 8px 8px 0 0;
    padding: 16px 16px 0;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: calc(176 * var(--spine-hk) + 22px);
    perspective: 1400px;
    perspective-origin: 50% 20%;
  }
  /* 빈 책장 안내는 가운데에 */
  .shelf > :global(.empty) {
    flex: 1;
    align-self: center;
    padding-bottom: 16px;
  }
  .plank {
    height: 14px;
    margin: -8px -6px 0;
    background: var(--plank);
    border-top: 3px solid var(--plank-edge);
    border-radius: 3px;
    box-shadow: var(--plank-shadow);
    position: relative;
    z-index: 1;
  }
  :global([data-theme='paper']) .plank {
    border-top: 0;
    border-bottom: 4px solid var(--plank-edge);
    margin-top: 0;
  }
  :global([data-theme='paper']) .shelf {
    padding-left: 8px;
    padding-right: 8px;
  }
  @media (max-width: 899px) {
    .shelf-wrap {
      scroll-margin-top: 84px;
    }
  }
</style>
