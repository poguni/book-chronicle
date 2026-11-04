<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { starFill } from '../lib/rating';

  // 읽기 전용 별점 (반 별 지원). 입력은 StarRating.svelte
  let { value, size = 18 }: { value: number | null; size?: number } = $props();
  const STAR = 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z';
</script>

<span class="stars" role="img" aria-label={ko.detail.rating(value)} style:--s="{size}px">
  {#each [1, 2, 3, 4, 5] as n (n)}
    {@const fill = starFill(value, n)}
    <span class="star">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="outline"><path d={STAR} /></svg>
      <span class="fill" style:width={fill === 'full' ? '100%' : fill === 'half' ? '50%' : '0%'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>
      </span>
    </span>
  {/each}
</span>

<style>
  .stars {
    display: flex;
    gap: 2px;
    color: var(--accent);
  }
  .star {
    position: relative;
    width: var(--s);
    height: var(--s);
    flex: none;
  }
  svg {
    width: var(--s);
    height: var(--s);
    display: block;
  }
  path {
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .outline path {
    fill: none;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    overflow: hidden;
  }
  .fill path {
    fill: currentColor;
  }
</style>
