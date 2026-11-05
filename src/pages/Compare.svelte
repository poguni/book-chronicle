<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { formatNumber } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import { shelfOf } from '../lib/stats';
  import {
    categoryShares,
    change,
    monthlySeries,
    OTHER_CATEGORY,
    yearsWithBooks,
    yearStats,
    yearTrend,
    type YearStats,
  } from '../lib/stats';
  import { yearStyle } from '../lib/yearStyle';

  // 연도 비교 (PRD F5): 연도 칩 2~5개 → 지표 카드(증감) → 월별 선 그래프(누적) → 분야 100% 막대, 표로 보기
  const currentYear = new Date().getFullYear();
  const allYears = $derived(yearsWithBooks(library.shelves, currentYear));
  const minYears = $derived(Math.min(2, allYears.length));

  let picked = $state<number[] | null>(null);
  let notice = $state<string | null>(null);
  const selected = $derived(
    (picked ?? allYears.slice(0, 2)).filter((y) => allYears.includes(y)).sort((a, b) => b - a),
  );

  function toggle(year: number) {
    notice = null;
    const now = selected;
    if (now.includes(year)) {
      if (now.length <= minYears) notice = ko.compare.tooFew;
      else picked = now.filter((y) => y !== year);
    } else if (now.length >= 5) notice = ko.compare.tooMany;
    else picked = [...now, year];
  }

  const stats = $derived(selected.map((y) => yearStats(library.shelves, y)));
  const spinesOf = (y: number) => shelfOf(library.shelves, y)?.spines ?? [];

  let metric = $state<'books' | 'pages'>('books');
  let cumulative = $state(false);
  let asTable = $state(false);
  const metricLabel = $derived(
    metric === 'books' ? ko.compare.metricBooks : ko.compare.metricPages,
  );
  const unit = $derived(metric === 'books' ? ko.compare.unit.books : ko.compare.unit.pages);
  const monthly = $derived(
    selected.map((y) => ({ year: y, values: monthlySeries(spinesOf(y), metric, cumulative) })),
  );
  const shares = $derived(categoryShares(library.shelves, selected));
  const trend = $derived(yearTrend(library.shelves, currentYear));
  let trendMetric = $state<'books' | 'pages'>('books');
  const trendLabel = $derived(
    trendMetric === 'books' ? ko.compare.metricBooks : ko.compare.metricPages,
  );
  const trendUnit = $derived(
    trendMetric === 'books' ? ko.compare.unit.books : ko.compare.unit.pages,
  );
  const styleOf = (y: number) => yearStyle(allYears, y);

  // ── 지표 카드
  type Metric = keyof typeof ko.compare.metrics;
  const METRICS: Metric[] = [
    'books',
    'totalPages',
    'averagePages',
    'averageRating',
    'thickest',
    'topCategory',
  ];
  function value(s: YearStats, m: Metric): string {
    if (m === 'books') return `${formatNumber(s.books)}${ko.compare.unit.books}`;
    if (m === 'totalPages') return `${formatNumber(s.totalPages)}${ko.compare.unit.pages}`;
    if (m === 'averagePages')
      return s.averagePages === null
        ? '–'
        : `${formatNumber(s.averagePages)}${ko.compare.unit.pages}`;
    if (m === 'averageRating')
      return s.averageRating === null
        ? '–'
        : `${s.averageRating.toFixed(1)}${ko.compare.unit.rating}`;
    if (m === 'thickest')
      return s.thickest ? `${s.thickest.title} · ${formatNumber(s.thickest.pages)}쪽` : '–';
    return s.topCategory ?? '–';
  }
  function numberOf(s: YearStats, m: Metric): number | null {
    if (m === 'books') return s.books;
    if (m === 'totalPages') return s.totalPages;
    if (m === 'averagePages') return s.averagePages;
    if (m === 'averageRating') return s.averageRating;
    return null;
  }
  function delta(m: Metric): string | null {
    const [now, before] = stats;
    if (!now || !before) return null;
    const c = change(numberOf(now, m), numberOf(before, m));
    if (!c) return null;
    if (c.delta === 0) return ko.compare.same;
    const u =
      m === 'books'
        ? ko.compare.unit.books
        : m === 'averageRating'
          ? ko.compare.unit.rating
          : ko.compare.unit.pages;
    const d = `${formatNumber(Math.abs(c.delta))}${u}`;
    return c.delta > 0 ? ko.compare.up(d, c.percent) : ko.compare.down(d, c.percent);
  }

  // ── 그래프 (Chart.js는 이 화면에서만 불러옴)
  let charts = $state.raw<typeof import('../lib/charts') | null>(null);
  $effect(() => {
    void import('../lib/charts').then((m) => (charts = m));
  });
  const reduceMotion = () =>
    prefs.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lineChart: Attachment<HTMLCanvasElement> = (canvas) => {
    if (!charts) return;
    void prefs.theme; // 테마를 바꾸면 다시 그림
    const t = charts.chartTheme();
    charts.Chart.defaults.font.family = t.font;
    const chart = new charts.Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => ko.compare.month(i + 1)),
        datasets: monthly.map(({ year, values }) => {
          const st = styleOf(year);
          const color = t.series[st.slot - 1]!;
          return {
            label: String(year),
            data: values,
            borderColor: color,
            backgroundColor: color,
            borderDash: st.dash,
            borderWidth: 2,
            pointStyle: st.point,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderColor: t.surface,
            pointBorderWidth: 2,
            tension: 0,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion() ? false : { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface,
            titleColor: t.text,
            bodyColor: t.text,
            borderColor: t.line,
            borderWidth: 1,
            usePointStyle: true,
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}년: ${formatNumber(Number(ctx.parsed.y))}${unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: t.muted, maxRotation: 0, autoSkipPadding: 6 },
            border: { color: t.line },
          },
          y: {
            beginAtZero: true,
            ticks: { color: t.muted, precision: 0 },
            grid: { color: t.line },
            border: { display: false },
          },
        },
      },
    });
    return () => chart.destroy();
  };

  const barChart: Attachment<HTMLCanvasElement> = (canvas) => {
    if (!charts) return;
    void prefs.theme;
    const t = charts.chartTheme();
    const { categories, rows } = shares;
    const chart = new charts.Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map((r) => `${r.year}`),
        datasets: categories.map((c, i) => ({
          label: c,
          data: rows.map((r) => (r.total > 0 ? (r.counts[i]! / r.total) * 100 : 0)),
          backgroundColor: c === OTHER_CATEGORY ? t.other : t.series[i % 7]!,
          borderColor: t.surface,
          borderWidth: 2,
          borderSkipped: false,
          barThickness: 28,
        })),
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion() ? false : { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface,
            titleColor: t.text,
            bodyColor: t.text,
            borderColor: t.line,
            borderWidth: 1,
            callbacks: {
              title: (items) => `${items[0]?.label ?? ''}년`,
              label: (ctx) => {
                const r = rows[ctx.dataIndex]!;
                return ` ${ctx.dataset.label}: ${r.counts[ctx.datasetIndex]}권 (${Math.round(Number(ctx.parsed.x))}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            max: 100,
            ticks: { color: t.muted, callback: (v) => `${v}%` },
            grid: { color: t.line },
            border: { display: false },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: t.text },
            border: { color: t.line },
          },
        },
      },
    });
    return () => chart.destroy();
  };

  // 연도별 추이: 한 가지 값이라 색 하나. 비교 중인 연도는 진하게, 나머지는 옅게
  const trendChart: Attachment<HTMLCanvasElement> = (canvas) => {
    if (!charts) return;
    void prefs.theme;
    const t = charts.chartTheme();
    const faded = charts.withAlpha(t.accent, 0.35);
    const chart = new charts.Chart(canvas, {
      type: 'bar',
      data: {
        labels: trend.map((r) => String(r.year)),
        datasets: [
          {
            label: trendLabel,
            data: trend.map((r) => r[trendMetric]),
            backgroundColor: trend.map((r) => (selected.includes(r.year) ? t.accent : faded)),
            borderRadius: 4,
            borderSkipped: 'bottom',
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reduceMotion() ? false : { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: t.surface,
            titleColor: t.text,
            bodyColor: t.text,
            borderColor: t.line,
            borderWidth: 1,
            callbacks: {
              title: (items) => `${items[0]?.label ?? ''}년`,
              label: (ctx) => ` ${formatNumber(Number(ctx.parsed.y))}${trendUnit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: t.muted, maxRotation: 0, autoSkipPadding: 6 },
            border: { color: t.line },
          },
          y: {
            beginAtZero: true,
            ticks: { color: t.muted, precision: 0 },
            grid: { color: t.line },
            border: { display: false },
          },
        },
      },
    });
    return () => chart.destroy();
  };

  const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '–');
