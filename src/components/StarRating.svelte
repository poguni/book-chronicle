<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { MAX_RATING, ratingFromPosition, starFill, stepRating } from '../lib/rating';

  // 별 5개를 눌러 채우는 별점 입력. 별 왼쪽 절반은 0.5점, 키보드 ←→로 0.5점씩.
  // 화면 낭독기에는 0~5 슬라이더로 읽힙니다. null은 별점 없음(0점과 다름).
  let {
    value = $bindable(null),
    labelledby,
    describedby,
  }: { value?: number | null; labelledby: string; describedby?: string } = $props();

  // 마우스를 올렸을 때 미리 보여 줄 점수
  let hover = $state<number | null>(null);
  const shown = $derived(hover ?? value);

  function fromPointer(e: MouseEvent): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return ratingFromPosition(e.clientX - rect.left, rect.width);
  }

  function onkeydown(e: KeyboardEvent) {
    let next: number | null | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = stepRating(value, 0.5);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = stepRating(value, -0.5);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = MAX_RATING;
    else if (e.key === 'Delete' || e.key === 'Backspace') next = null;
    if (next === undefined) return;
    e.preventDefault();
    value = next;
  }
</script>

<div class="rating">
  <div
    class="stars"
    role="slider"
    tabindex="0"
    aria-labelledby={labelledby}
    aria-describedby={describedby}
    aria-valuemin={0}
    aria-valuemax={MAX_RATING}
    aria-valuenow={value ?? undefined}
    aria-valuetext={value === null ? ko.form.ratingNone : ko.form.ratingValue(value)}
    {onkeydown}
    onpointermove={(e) => {
      if (e.pointerType === 'mouse') hover = fromPointer(e);
    }}
    onpointerleave={() => (hover = null)}
    onclick={(e) => {
      value = fromPointer(e);
      hover = null;
    }}
  >
    {#each [1, 2, 3, 4, 5] as n (n)}
      {@const fill = starFill(shown, n)}
      <span class="star" class:preview={hover !== null}>
        <svg viewBox="0 0 24 24" aria-hidden="true" class="outline">
          <path
            d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
          />
        </svg>
        <span class="fill" style:width={fill === 'full' ? '100%' : fill === 'half' ? '50%' : '0%'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
            />
          </svg>
        </span>
      </span>
    {/each}
  </div>
  <span class="value" aria-hidden="true">
    {shown === null ? ko.form.ratingNone : ko.form.ratingValue(shown)}
  </span>
  {#if value !== null}
    <button type="button" class="clear" onclick={() => (value = null)}>
      {ko.form.ratingClear}
    </button>
  {/if}
</div>

<style>
  .rating {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    min-height: 44px;
  }
  .stars {
    display: flex;
    gap: 2px;
    padding: 4px;
    margin-left: -4px;
    border-radius: var(--radius-s);
    cursor: pointer;
    touch-action: manipulation;
    color: var(--accent);
  }
  .stars:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .star {
    position: relative;
    width: 32px;
    height: 32px;
    flex: none;
  }
  .star svg {
    width: 32px;
    height: 32px;
    display: block;
  }
  .outline path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    overflow: hidden;
    pointer-events: none;
  }
  .fill path {
    fill: currentColor;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .preview .fill {
    opacity: 0.6;
  }
  .value {
    font-size: 14px;
    color: var(--text);
    min-width: 4em;
  }
  .clear {
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
  }
</style>
