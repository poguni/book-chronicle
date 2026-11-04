<script lang="ts">
  import { covers } from '../lib/covers.svelte';
  import { ko } from '../lib/i18n/ko';
  import type { ShelfSpine } from '../lib/shelves';
  import { inkFor } from '../lib/spine/color';
  import type { TitleFit } from '../lib/spine/geometry';

  // 책 한 권 = 책등 면 + 표지 면 CSS 3D 상자 (DESIGN 6.2).
  // 고르면(selected) 앞으로 빠져나와 돌면서 표지 면이 보입니다(꺼내 보기, PRD 6.6).
  let {
    spine,
    fit,
    onclick,
    tabindex,
    dataId,
    dragging = false,
    describedby,
    selected,
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
      | 'status'
      | 'finishedAt'
      | 'isBookOfYear'
    > & { coverPath?: string | null };
    /** 제목 글자 크기·줄 수 (fitTitle). null이면 제목을 그리지 않음 */
    fit: TitleFit | null;
    onclick?: () => void;
    tabindex?: number;
    /** 끌어 옮기기에서 책을 찾는 표시 (기록 ID) */
    dataId?: string;
    dragging?: boolean;
    describedby?: string;
    /** 꺼내 본 책이면 true. 책장 밖(미리 보기)에서는 undefined라 aria-pressed를 달지 않음 */
    selected?: boolean;
  } = $props();

  const fg = $derived(inkFor(spine.palette.base));
  const fgl = $derived(inkFor(spine.palette.band));
  // 표지 면: 꺼냈을 때만 실제 표지를 내려받고, 없으면 팔레트로 만든 간이 표지
  const coverUrl = $derived(selected && spine.coverPath ? covers.url(spine.coverPath) : null);
  const art = $derived(
    coverUrl
      ? `center / cover no-repeat url("${coverUrl}")`
      : `linear-gradient(to top, ${spine.palette.band} 0 28%, ${spine.palette.base} 28% 100%)`,
  );
  const label = $derived(
    ko.book.label({
      title: spine.title,
      author: spine.author,
      pages: spine.pages,
      estimated: spine.estimated,
      status: spine.status,
      finished: spine.finishedAt ? ko.book.finishedMonth(spine.finishedAt) : null,
      bookOfYear: spine.isBookOfYear,
    }),
  );
</script>

<button
  type="button"
  class="book"
  class:estimated={spine.estimated}
  class:dragging
  data-id={dataId}
  style:--p={spine.pages}
  style:--hh={spine.height}
  style:--base={spine.palette.base}
  style:--band={spine.palette.band}
  style:--accent-c={spine.palette.accent}
  style:--fg={fg}
  style:--fgl={fgl}
  style:--art={art}
  aria-label={label}
  aria-describedby={describedby}
  aria-pressed={selected}
  {tabindex}
  {onclick}
>
  <span class="face spine pat-{spine.pattern}">
    {#if fit}
      <span class="t" style:font-size="{fit.font}px" style:max-height="{fit.maxHeight}px"
        >{spine.title}</span
      >
    {/if}
    {#if spine.pattern === 'hardcover'}
      <span class="mk"></span>
    {:else if spine.author && fit?.author}
      <span class="a">{spine.author}</span>
    {/if}
  </span>
  <span class="face cover" aria-hidden="true">
    {#if !coverUrl}
      <b>{spine.title}</b>
      {#if spine.author}<small>{spine.author}</small>{/if}
    {/if}
  </span>
  {#if spine.isBookOfYear}<span class="ribbon" aria-hidden="true"></span>{/if}
</button>

<style>
  /* 시안 '책 한 권' 절을 옮김 */
  .book {
    --cw: calc(var(--hh) * var(--spine-hk) * 0.68);
    position: relative;
    flex: none;
    /* geometry.ts spineWidthPx와 같은 식 (결정 0009) */
    width: clamp(
      12px,
      max(calc(var(--p) * var(--spine-k)), calc(var(--p) * 0.07px)),
      var(--spine-max, max(6cqw, 36px))
    );
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
  /* 꺼내 보기 (DESIGN 8장): 들리며 앞으로 나와 Y축으로 돌아 표지 면이 비스듬히 보임 */
  .book[aria-pressed='true'] {
    transform: translateY(-14px) translateZ(36px) rotateY(-62deg);
    z-index: 5;
  }
  /* 끌어 옮기는 중인 책: 조금 들려 있고 반투명 */
  .book.dragging {
    transform: translateY(-14px);
    opacity: 0.75;
    cursor: grabbing;
    z-index: 2;
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
  /* 제목은 줄이지 않고 다 보여 줌: 글자 크기와 줄 수는 fitTitle이 정함 (결정 0009) */
  .t {
    position: relative;
    writing-mode: vertical-rl;
    font-family: var(--font-spine);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: 0.02em;
    word-break: normal;
    overflow-wrap: anywhere;
    overflow: hidden;
    /* 계산보다 줄이 늘어도 책등 밖으로 넘치지 않게 */
    max-width: 100%;
    flex: none;
  }
  /* 시안은 저자를 절대 위치로 두지만, 짧은 책등에서 제목과 겹쳐 흐름 안에 둡니다. */
  .a {
    flex: none;
    margin-top: auto;
    margin-bottom: 22px;
    padding-top: 4px;
    writing-mode: vertical-rl;
    font-family: var(--font-spine);
    font-size: 9px;
    font-weight: 500;
    opacity: 0.8;
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
  /* 세로 % 여백은 폭 기준이라 책등 높이로 직접 계산 (띠 18% + 8px, geometry.ts fitTitle과 같음) */
  .pat-paperback .t {
    margin-top: calc(var(--hh) * var(--spine-hk) * 0.18 + 8px);
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
  /* 꽂혀 있을 때는 표지 면을 숨김: 원근 때문에 얇은 책등 옆으로 비쳐 이웃 책을 가림 (결정 0009) */
  /* 꺼냈을 때 표지 면이 옆 책을 덮어도 옆 책을 누를 수 있게 */
  .cover {
    pointer-events: none;
  }
  .book:not([aria-pressed='true']) .cover {
    visibility: hidden;
  }
  .cover b {
    font-family: var(--font-display);
    font-weight: var(--display-weight);
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
  /* 움직임 줄이기(운영체제 설정 또는 앱 설정): 회전 없이 들림 + 강조색 테두리만 */
  @media (prefers-reduced-motion: reduce) {
    .book {
      transition: none;
    }
    .book[aria-pressed='true'] {
      transform: translateY(-14px);
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .book[aria-pressed='true'] .cover {
      visibility: hidden;
    }
  }
  :global([data-motion='reduce']) .book {
    transition: none;
  }
  :global([data-motion='reduce']) .book[aria-pressed='true'] {
    transform: translateY(-14px);
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  :global([data-motion='reduce']) .book[aria-pressed='true'] .cover {
    visibility: hidden;
  }
</style>