</script>

<h1 class="display page-title">{ko.pages.compare}</h1>
<p class="hint">{ko.compare.intro}</p>

<section aria-labelledby="years-label" class="years">
  <span class="label" id="years-label">{ko.compare.years}</span>
  <div class="chips" role="group" aria-labelledby="years-label">
    {#each allYears as y (y)}
      {@const st = styleOf(y)}
      <button
        type="button"
        class="chip"
        aria-pressed={selected.includes(y)}
        onclick={() => toggle(y)}
      >
        <svg width="22" height="10" aria-hidden="true">
          <line
            x1="1"
            y1="5"
            x2="21"
            y2="5"
            stroke="var(--series-{st.slot})"
            stroke-width="2.5"
            stroke-dasharray={st.dash.join(' ')}
          />
        </svg>
        {y}
      </button>
    {/each}
  </div>
  {#if notice}<p class="hint" role="status">{notice}</p>{/if}
  {#if allYears.length < 2}<p class="hint">{ko.compare.noYears}</p>{/if}
</section>

<section class="metrics" aria-label={ko.pages.compare}>
  {#each METRICS as m (m)}
    {@const d = delta(m)}
    <div class="metric">
      <h2>{ko.compare.metrics[m]}</h2>
      <dl>
        {#each stats as s, i (s.year)}
          <div class="mrow">
            <dt>{s.year}</dt>
            <dd>
              <span class="v">{value(s, m)}</span>
              {#if i === 0 && d && stats[1]}
                <span class="d" title={ko.compare.vs(stats[1].year)}>{d}</span>
              {/if}
              {#if m === 'books' && library.goalOf(s.year) !== null}
                {@const g = library.goalOf(s.year)!}
                <span class="g" class:done={s.books >= g}>{ko.goal.compare(g, s.books >= g)}</span>
              {/if}
            </dd>
          </div>
        {/each}
      </dl>
    </div>
  {/each}
</section>

<div class="view-toggle">
  <button type="button" class="chip" aria-pressed={asTable} onclick={() => (asTable = !asTable)}>
    {asTable ? ko.compare.chart : ko.compare.table}
  </button>
</div>

<section class="card" aria-labelledby="monthly-title">
  <div class="card-h">
    <h2 id="monthly-title" class="display">{ko.compare.monthly} {metricLabel}</h2>
    <div class="chips" role="group" aria-label={ko.compare.monthly}>
      <button
        type="button"
        class="chip"
        aria-pressed={metric === 'books'}
        onclick={() => (metric = 'books')}>{ko.compare.metricBooks}</button
      >
      <button
        type="button"
        class="chip"
        aria-pressed={metric === 'pages'}
        onclick={() => (metric = 'pages')}>{ko.compare.metricPages}</button
      >
      <button
        type="button"
        class="chip"
        aria-pressed={cumulative}
        onclick={() => (cumulative = !cumulative)}>{ko.compare.cumulative}</button
      >
    </div>
  </div>
  <ul class="legend">
    {#each selected as y (y)}
      {@const st = styleOf(y)}
      <li>
        <svg width="28" height="10" aria-hidden="true">
          <line
            x1="1"
            y1="5"
            x2="27"
            y2="5"
            stroke="var(--series-{st.slot})"
            stroke-width="2.5"
            stroke-dasharray={st.dash.join(' ')}
          />
        </svg>{y}
      </li>
    {/each}
  </ul>
  {#if asTable}
    <div class="table-wrap">
      <table>
        <caption class="sr">{ko.compare.monthlyLabel(metricLabel, cumulative, selected)}</caption>
        <thead>
          <tr>
            <th scope="col">{ko.compare.tableMonth}</th>
            {#each selected as y (y)}<th scope="col">{y}</th>{/each}
          </tr>
        </thead>
        <tbody>
          {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
            <tr>
              <th scope="row">{ko.compare.month(i + 1)}</th>
              {#each monthly as s (s.year)}<td>{formatNumber(s.values[i] ?? 0)}</td>{/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if charts}
    <div
      class="plot line"
      role="img"
      aria-label={ko.compare.monthlyLabel(metricLabel, cumulative, selected)}
    >
      {#key `${selected.join()}-${metric}-${cumulative}`}
        <canvas {@attach lineChart} aria-hidden="true"></canvas>
      {/key}
    </div>
  {:else}
    <p class="hint">{ko.compare.loading}</p>
  {/if}
</section>

<section class="card" aria-labelledby="cat-title">
  <div class="card-h"><h2 id="cat-title" class="display">{ko.compare.categories}</h2></div>
  {#if shares.categories.length === 0}
    <p class="hint">{ko.compare.noCategory}</p>
  {:else}
    <ul class="legend">
      {#each shares.categories as c, i (c)}
        <li>
          <span
            class="sq"
            style:background={c === OTHER_CATEGORY
              ? 'var(--series-other)'
              : `var(--series-${(i % 7) + 1})`}
          ></span>{c}
        </li>
      {/each}
    </ul>
    {#if asTable}
      <div class="table-wrap">
        <table>
          <caption class="sr">{ko.compare.categoriesLabel(selected)}</caption>
          <thead>
            <tr>
              <th scope="col">{ko.compare.tableYear}</th>
              {#each shares.categories as c (c)}<th scope="col">{c}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each shares.rows as r (r.year)}
              <tr>
                <th scope="row">{r.year}</th>
                {#each r.counts as n, i (i)}<td>{n}권 ({pct(n, r.total)})</td>{/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if charts}
      <div
        class="plot"
        role="img"
        aria-label={ko.compare.categoriesLabel(selected)}
        style:height="{shares.rows.length * 48 + 40}px"
      >
        {#key `${selected.join()}`}
          <canvas {@attach barChart} aria-hidden="true"></canvas>
        {/key}
      </div>
    {/if}
  {/if}
</section>

<section class="card" aria-labelledby="trend-title">
  <div class="card-h">
    <h2 id="trend-title" class="display">{ko.compare.trend} {trendLabel}</h2>
    <div class="chips" role="group" aria-label={ko.compare.trend}>
      <button
        type="button"
        class="chip"
        aria-pressed={trendMetric === 'books'}
        onclick={() => (trendMetric = 'books')}>{ko.compare.metricBooks}</button
      >
      <button
        type="button"
        class="chip"
        aria-pressed={trendMetric === 'pages'}
        onclick={() => (trendMetric = 'pages')}>{ko.compare.metricPages}</button
      >
    </div>
  </div>
  {#if asTable}
    <div class="table-wrap">
      <table>
        <caption class="sr"
          >{ko.compare.trendLabel(trendLabel, trend[0]!.year, trend.at(-1)!.year)}</caption
        >
        <thead>
          <tr>
            <th scope="col">{ko.compare.tableYear}</th>
            <th scope="col">{ko.compare.metricBooks}</th>
            <th scope="col">{ko.compare.metricPages}</th>
          </tr>
        </thead>
        <tbody>
          {#each trend as r (r.year)}
            <tr>
              <th scope="row">{r.year}</th>
              <td>{formatNumber(r.books)}</td>
              <td>{formatNumber(r.pages)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if charts}
    <p class="hint">{ko.compare.trendHint}</p>
    <div
      class="plot line"
      role="img"
      aria-label={ko.compare.trendLabel(trendLabel, trend[0]!.year, trend.at(-1)!.year)}
    >
      {#key `${selected.join()}-${trendMetric}`}
        <canvas {@attach trendChart} aria-hidden="true"></canvas>
      {/key}
    </div>
  {/if}
</section>

<style>
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .years {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    height: 40px;
    padding: 0 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .chip[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--text);
    font-weight: 700;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .metric {
    padding: 14px 16px;
    border-radius: var(--radius-m);
    background: var(--card);
    border: 1px solid var(--line);
    min-width: 0;
  }
  .metric h2 {
    margin: 0 0 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }
  dl {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mrow {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 8px;
    align-items: baseline;
  }
  dt {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  dd {
    margin: 0;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    align-items: baseline;
  }
  .v {
    font-family: var(--font-display);
    font-size: 18px;
    overflow-wrap: anywhere;
  }
  .d {
    font-size: 12px;
    color: var(--accent);
    font-weight: 700;
    white-space: nowrap;
  }
  .g {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }
  .g.done {
    color: var(--accent);
    font-weight: 700;
  }
  .view-toggle {
    display: flex;
    justify-content: flex-end;
  }
  .card {
    padding: 18px 20px;
    border-radius: var(--radius-l);
    background: var(--card);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .card-h {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px 16px;
  }
  .card-h h2 {
    margin: 0;
    font-size: 18px;
  }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    font-size: 13px;
    color: var(--text);
  }
  .legend li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sq {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    display: inline-block;
  }
  .plot {
    position: relative;
    min-width: 0;
  }
  .plot.line {
    height: 280px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--line);
    text-align: right;
    white-space: nowrap;
  }
  th[scope='row'],
  thead th:first-child {
    text-align: left;
  }
  thead th {
    color: var(--muted);
    font-weight: 500;
  }
  @media (max-width: 899px) {
    .card {
      padding: 14px;
    }
  }
</style>
