<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import OneLinerForm from '../components/OneLinerForm.svelte';
  import { covers } from '../lib/covers.svelte';
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import {
    CARD_TEMPLATES,
    canvasToPng,
    cardCategories,
    drawCard,
    loadCardFonts,
    type CardData,
    type CardItems,
    type CardSize,
    type CardTemplate,
    type CardTheme,
  } from '../lib/recapCard';
  import { MAX_BOOKS_OF_YEAR } from '../lib/bookOfYear';
  import { sortSpines } from '../lib/shelves';
  import {
    bookOfYearCandidate,
    monthCounts,
    OTHER_CATEGORY,
    shelfOf,
    topCategory,
    yearsWithBooks,
  } from '../lib/stats';
  import { saveFile } from '../lib/transfer';

  // 연말 회고 (PRD F6·F7): 그해의 책, 한 줄 회고, 회고 카드(PNG 저장·공유)
  let { year: routeYear }: { year: number | null } = $props();

  const currentYear = new Date().getFullYear();
  const year = $derived(routeYear ?? currentYear);
  const years = $derived(yearsWithBooks(library.shelves, currentYear));
  const shelf = $derived(shelfOf(library.shelves, year));
  const spines = $derived(sortSpines(shelf?.spines ?? [], 'manual'));
  const yearRow = $derived(library.years.find((y) => y.year === year));
  // 그해의 책 1~3위 (고른 순서). 책장에서 지워진 책은 건너뜀
  const chosenIds = $derived(yearRow?.book_of_year ?? []);
  const chosen = $derived(
    chosenIds
      .map((id) => spines.find((s) => s.bookId === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined),
  );
  const boy = $derived(chosen[0] ?? null);
  const candidate = $derived(
    chosenIds.length >= MAX_BOOKS_OF_YEAR
      ? null
      : bookOfYearCandidate(library.shelves, year, chosenIds),
  );
  let boyMessage = $state<string | null>(null);
  async function toggleBoy(bookId: string) {
    boyMessage =
      (await library.toggleBookOfYear(year, bookId)) === 'full' ? ko.recap.boyFull : null;
  }

  // ── 회고 카드
  let size = $state<CardSize>('portrait');
  let template = $state<CardTemplate>('shelf');
  let theme = $state<CardTheme>(prefs.theme === 'paper' ? 'paper' : 'study');
  let items = $state<CardItems>({ shelf: true, numbers: true, bookOfYear: true, oneLiner: true });
  let canvasEl: HTMLCanvasElement | undefined = $state();
  let message = $state<string | null>(null);

  // 그해의 책 표지: Storage에서 받은 Blob 주소라 캔버스가 오염되지 않음(PRD F7)
  const coverUrl = $derived(boy?.coverPath ? covers.url(boy.coverPath) : null);
  let coverImg = $state.raw<HTMLImageElement | null>(null);
  $effect(() => {
    const url = coverUrl;
    coverImg = null;
    if (!url) return;
    const img = new Image();
    let alive = true;
    img.src = url;
    img
      .decode()
      .then(() => alive && (coverImg = img))
      .catch(() => {});
    return () => (alive = false);
  });

  const data: CardData = $derived({
    year,
    books: spines.length,
    pages: shelf?.pages ?? 0,
    topCategory: topCategory(spines),
    spines: spines.map((s) => ({ pages: s.pages, height: s.height, palette: s.palette })),
    months: monthCounts(spines),
    categories: cardCategories(
      spines.map((s) => s.category),
      OTHER_CATEGORY,
    ),
    bookOfYear: boy
      ? {
          title: boy.title,
          author: boy.author,
          palette: boy.palette,
          cover: coverImg,
          runnersUp: chosen.slice(1).map((s) => s.title),
        }
      : null,
    oneLiner: yearRow?.one_liner ?? null,
  });
  const labels = {
    title: ko.recap.cardTitle,
    books: ko.recap.cardBooks,
    pages: ko.recap.cardPages,
    booksLabel: ko.recap.cardBooksLabel,
    pagesLabel: ko.recap.cardPagesLabel,
    topLabel: ko.recap.cardTop,
    boy: ko.recap.cardBoy,
    rank: ko.recap.rank,
    months: Array.from({ length: 12 }, (_, i) => `${i + 1}`),
    books1: (n: number) => `${n}${ko.recap.cardBooks}`,
    watermark: ko.recap.watermark,
  };

  const paint: Attachment<HTMLCanvasElement> = (canvas) => {
    const d = data;
    const opts = { size, theme, items: { ...items }, template };
    let alive = true;
    void loadCardFonts().then(() => {
      if (alive) drawCard(canvas, d, opts, labels);
    });
    return () => (alive = false);
  };

  const fileName = $derived(
    `bookchronicle-${year}-${size}${template === 'shelf' ? '' : `-${template}`}.png`,
  );
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });

  async function savePng() {
    if (!canvasEl) return;
    saveFile(fileName, await canvasToPng(canvasEl));
  }

  async function share() {
    if (!canvasEl) return;
    message = null;
    const file = new File([await canvasToPng(canvasEl)], fileName, { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: ko.recapOfYear(year) });
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') message = ko.recap.shareFailed;
    }
  }

  const SIZES: CardSize[] = ['square', 'portrait', 'story'];
  const THEMES: CardTheme[] = ['study', 'paper', 'spine'];
  const ITEMS: (keyof CardItems)[] = ['shelf', 'numbers', 'bookOfYear', 'oneLiner'];
