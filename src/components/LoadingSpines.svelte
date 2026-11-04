<script lang="ts">
  import { ko } from '../lib/i18n/ko';

  // 불러오는 중 (DESIGN 12장): 책등 자리에 --card 색 막대가 옅게 깜빡입니다. 책장 안에 넣어 씁니다.
  const bars = [14, 22, 11, 18, 26, 13, 20, 16, 24, 12];
  const heights = [150, 168, 142, 160, 172, 146, 164, 154, 170, 144];
</script>

<div class="loading" role="status" aria-label={ko.loading}>
  {#each bars as w, i (i)}
    <span style:width="{w}px" style:height="calc({heights[i]} * var(--spine-hk))"></span>
  {/each}
</div>

<style>
  .loading {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 100%;
  }
  span {
    display: block;
    background: var(--card);
    border-radius: 2px 2px 0 0;
    animation: blink 1.4s ease-in-out infinite alternate;
  }
  @keyframes blink {
    from {
      opacity: 0.9;
    }
    to {
      opacity: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
      opacity: 0.7;
    }
  }
</style>
