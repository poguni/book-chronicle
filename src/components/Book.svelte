<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import type { ShelfSpine } from '../lib/shelves';
  import { inkFor } from '../lib/spine/color';

  // 책 한 권 = 책등 면 + 표지 면 CSS 3D 상자 (DESIGN 6.2). 꺼내 보기 회전은 Phase 6에서 켭니다.
  let {
    spine,
    showTitle,
    onclick,
    tabindex,
  }: {
    spine: Pick<
      ShelfSpine,
      | 'title'
      | 'author'
      | 'pages'
      | 'estimated'
      | 'height'
      | 'palette'
      | 'pattern'
      | 'finishedAt'
      | 'isBookOfYear'
    >;
    showTitle: boolean;
    onclick?: () => void;
    tabindex?: number;
  } = $props();

  const fg = $derived(inkFor(spine.palette.base));
  const fgl = $derived(inkFor(spine.palette.band));
  // 표지 면: 실제 표지(Phase 5)가 없으면 팔레트로 만든 간이 표지
  const art = $derived(
    `linear-gradient(to top, ${spine.palette.band} 0 28%, ${spine.palette.base} 28% 100%)`,
  );
  const label = $derived(
    ko.book.label({
      title: spine.title,
      author: spine.author,
      pages: spine.pages,
      estimated: spine.estimated,
      finished: spine.finishedAt ? ko.book.finishedMonth(spine.finishedAt) : null,
      bookOfYear: spine.isBookOfYear,
    }),
  );
</script>

<button
  type="button"
  class="book"
  class:estimated={spine.estimated}
  style:--p={spine.pages}
  style:--hh={spine.height}
  style:--base={spine.palette.base}
  style:--band={spine.palette.band}
  style:--accent-c={spine.palette.accent}
  style:--fg={fg}
  style:--fgl={fgl}
  style:--art={art}
  aria-label={label}
  {tabindex}
  {onclick}
>
  <span class="face spine pat-{spine.pattern}">
    {#if showTitle}<span class="t">{spine.title}</span>{/if}
    {#if spine.pattern === 'hardcover'}
      <span class="mk"></span>
    {:else if spine.author && showTitle}
      <span class="a">{spine.author}</span>
    {/if}
  </span>
  <span class="face cover" aria-hidden="true">
    <b>{spine.title}</b>
    {#if spine.author}<small>{spine.author}</small>{/if}
  </span>
  {#if spine.isBookOfYear}<span class="ribbon" aria-hidden="true"></span>{/if}
</button>

<style>
  /* 시안 '책 한 권' 절을 옮김 */
  .book {
    --cw: calc(var(--hh) * var(--spine-hk) * 0.68);
    position: relative;
    flex: none;
    width: clamp(8px, calc(var(--p) * var(--spine-k)), var(--spine-max, 9cqw));
    height: calc(var(--hh) * var(--spine-hk));
    padding: 0;
    margin: 0;
    border: 0;
    background: none;
    cursor: pointer;
    transform-style: preserve-3d;
    transform-origin: 0 50%;
    transition: transform 0.5s var(--ease-book);
  }
  .book:hover,
  .book:focus-visible {
    transform: translateY(-8px);
  }
  .face {
    position: absolute;
    top: 0;
    height: 100%;
  }
  .spine {
    left: 0;
    width: 100%;
    background: var(--base);
    color: var(--fg);
    border-radius: 2px 2px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow:
      inset 2px 0 0 rgba(255, 255, 255, 0.16),
      inset -3px 0 4px -1px rgba(0, 0, 0, 0.28);
  }
  .book:hover .spine {
    box-shadow:
      inset 2px 0 0 rgba(255, 255, 255, 0.16),
      inset -3px 0 4px -1px rgba(0, 0, 0, 0.28),
      0 8px 14px rgba(0, 0, 0, 0.25);
  }
  /* 아주 옅은 종이 질감 */
  .spine::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.22;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  /* 쪽수 추정: 점선 테두리 (DESIGN 12장) */
  .estimated .spine::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border: 1px dashed color-mix(in srgb, var(--fg) 50%, transparent);
    border-radius: inherit;
  }
  .t {
    position: relative;
    writing-mode: vertical-rl;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 62%;
    /* 책등이 짧으면 저자와 겹치지 않게 제목이 줄어들고 말줄임표로 끝남 */
    flex: 0 1 auto;
    min-height: 0;
  }
  /* 시안은 저자를 절대 위치로 두지만, 짧은 책등에서 제목과 겹쳐 흐름 안에 둡니다. */
  .a {
    flex: none;
    margin-top: auto;
    margin-bottom: 22px;
    padding-top: 4px;
    writing-mode: vertical-rl;
    font-size: 9px;
    opacity: 0.75;
    white-space: nowrap;
    max-height: 22%;
    overflow: hidden;
  }
  /* 패턴 ① 하드커버: 위·아래 금박 띠 + 아래 표시 */
  .pat-hardcover {
    background:
      linear-gradient(var(--accent-c), var(--accent-c)) 0 8px/100% 2px no-repeat,
      linear-gradient(var(--accent-c), var(--accent-c)) 0 13px/100% 1px no-repeat,
      linear-gradient(var(--accent-c), var(--accent-c)) 0 calc(100% - 8px) / 100% 2px no-repeat,
      linear-gradient(var(--accent-c), var(--accent-c)) 0 calc(100% - 13px) / 100% 1px no-repeat,
      var(--base);
  }
  .pat-hardcover .t {
    margin-top: 22px;
  }
  .mk {
    position: absolute;
    bottom: 20px;
    width: 7px;
    height: 7px;
    border: 1.5px solid var(--accent-c);
  }
  /* 패턴 ② 페이퍼백: 위쪽 띠색 블록 + 아래 강조 줄 */
  .pat-paperback {
    background:
      linear-gradient(var(--accent-c), var(--accent-c)) 0 calc(100% - 7px) / 100% 3px no-repeat,
      linear-gradient(var(--band) 0 18%, var(--base) 18%);
  }
  .pat-paperback .t {
    margin-top: calc(18% + 8px);
  }
  /* 패턴 ③ 라벨형: 가운데 밝은 라벨 상자 */
  .pat-label .t {
    margin-top: 16px;
    background: var(--band);
    color: var(--fgl);
    padding: 6px 2px;
    border-radius: 2px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  }
  .pat-label .a {
    margin-bottom: 12px;
  }
  /* 표지 면: 평소엔 안쪽으로 90° 접혀 있음 */
  .cover {
    left: 100%;
    width: var(--cw);
    transform-origin: left center;
    transform: rotateY(90deg);
    background: var(--art);
    color: var(--fg);
    border-radius: 0 3px 3px 0;
    padding: 12% 10%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: left;
    box-shadow: var(--book-shadow);
    overflow: hidden;
  }
  .cover b {
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 1.3;
  }
  .cover small {
    font-size: 9px;
    opacity: 0.85;
  }
  /* 그해의 책: 책갈피 끈 (DESIGN 6.5) */
  .ribbon {
    position: absolute;
    bottom: -12px;
    left: 50%;
    margin-left: -3px;
    width: 6px;
    height: 28px;
    background: var(--ribbon);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
    transform: translateZ(1px);
  }
  @media (prefers-reduced-motion: reduce) {
    .book {
      transition: none;
    }
  }
</style>
