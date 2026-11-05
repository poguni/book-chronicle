<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { formatNumber } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { ShelfKind, ShelfSpine } from '../lib/shelves';
  import {
    COVER_RATIO,
    fitTitle,
    packRows,
    pulloutShifts,
    spineHk,
    spineWidthPx,
  } from '../lib/spine/geometry';
  import Book from './Book.svelte';

  // 한 연도 = 머리글 + 책장 + 선반 판 (DESIGN 6.1).
  // 선반 폭을 넘으면 다음 줄로 넘기고 줄마다 선반 판을 그립니다(결정 0001-4).
  let {
    kind = 'year',
    year,
    count,
    pages,
    bookOfYearTitle = null,
    spines = [],
    onpick,
    onreorder,
    selectedId = null,
    highlight = null,
    foldable = false,
    folded = false,
    ontogglefold,
    dropTarget = false,
    ondragyear,
    onmoveyear,
    empty,
  }: {
    kind?: ShelfKind;
    year: number | null;
    count: number;
    pages: number;
    bookOfYearTitle?: string | null;
    spines?: ShelfSpine[];
    onpick?: (spine: ShelfSpine) => void;
    /** 끌어 옮기기·Alt+←→로 바꾼 새 순서(기록 ID) */
    onreorder?: (readingIds: string[]) => void;
    /** 꺼내 본 책의 기록 ID */
    selectedId?: string | null;
    /** 강조 보기: 진하게 둘 책이면 true (null이면 강조 없음) */
    highlight?: ((s: ShelfSpine) => boolean) | null;
    /** 지난해 접기 (P1): 접을 수 있는 책장인지, 접혀 있는지 */
    foldable?: boolean;
    folded?: boolean;
    ontogglefold?: () => void;
    /** 다른 해 책장으로 끌어 옮기기 (결정 0016): 지금 끌고 있는 책이 이 책장 위에 있는지 */
    dropTarget?: boolean;
    /** 끄는 동안 손이 올라간 다른 해(없으면 null) */
    ondragyear?: (year: number | null) => void;
    /** 다른 해 책장에 놓았을 때 */
    onmoveyear?: (spine: ShelfSpine, year: number) => void;
    /** 책이 없을 때 보여 줄 내용 */
    empty?: Snippet;
  } = $props();

  const id = $derived(
    kind === 'year' ? `y${year}` : kind === 'unknown' ? 'y-unknown' : `shelf-${kind}`,
  );
  const title = $derived(
    kind === 'year'
      ? String(year)
      : kind === 'unknown'
        ? ko.shelf.unknownYear
        : kind === 'reading'
          ? ko.shelf.reading
          : ko.shelf.dropped,
  );
  const hint = $derived(
    kind === 'unknown'
      ? ko.shelf.unknownYearHint
      : kind === 'reading'
        ? ko.shelf.readingHint
        : kind === 'dropped'
          ? ko.shelf.droppedHint
          : null,
  );

  // 책장 안쪽 폭(px). cqw와 같은 기준(책장 내용 상자)으로 재서 줄 나눔·제목 숨김을 계산합니다.
  let width = $state(0);
  const measure: Attachment<HTMLElement> = (el) => {
    const ro = new ResizeObserver(([entry]) => {
      if (entry) width = entry.contentRect.width;
    });
    ro.observe(el);
    return () => ro.disconnect();
  };

  // 끌어 옮기는 동안 보여 줄 순서. 놓으면 onreorder로 저장하고 비웁니다(결정 0009).
  let preview = $state.raw<ShelfSpine[] | null>(null);
  const shown = $derived(preview ?? spines);

  let innerWidth = $state(1440);
  const hk = $derived(spineHk(innerWidth));
  const widths = $derived(shown.map((s) => spineWidthPx(s.pages, width)));
  const rows = $derived(packRows(widths, width));
  // 제목을 다 보여 주도록 책등마다 글자 크기·줄 수를 정함. 폭을 재기 전에는 그리지 않음
  const fits = $derived(
    shown.map((s, i) =>
      width === 0 ? null : fitTitle(s.title, s.author, s.pattern, widths[i] ?? 0, s.height * hk),
    ),
  );

  // 꺼내 보기: 꺼낸 책이 비스듬히 돌며 차지하는 만큼 같은 줄 책들을 옆으로 밉니다.
  const shifts = $derived.by(() => {
    if (!selectedId || dragId || width === 0) return {};
    const sel = shown.findIndex((s) => s.readingId === selectedId);
    const row = rows.find((r) => r.includes(sel));
    if (sel < 0 || !row) return {};
    const cover = shown[sel]!.height * hk * COVER_RATIO;
    return pulloutShifts(widths, row, sel, width, cover);
  });

  let rowsEl: HTMLElement | undefined = $state();
  let press: { id: string; x: number; y: number } | null = null;
  let dragId = $state<string | null>(null);
  let suppressClick = false;
  // 다른 해로 옮길 수 있는 책장: 연도 책장과 연도 미상 칸(읽는 중·중단은 상태가 바뀌는 일이라 제외)
  const canMove = $derived(Boolean(onmoveyear) && (kind === 'year' || kind === 'unknown'));
  let dropYear: number | null = null;
  let last = { x: 0, y: 0 };
  let edge = 0;
  let scrolling = false;

  const ids = (list: readonly ShelfSpine[]) => list.map((s) => s.readingId);
  const sameOrder = (a: readonly ShelfSpine[], b: readonly ShelfSpine[]) =>
    a.length === b.length && a.every((s, i) => s.readingId === b[i]?.readingId);

  function onpointerdown(e: PointerEvent) {
    // 손가락은 책장을 넘겨 보는(스크롤) 동작과 겹쳐 끌기를 받지 않습니다.
    if (e.button !== 0 || e.pointerType === 'touch' || !onreorder) return;
    const book = (e.target as Element).closest<HTMLElement>('.book[data-id]');
    if (!book?.dataset.id) return;
    press = { id: book.dataset.id, x: e.clientX, y: e.clientY };
  }

  function onpointermove(e: PointerEvent) {
    if (!press || !rowsEl) return;
    if (!dragId) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return;
      dragId = press.id;
      preview = [...spines];
      rowsEl.setPointerCapture(e.pointerId);
    }
    last = { x: e.clientX, y: e.clientY };
    // 화면 위·아래 끝 가까이에서는 저절로 스크롤(다른 해 책장이 화면 밖에 있을 때)
    edge = e.clientY < 72 ? -1 : e.clientY > window.innerHeight - 72 ? 1 : 0;
    if (edge !== 0 && !scrolling) autoScroll();
    track(e.clientX, e.clientY);
  }

  function autoScroll() {
    scrolling = true;
    requestAnimationFrame(() => {
      if (!dragId || edge === 0) {
        scrolling = false;
        return;
      }
      window.scrollBy(0, edge * 14);
      track(last.x, last.y);
      autoScroll();
    });
  }

  /** 손 아래가 다른 해 책장이면 그 해(아니면 null) */
  function yearUnder(x: number, y: number): number | null {
    if (!canMove) return null;
    for (const el of document.elementsFromPoint(x, y)) {
      const v = (el as HTMLElement).dataset?.dropYear;
      if (v !== undefined) {
        const target = Number(v);
        return target === year ? null : target;
      }
    }
    return null;
  }

  /** 끌고 있는 위치에 맞춰 책을 끼울 자리를 찾고 순서를 바로 바꿔 보여 줍니다. */
  function track(x: number, y: number) {
    if (!rowsEl || !dragId) return;
    const target = yearUnder(x, y);
    if (target !== dropYear) {
      dropYear = target;
      ondragyear?.(target);
    }
    // 다른 해 책장 위에서는 이 책장의 순서를 처음대로 둡니다.
    if (target !== null) {
      if (preview && !sameOrder(preview, spines)) preview = [...spines];
      return;
    }
    const rowEls = [...rowsEl.querySelectorAll<HTMLElement>('.row')];
    let row = 0;
    let best = Infinity;
    rowEls.forEach((el, r) => {
      const rect = el.getBoundingClientRect();
      const d = y < rect.top ? rect.top - y : Math.max(0, y - rect.bottom);
      if (d < best) {
        best = d;
        row = r;
      }
    });
    let at = 0;
    for (const el of rowsEl.querySelectorAll<HTMLElement>('.book[data-id]')) {
      if (el.dataset.id === dragId) continue;
      const r = rowEls.indexOf(el.closest<HTMLElement>('.row')!);
      const rect = el.getBoundingClientRect();
      if (r < row || (r === row && rect.left + rect.width / 2 < x)) at++;
    }
    const current = preview ?? spines;
    const moving = current.find((s) => s.readingId === dragId);
    if (!moving) return;
    const others = current.filter((s) => s.readingId !== dragId);
    const next = [...others.slice(0, at), moving, ...others.slice(at)];
    if (!sameOrder(next, current)) preview = next;
  }

  function endDrag(commit: boolean) {
    if (dragId) {
      // 끌고 난 뒤 따라오는 click은 책 수정 창을 열지 않게 막습니다.
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      const moving = spines.find((s) => s.readingId === dragId);
      if (commit && dropYear !== null && moving) onmoveyear?.(moving, dropYear);
      else if (commit && preview && !sameOrder(preview, spines)) onreorder?.(ids(preview));
    }
    if (dropYear !== null) ondragyear?.(null);
    dropYear = null;
    edge = 0;
    press = null;
    dragId = null;
    preview = null;
  }

  function onclickcapture(e: MouseEvent) {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  }

  /** Alt+←→: 고른 책을 이웃과 자리 바꿈. 바뀐 뒤에도 그 책에 초점을 둡니다. */
  async function moveWithKeys(id: string, step: number) {
    const i = spines.findIndex((s) => s.readingId === id);
    const j = i + step;
    if (i < 0 || j < 0 || j >= spines.length) return;
    const next = [...spines];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onreorder?.(ids(next));
    await tick();
    rowsEl?.querySelector<HTMLElement>(`.book[data-id="${id}"]`)?.focus();
  }

  /** 키보드 ←→로 이웃 책등으로 (DESIGN 8장). 줄이 바뀌어도 이어서 움직입니다. */
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && dragId) {
      endDrag(false);
      return;
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('book')) return;
    const step = e.key === 'ArrowRight' ? 1 : -1;
    if (e.altKey && onreorder && target.dataset.id) {
      e.preventDefault();
      void moveWithKeys(target.dataset.id, step);
      return;
    }
    const books = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.book')];
    const next = books[books.indexOf(target) + step];
    if (next) {
      next.focus();
      e.preventDefault();
    }
  }
