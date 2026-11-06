<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { covers } from '../lib/covers.svelte';
  import { prefs } from '../lib/prefs.svelte';
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
    dim = false,
    lean = false,
    shift = 0,
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
    > & { coverPath?: string | null; texturePath?: string | null };
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
    /** 강조 보기에서 흐리게 */
    dim?: boolean;
    /** 읽는 중: 선반에 비스듬히 기대어 놓음 (P1) */
    lean?: boolean;
    /** 꺼내 보기에서 옆으로 밀려나는 거리(px). 꺼낸 책 오른쪽 책들이 비켜 섬 */
    shift?: number;
  } = $props();

  const fg = $derived(inkFor(spine.palette.base));
  const fgl = $derived(inkFor(spine.palette.band));
  // 표지 면: 꺼냈을 때만 실제 표지를 내려받고, 없으면 팔레트로 만든 간이 표지
  const coverUrl = $derived(selected && spine.coverPath ? covers.url(spine.coverPath) : null);
  // 표지 질감 모드(PRD 6.5): 화면에 보이는 책만 질감 이미지를 내려받습니다(PRD 11장 성능).
  let visible = $state(false);
  const watch: Attachment<HTMLElement> = (el) => {
    // 질감 모드이고 질감이 있는 책만 감시합니다(책 1,000권에서도 가볍게).
    if (visible || prefs.spine !== 'texture' || !spine.texturePath) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          visible = true;
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  };
  const textureUrl = $derived(
    prefs.spine === 'texture' && visible && spine.texturePath
      ? covers.url(spine.texturePath)
      : null,
  );
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
  class:dim
  class:lean
  data-id={dataId}
  style:--p={spine.pages}
  style:--hh={spine.height}
  style:--base={spine.palette.base}
  style:--band={spine.palette.band}
  style:--accent-c={spine.palette.accent}
  style:--fg={fg}
  style:--fgl={fgl}
  style:--art={art}
  style:translate={shift ? `${shift}px 0` : undefined}
  aria-label={label}
  aria-describedby={describedby}
  aria-pressed={selected}
  {@attach watch}
  {tabindex}
  {onclick}
>
  <span class="face spine pat-{spine.pattern}" class:textured={textureUrl}>
    {#if textureUrl}<span class="tex" style:background-image={`url("${textureUrl}")`}></span>{/if}
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
  <!-- 꺼냈을 때 보이는 윗면: 책 두께만큼의 종이 결 (책 1,000권에서도 가볍게, 꺼낸 책에만) -->
  {#if selected}<span class="face top" aria-hidden="true"></span>{/if}
  <!-- 그해의 책: 책등 위 끝에 트로피 배지 (결정 0021). 책과 함께 들리고 돌아감 -->
  {#if spine.isBookOfYear}
    <span class="trophy" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M7 3h10v6a5 5 0 0 1-10 0zM10.6 13.6h2.8V17h-2.8zM8 17.5h8V21H8z" />
        <path
          class="handle"
          d="M7.2 5.2H4.5v1.3A3.6 3.6 0 0 0 8 10.1M16.8 5.2h2.7v1.3A3.6 3.6 0 0 1 16 10.1"
        />
      </svg>
    </span>
  {/if}
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
    transition:
      transform 0.5s var(--ease-book),
      translate 0.5s var(--ease-book);
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
  /* 빛은 앞에서: 옆으로 돌아간 책등은 조금 어둡게 */
  .spine {
    transition: filter 0.5s var(--ease-book);
  }
  .book[aria-pressed='true'] .spine {
    filter: brightness(0.78);
  }
  /* 강조 보기: 강조하지 않는 책은 흐리게 (PRD F4) */
  .book.dim {
    opacity: 0.28;
    filter: saturate(0.4);
  }
  .book.dim:hover,
  .book.dim:focus-visible {
    opacity: 0.8;
  }
  /* 읽는 중: 비스듬히 기대어 놓은 모습 (PRD F4 P1). 꺼내면 바로 섬 */
  .book.lean {
    rotate: 7deg;
    transform-origin: 0 100%;
    margin-right: 10px;
  }
  .book.lean[aria-pressed='true'] {
    rotate: 0deg;
    transform-origin: 0 50%;
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
  /* 표지 질감 모드: 흐린 표지 위에 바탕색을 반쯤 덧칠해 제목이 읽히게 (PRD 6.5) */
  .tex {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
  }
  .tex::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--base);
    opacity: 0.5;
  }
  .textured .t,
  .textured .a {
    position: relative;
    z-index: 1;
  }
  .textured .mk {
    z-index: 1;
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
  /* 표지: 책등 쪽 접히는 홈의 그림자 + 은은한 광택 */
  .cover::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to right,
        rgba(0, 0, 0, 0.32) 0,
        rgba(0, 0, 0, 0.08) 5px,
        rgba(255, 255, 255, 0.1) 7px,
        transparent 12px
      ),
      linear-gradient(
        115deg,
        rgba(255, 255, 255, 0.16) 0%,
        transparent 38%,
        rgba(0, 0, 0, 0.12) 100%
      );
  }
  /* 윗면: 책등과 표지 사이의 종이 덩어리(가로 = 책 두께, 세로 = 표지 너비). 안쪽으로 눕힘 */
  .top {
    left: 0;
    width: 100%;
    height: var(--cw);
    transform-origin: top;
    transform: rotateX(-90deg);
    background:
      repeating-linear-gradient(to right, transparent 0 2px, var(--book-page-line) 2px 3px),
      var(--book-page);
    box-shadow: inset 0 0 0 1px var(--book-page-line);
  }
  /* 꽂혀 있을 때는 표지·윗면을 숨김: 원근 때문에 얇은 책등 옆으로 비쳐 이웃 책을 가림 (결정 0009) */
  /* 꺼냈을 때 표지 면이 옆 책을 덮어도 옆 책을 누를 수 있게 */
  .cover,
  .top {
    pointer-events: none;
  }
  .book:not([aria-pressed='true']) .cover,
  .book:not([aria-pressed='true']) .top {
    visibility: hidden;
  }
  /* 꺼낸 책은 옆 책들이 비켜 서므로, 보이는 표지·윗면을 눌러도 다시 꽂힘 (결정 0017) */
  .book[aria-pressed='true'] .cover,
  .book[aria-pressed='true'] .top {
    pointer-events: auto;
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
  /* 그해의 책 트로피 배지: 책등 위 끝 가운데에 반쯤 걸쳐 놓음. 어떤 책등 색에서도 보이게 밝은 테두리 */
  .trophy {
    position: absolute;
    top: -10px;
    left: 50%;
    width: 20px;
    height: 20px;
    margin-left: -10px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 35% 30%, var(--trophy-hi), var(--trophy) 65%);
    color: var(--trophy-ink);
    box-shadow:
      0 0 0 1.5px var(--trophy-ring),
      0 2px 4px rgba(0, 0, 0, 0.3);
    transform: translateZ(2px);
    pointer-events: none;
  }
  .trophy svg {
    width: 13px;
    height: 13px;
    fill: currentColor;
  }
  .trophy .handle {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  /* 움직임 줄이기(운영체제 설정 또는 앱 설정): 돌아가는·밀리는 움직임 없이 꺼낸 모습을 바로 보여 줌.
     3D 자세 자체는 움직임이 아니라서 그대로 둡니다(결정 0017). */
  @media (prefers-reduced-motion: reduce) {
    .book,
    .spine {
      transition: none;
    }
  }
  :global([data-motion='reduce']) .book,
  :global([data-motion='reduce']) .spine {
    transition: none;
  }
</style>
