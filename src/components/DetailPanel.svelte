<script lang="ts" module>
  import type { ReadingRow, ShelfSpine } from '../lib/shelves';

  /** 꺼내 본 책: 고른 기록과 그 책의 모든 기록(다시 읽기 포함) */
  export type Selection = { spine: ShelfSpine; reading: ReadingRow; readings: ReadingRow[] };
</script>

<script lang="ts">
  import { covers } from '../lib/covers.svelte';
  import { formatNumber, monthBars } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { ShelfYear } from '../lib/shelves';
  import { inkFor } from '../lib/spine/color';
  import { averageRating, monthCounts, topCategory } from '../lib/stats';
  import EmptyState from './EmptyState.svelte';
  import Icon from './Icon.svelte';
  import MonthBars from './MonthBars.svelte';
  import Stars from './Stars.svelte';
  import YearRings from './YearRings.svelte';

  // 상세 패널 (DESIGN 7.3): 꺼내 본 책 + 올해 한눈에 + 올해의 나이테.
  // "한눈에"는 올해 고정입니다(결정 0001-9). spines는 올해 책장의 책등입니다.
  let {
    today,
    spines,
    shelves,
    selection,
    open,
    onclose,
    onedit,
    onbookofyear,
    onselectreading,
  }: {
    today: Date;
    spines: ShelfSpine[];
    shelves: ShelfYear[];
    selection: Selection | null;
    open: boolean;
    onclose: () => void;
    onedit: () => void;
    onbookofyear: () => void;
    onselectreading: (readingId: string) => void;
  } = $props();

  const sel = $derived(selection?.spine ?? null);
  const coverUrl = $derived(sel ? covers.url(sel.coverPath) : null);
  // 표지가 없으면 팔레트로 만든 간이 표지
  const art = $derived(
    sel ? `linear-gradient(to top, ${sel.palette.band} 0 28%, ${sel.palette.base} 28% 100%)` : '',
  );
  const finishedFact = $derived(
    !sel
      ? ''
      : sel.status === 'reading'
        ? ko.detail.reading
        : sel.status === 'dropped'
          ? ko.detail.dropped
          : sel.finishedAt
            ? ko.detail.finishedValue(sel.finishedAt)
            : ko.detail.finishedUnknown,
  );
  const memo = $derived(selection?.reading.note || ko.detail.noMemo);
  // 그해의 책은 완독일이 있는 완독 기록만 고를 수 있음
  const canBookOfYear = $derived(
    selection?.reading.status === 'finished' && selection.reading.year !== null,
  );

  const year = $derived(today.getFullYear());
  const bars = $derived(monthBars(monthCounts(spines), year, today));
  const pages = $derived(spines.reduce((sum, s) => sum + (s.knownPages ?? 0), 0));
  const rating = $derived(averageRating(spines));
  const top = $derived(topCategory(spines));
</script>