</script>

<svelte:window bind:innerWidth />

<section
  class="shelf-wrap {kind}"
  class:drop-target={dropTarget}
  {id}
  aria-labelledby="{id}-title"
  data-drop-year={kind === 'year' && year !== null ? year : undefined}
>
  <div class="shelf-head">
    <h2 class="display" id="{id}-title">{title}</h2>
    <span class="meta">
      {kind === 'reading' || kind === 'dropped'
        ? ko.shelf.readingMeta(count)
        : ko.shelf.meta(count, formatNumber(pages))}
    </span>
    {#if hint}<span class="meta">{hint}</span>{/if}
    {#if foldable}
      <button
        type="button"
        class="fold"
        aria-expanded={!folded}
        aria-controls="{id}-rows"
        aria-label={folded ? ko.shelf.unfoldLabel(title, count) : ko.shelf.foldLabel(title)}
        onclick={ontogglefold}>{folded ? ko.shelf.unfold : ko.shelf.fold}</button
      >
    {/if}
    {#if dropTarget}
      <span class="drop-hint" role="status">{ko.move.dropHint(title)}</span>
    {/if}
    {#if bookOfYearTitle}
      <span class="boy">
        <svg width="11" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
          <path d="M1 0h10v14L6 10.5 1 14z" />
        </svg>
        {ko.shelf.bookOfYear(bookOfYearTitle)}
      </span>
    {/if}
  </div>

  {#if onreorder && spines.length > 1}
    <span class="sr" id="{id}-reorder">{ko.shelf.reorderHint}</span>
  {/if}
  {#if folded}
    <!-- 접힌 책장: 그해 책등 색을 쪽수 비율로 이은 띠 (PRD F4 '지난해 접기') -->
    <button
      type="button"
      class="band"
      id="{id}-rows"
      aria-label={ko.shelf.unfoldLabel(title, count)}
      onclick={ontogglefold}
    >
      {#each spines as s (s.readingId)}
        <span
          class="seg"
          class:dim={highlight ? !highlight(s) : false}
          style:flex="{s.pages} 1 0"
          style:background={s.palette.base}
        ></span>
      {/each}
    </button>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      id="{id}-rows"
      class="rows"
      class:dragging={dragId !== null}
      bind:this={rowsEl}
      {onkeydown}
      {onpointerdown}
      {onpointermove}
      onpointerup={() => endDrag(true)}
      onpointercancel={() => endDrag(false)}
      {onclickcapture}
    >
      {#each rows as row, r (r)}
        <div class="row">
          <div class="shelf" {@attach measure}>
            {#if shown.length === 0}
              {@render empty?.()}
            {:else}
              {#each row as i (shown[i]?.readingId)}
                {@const s = shown[i]!}
                <Book
                  spine={s}
                  fit={fits[i] ?? null}
                  dataId={s.readingId}
                  dragging={dragId === s.readingId}
                  shift={shifts[i] ?? 0}
                  selected={selectedId === s.readingId}
                  dim={highlight ? !highlight(s) : false}
                  lean={kind === 'reading'}
                  describedby={onreorder && spines.length > 1 ? `${id}-reorder` : undefined}
                  onclick={() => onpick?.(s)}
                />
              {/each}
            {/if}
          </div>
          <div class="plank" aria-hidden="true"></div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  /* 시안 '책장' 절을 옮김 */
  .shelf-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    scroll-margin-top: 16px;
  }
  .shelf-wrap.drop-target {
    outline: 2px dashed var(--accent);
    outline-offset: 6px;
    border-radius: var(--radius-m);
  }
  .drop-hint {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent);
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
  .fold {
    height: 28px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }
  .band {
    display: flex;
    gap: 1px;
    height: 18px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    overflow: hidden;
    background: var(--line);
    cursor: pointer;
  }
  .band .seg {
    min-width: 2px;
  }
  .band .seg.dim {
    opacity: 0.28;
  }
  .band:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .boy {
    margin-left: auto;
    font-size: 12px;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /* 꺼내 보기로 밀려난 책이 책장 밖으로 넘쳐 가로 스크롤이 생기지 않게 (위아래는 그대로) */
  .rows {
    overflow-x: clip;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .rows :global(.book) {
    user-select: none;
  }
  .rows.dragging,
  .rows.dragging :global(.book) {
    cursor: grabbing;
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
    /* 위에서 조금 내려다보는 시점: 꺼낸 책의 윗면(종이 결)이 보임. 꽂힌 책(z=0)은 그대로 */
    perspective: 1100px;
    perspective-origin: 50% -30%;
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
  /* 중단한 책은 조금 물러나 보이게 */
  .shelf-wrap.dropped .shelf :global(.book) {
    opacity: 0.7;
  }
  @media (max-width: 899px) {
    .shelf-wrap {
      scroll-margin-top: 84px;
    }
  }
</style>