</script>

<h1 class="display page-title">{ko.recapOfYear(year)}</h1>

<nav class="chips" aria-label={ko.recap.pickYear}>
  {#each years as y (y)}
    <a class="chip" href="#/recap/{y}" aria-current={y === year ? 'page' : undefined}>{y}</a>
  {/each}
</nav>

<div class="top">
  <section class="card" aria-labelledby="boy-title">
    <h2 class="display" id="boy-title">{ko.recap.boy}</h2>
    {#if spines.length === 0}
      <p class="hint">{ko.recap.noBooks}</p>
    {:else}
      <p class="hint">{ko.recap.boyHint}</p>
      {#if chosen.length === 0}
        <p class="hint">{ko.recap.boyNone}</p>
      {:else}
        <ol class="ranks" aria-label={ko.recap.ranks}>
          {#each chosen as s, i (s.bookId)}
            <li>
              <span class="rank">{ko.recap.rank(i + 1)}</span>
              <span class="sw" style:background={s.palette.base} aria-hidden="true"></span>
              <span class="t">{s.title}</span>
              <button
                type="button"
                class="mini"
                aria-label={ko.recap.rankUp(s.title)}
                disabled={i === 0}
                onclick={() => library.moveBookOfYear(year, s.bookId, -1)}>↑</button
              >
              <button
                type="button"
                class="mini"
                aria-label={ko.recap.rankDown(s.title)}
                disabled={i === chosen.length - 1}
                onclick={() => library.moveBookOfYear(year, s.bookId, 1)}>↓</button
              >
              <button
                type="button"
                class="mini"
                aria-label={ko.recap.rankRemove(s.title)}
                onclick={() => toggleBoy(s.bookId)}>{ko.recap.remove}</button
              >
            </li>
          {/each}
        </ol>
      {/if}
      {#if candidate}
        <div class="candidate">
          <span>{ko.recap.candidate(candidate.title, candidate.rating ?? 0)}</span>
          <button type="button" class="btn-line" onclick={() => toggleBoy(candidate.bookId)}
            >{ko.recap.useCandidate}</button
          >
        </div>
      {/if}
      {#if boyMessage}<p class="hint" role="status">{boyMessage}</p>{/if}
      <ul class="books">
        {#each spines as s (s.readingId)}
          {@const rank = chosenIds.indexOf(s.bookId)}
          <li>
            <button type="button" aria-pressed={rank >= 0} onclick={() => toggleBoy(s.bookId)}>
              <span class="sw" style:background={s.palette.base} aria-hidden="true"></span>
              <span class="t">{s.title}</span>
              {#if rank >= 0}<span class="rank">{ko.recap.rank(rank + 1)}</span>{/if}
              {#if s.rating !== null}<span class="r">★ {s.rating}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="card">
    {#key `${year}-${library.state}`}
      <OneLinerForm
        initial={yearRow?.one_liner ?? ''}
        onsave={(text) => library.saveOneLiner(year, text)}
      />
    {/key}
  </section>
</div>

<section class="card editor" aria-labelledby="card-title">
  <h2 class="display" id="card-title">{ko.recap.card}</h2>
  <div class="editor-grid">
    <div class="preview" role="img" aria-label={ko.recap.preview(year)}>
      {#key `${year}-${size}-${template}-${theme}-${JSON.stringify(items)}-${data.bookOfYear?.cover ? 1 : 0}-${data.oneLiner}-${data.books}-${chosenIds.join()}`}
        <canvas bind:this={canvasEl} {@attach paint} aria-hidden="true" class={size}></canvas>
      {/key}
    </div>
    <div class="settings">
      <fieldset>
        <legend class="label">{ko.recap.template}</legend>
        {#each CARD_TEMPLATES as t (t)}
          <label
            ><input type="radio" name="card-template" value={t} bind:group={template} />{ko.recap
              .templates[t]}</label
          >
        {/each}
      </fieldset>
      <fieldset>
        <legend class="label">{ko.recap.size}</legend>
        {#each SIZES as s (s)}
          <label
            ><input type="radio" name="card-size" value={s} bind:group={size} />{ko.recap.sizes[
              s
            ]}</label
          >
        {/each}
      </fieldset>
      <fieldset>
        <legend class="label">{ko.recap.theme}</legend>
        {#each THEMES as t (t)}
          <label
            ><input type="radio" name="card-theme" value={t} bind:group={theme} />{ko.recap.themes[
              t
            ]}</label
          >
        {/each}
      </fieldset>
      <fieldset>
        <legend class="label">{ko.recap.include}</legend>
        {#each ITEMS as k (k)}
          <label
            ><input type="checkbox" bind:checked={items[k]} />{k === 'shelf'
              ? ko.recap.visual[template]
              : ko.recap.items[k]}</label
          >
        {/each}
      </fieldset>
      <div class="actions">
        <button type="button" class="btn-primary" onclick={savePng}>{ko.recap.savePng}</button>
        {#if canShare}
          <button type="button" class="btn" onclick={share}>{ko.recap.share}</button>
        {/if}
      </div>
      {#if message}<p class="hint" role="status">{message}</p>{/if}
    </div>
  </div>
</section>

<style>
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    height: 40px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    font-size: 13px;
    text-decoration: none;
  }
  .chip[aria-current='page'] {
    border-color: var(--accent);
    color: var(--text);
    font-weight: 700;
  }
  .top {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .card {
    padding: 18px 20px;
    border-radius: var(--radius-l);
    background: var(--card);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .candidate {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 12px;
    border-radius: var(--radius-s);
    background: var(--accent-soft);
    font-size: 14px;
  }
  .btn-line {
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    background: transparent;
    color: var(--accent);
    font-weight: 700;
    cursor: pointer;
  }
  .ranks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ranks li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 4px 6px 4px 10px;
    border-radius: 10px;
    border: 1px solid var(--accent);
    background: var(--bg);
    font-size: 14px;
  }
  .rank {
    flex: none;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
  }
  .mini {
    flex: none;
    min-width: 36px;
    height: 36px;
    padding: 0 8px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    font-size: 13px;
  }
  .mini:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .books {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
    max-height: 320px;
    overflow-y: auto;
  }
  .books button {
    width: 100%;
    min-height: 44px;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }
  .books button[aria-pressed='true'] {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
    font-weight: 700;
  }
  .sw {
    width: 8px;
    height: 26px;
    border-radius: 2px;
    flex: none;
  }
  .t {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .r {
    color: var(--accent);
    flex: none;
  }
  .editor-grid {
    display: grid;
    grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .preview canvas {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: var(--book-shadow);
  }
  .preview canvas.story {
    width: min(100%, 300px);
    margin: 0 auto;
  }
  .settings {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  fieldset label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font-size: 14px;
    cursor: pointer;
  }
  input[type='radio'],
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .btn-primary {
    padding: 0 18px;
  }
  .btn {
    height: 48px;
    padding: 0 18px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
  }
  @media (max-width: 1199px) {
    .top,
    .editor-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .preview {
      max-width: 440px;
    }
  }
</style>
