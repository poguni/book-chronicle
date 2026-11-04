<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { formatNumber } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { ShelfSpine } from '../lib/shelves';
  import { packRows, spineWidthPx, TITLE_MIN_PX } from '../lib/spine/geometry';
  import Book from './Book.svelte';

  // 한 연도 = 머리글 + 책장 + 선반 판 (DESIGN 6.1).
  // 선반 폭을 넘으면 다음 줄로 넘기고 줄마다 선반 판을 그립니다(결정 0001-4).
  let {
    year,
    count,
    pages,
    bookOfYearTitle = null,
    spines = [],
    onpick,
    empty,
  }: {
    year: number | null;
    count: number;
    pages: number;
    bookOfYearTitle?: string | null;
    spines?: ShelfSpine[];
    onpick?: (spine: ShelfSpine) => void;
    /** 책이 없을 때 보여 줄 내용 */
    empty?: Snippet;
  } = $props();

  const id = $derived(year === null ? 'y-unknown' : `y${year}`);
  const title = $derived(year === null ? ko.shelf.unknownYear : String(year));

  // 책장 안쪽 폭(px). cqw와 같은 기준(책장 내용 상자)으로 재서 줄 나눔·제목 숨김을 계산합니다.
  let width = $state(0);
  const measure: Attachment<HTMLElement> = (el) => {
    const ro = new ResizeObserver(([entry]) => {
      if (entry) width = entry.contentRect.width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  };

  const widths = $derived(spines.map((s) => spineWidthPx(s.pages, width)));
  const rows = $derived(packRows(widths, width));

  /** 키보드 ←→로 이웃 책등으로 (DESIGN 8장). 줄이 바뀌어도 이어서 움직입니다. */
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('book')) return;
    const books = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.book')];
    const next = books[books.indexOf(target) + (e.key === 'ArrowRight' ? 1 : -1)];
    if (next) {
      next.focus();
      e.preventDefault();
    }
  }
</script>

<section class="shelf-wrap" {id} aria-labelledby="{id}-title">
  <div class="shelf-head">
    <h2 class="display" id="{id}-title">{title}</h2>
    <span class="meta">{ko.shelf.meta(count, formatNumber(pages))}</span>
    {#if year === null}<span class="meta">{ko.shelf.unknownYearHint}</span>{/if}
    {#if bookOfYearTitle}
      <span class="boy">
        <svg width="11" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
          <path d="M1 0h10v14L6 10.5 1 14z" />
        </svg>
        {ko.shelf.bookOfYear(bookOfYearTitle)}
      </span>
    {/if}
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="rows" {onkeydown}>
    {#each rows as row, r (r)}
      <div class="row">
        <div class="shelf" {@attach measure}>
          {#if spines.length === 0}
            {@render empty?.()}
          {:else}
            {#each row as i (spines[i]?.readingId)}
              {@const s = spines[i]!}
              <Book
                spine={s}
                showTitle={width === 0 || (widths[i] ?? 0) >= TITLE_MIN_PX}
                onclick={() => onpick?.(s)}
              />
            {/each}
          {/if}
        </div>
        <div class="plank" aria-hidden="true"></div>
      </div>
    {/each}
  </div>
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
  .meta {
    font-size: 13px;
    color: var(--muted);
  }
  .boy {
    margin-left: auto;
    font-size: 12px;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