<aside class="detail" class:open aria-label={ko.detail.label}>
  <button type="button" class="detail-close" aria-label={ko.detail.close} onclick={onclose}>
    <Icon name="close" strokeWidth={2} />
  </button>

  <section class="selected" aria-labelledby="sel-label">
    <span class="label" id="sel-label">{ko.detail.selected}</span>
    {#if selection && sel}
      <div class="sel-head">
        <div
          class="big-cover"
          class:image={coverUrl}
          style:--art={art}
          style:--fgc={inkFor(sel.palette.base)}
        >
          {#if coverUrl}
            <img src={coverUrl} alt={ko.detail.coverAlt(sel.title)} />
          {:else}
            <b aria-hidden="true">{sel.title}</b>
            {#if sel.author}<small aria-hidden="true">{sel.author}</small>{/if}
          {/if}
        </div>
        <div class="sel-info">
          {#if sel.isBookOfYear}<span class="tag">{ko.detail.bookOfYearTag}</span>{/if}
          <h3 class="display">{sel.title}</h3>
          {#if sel.author}<span class="author">{sel.author}</span>{/if}
          <Stars value={sel.rating} />
        </div>
      </div>
      <dl class="facts">
        <div>
          <dt>{ko.detail.pages}</dt>
          <dd>
            {sel.knownPages
              ? ko.detail.pagesValue(formatNumber(sel.knownPages))
              : ko.detail.pagesUnknown}
          </dd>
        </div>
        <div>
          <dt>{ko.detail.finished}</dt>
          <dd>{finishedFact}</dd>
        </div>
        <div>
          <dt>{ko.detail.category}</dt>
          <dd>{sel.category ?? ko.detail.none}</dd>
        </div>
      </dl>
      {#if selection.readings.length > 1}
        <div class="reads">
          <span class="label" id="reads-label">{ko.detail.readings(selection.readings.length)}</span
          >
          <ul aria-labelledby="reads-label">
            {#each selection.readings as r (r.id)}
              <li>
                <button
                  type="button"
                  aria-current={r.id === selection.reading.id ? 'true' : undefined}
                  onclick={() => onselectreading(r.id)}
                >
                  <span
                    >{ko.detail.readingItem({
                      date: r.finished_at,
                      status:
                        r.status === 'reading' || r.status === 'dropped' ? r.status : 'finished',
                    })}</span
                  >
                  {#if r.rating !== null}<span class="r">★ {Number(r.rating)}</span>{/if}
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <p class="memo" aria-label={ko.detail.memoLabel}>{memo}</p>
      <div class="row-btns">
        <button type="button" class="btn" onclick={onedit}>{ko.detail.edit}</button>
        {#if canBookOfYear}
          <button
            type="button"
            class="btn accent"
            aria-pressed={sel.isBookOfYear}
            onclick={onbookofyear}
          >
            {sel.isBookOfYear ? ko.detail.unmakeBookOfYear : ko.detail.makeBookOfYear}
          </button>
        {/if}
      </div>
    {:else}
      <EmptyState message={ko.detail.noSelection} />
    {/if}
  </section>

  <section class="block">
    <div class="block-h">
      <h3 class="display">{ko.detail.glance(year)}</h3>
      <a href="#/compare">{ko.detail.toCompare}</a>
    </div>
    <div class="stats">
      <div class="stat">
        <span>{ko.detail.statBooks}</span><b>{formatNumber(spines.length)}{ko.top.books}</b>
      </div>
      <div class="stat"><span>{ko.detail.statPages}</span><b>{formatNumber(pages)}</b></div>
      <div class="stat">
        <span>{ko.detail.statRating}</span><b
          >{rating === null ? ko.detail.none : rating.toFixed(1)}</b
        >
      </div>
      <div class="stat">
        <span>{ko.detail.statTop}</span><b class="top">{top ?? ko.detail.none}</b>
      </div>
    </div>
    <MonthBars {bars} label={ko.detail.monthsLabel(year)} />
  </section>

  <section class="block">
    <YearRings {shelves} {year} />
  </section>
</aside>

<style>
  /* 시안 '상세 패널' 절을 옮김 */
  .detail {
    background: var(--panel);
    border-left: 1px solid var(--line);
    padding: 28px clamp(20px, 2vw, 32px) 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
  }
  .detail-close {
    display: none;
  }
  .selected {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .selected :global(.empty) {
    min-height: 174px;
    border: 1px dashed var(--line);
    border-radius: var(--radius-l);
  }
  /* 시안 '선택한 책' 절을 옮김 */
  .sel-head {
    display: flex;
    gap: 18px;
    align-items: flex-end;
  }
  .big-cover {
    flex: none;
    width: 120px;
    height: 174px;
    border-radius: 2px 6px 6px 2px;
    background: var(--art);
    color: var(--fgc);
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    box-shadow:
      inset 6px 0 0 rgba(0, 0, 0, 0.15),
      var(--book-shadow);
    position: relative;
  }
  .big-cover.image {
    padding: 0;
    background: var(--card);
  }
  .big-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* 실제 표지 위에도 제본선 그림자 */
  .big-cover.image::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: inset 6px 0 0 rgba(0, 0, 0, 0.15);
    pointer-events: none;
  }
  .big-cover b {
    font-family: var(--font-display);
    font-weight: var(--display-weight);
    font-size: 15px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .big-cover small {
    font-size: 10px;
    opacity: 0.85;
  }
  .sel-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .sel-info h3 {
    margin: 0;
    font-size: 22px;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  .author {
    font-size: 13px;
    color: var(--muted);
  }
  .tag {
    align-self: flex-start;
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-ink);
    background: var(--accent);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .facts {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .facts div {
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--card);
    border: 1px solid var(--line);
    min-width: 0;
  }
  .facts dt {
    font-size: 11px;
    color: var(--muted);
  }
  .facts dd {
    margin: 2px 0 0;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .reads {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .reads ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .reads button {
    width: 100%;
    min-height: 40px;
    padding: 0 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
  }
  .reads button[aria-current='true'] {
    border-color: var(--accent);
    font-weight: 700;
  }
  .reads .r {
    color: var(--accent);
  }
  /* 공책 줄 메모 (DESIGN 7.3) */
  .memo {
    margin: 0;
    padding: 6px 4px;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 16px;
    line-height: 32px;
    min-height: 76px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: repeating-linear-gradient(
      transparent,
      transparent 31px,
      var(--line) 31px,
      var(--line) 32px
    );
  }
  .row-btns {
    display: flex;
    gap: 8px;
  }
  .btn {
    flex: 1;
    height: 44px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
  }
  .btn.accent {
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
    background: transparent;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 22px;
    border-top: 1px solid var(--line);
  }
  .block-h {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .block-h h3 {
    margin: 0;
    font-size: 18px;
  }
  .block-h a {
    font-size: 12px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .stat {
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--card);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
  }
  .stat span {
    font-size: 12px;
    color: var(--muted);
  }
  .stat b {
    font-family: var(--font-display);
    font-weight: var(--display-weight);
    font-size: 24px;
    line-height: 1.3;
  }
  .stat b.top {
    font-size: 18px;
    line-height: 1.75;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 900~1199px: 오른쪽에서 밀려 나오는 서랍 (DESIGN 5.2) */
  @media (max-width: 1199px) {
    .detail {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      height: auto;
      width: min(400px, 92vw);
      z-index: 30;
      transform: translateX(100%);
      visibility: hidden;
      transition:
        transform 0.3s,
        visibility 0.3s;
      box-shadow: -20px 0 40px rgba(0, 0, 0, 0.3);
    }
    .detail.open {
      transform: none;
      visibility: visible;
    }
    .detail-close {
      display: flex;
      align-self: flex-end;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: var(--card);
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex: none;
    }
  }
  /* 900px 미만: 책장 아래로 내려옴 */
  @media (max-width: 899px) {
    .detail {
      position: static;
      width: auto;
      height: auto;
      transform: none;
      visibility: visible;
      transition: none;
      box-shadow: none;
      border-left: 0;
      border-top: 1px solid var(--line);
      padding: 24px 16px 40px;
      overflow: visible;
    }
    .detail-close {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .detail {
      transition: none;
    }
  }
</style>
