<script lang="ts">
  import { lookupBook, searchBooks } from '../lib/bookApi';
  import {
    decodeCsv,
    FIELDS,
    isGoodreads,
    parseCsv,
    readRows,
    suggestMapping,
    type CsvEncoding,
    type CsvRow,
    type Mapping,
  } from '../lib/csv';
  import { ko } from '../lib/i18n/ko';
  import {
    chooseCandidate,
    duplicateOf,
    NO_SUPPLEMENT,
    planImport,
    runPool,
    supplementRow,
    type DuplicateAction,
    type Supplement,
  } from '../lib/importer';
  import { library } from '../lib/library.svelte';
  import { status } from '../lib/status.svelte';
  import { runImport, type ImportProgress } from '../lib/transfer';

  // CSV 가져오기 (PRD F3): 파일 → 인코딩 확인 → 열 맞추기 → 보충 조회 → 미리 보기 → 가져오기
  type Step = 'file' | 'map' | 'lookup' | 'preview' | 'saving' | 'done';
  type Item = {
    row: CsvRow;
    supplement: Supplement;
    excluded: boolean;
    duplicateAction: DuplicateAction;
    /** 고른 후보 순번(-1: 고르지 않음) */
    chosen: number;
  };

  const api = { search: searchBooks, lookup: lookupBook };

  let step = $state<Step>('file');
  let error = $state<string | null>(null);
  let bytes: Uint8Array | null = null;
  let encoding = $state<CsvEncoding>('utf-8');
  let headers = $state.raw<string[]>([]);
  let cells = $state.raw<string[][]>([]);
  let mapping = $state<Mapping>(suggestMapping([]));
  let goodreads = $state(false);
  let items = $state<Item[]>([]);
  let progress = $state({ done: 0, total: 0 });
  let stopped = $state(false);
  let ctrl: AbortController | null = null;
  let withCovers = $state(true);
  let saving = $state<ImportProgress | null>(null);
  let result = $state<Awaited<ReturnType<typeof runImport>> | null>(null);

  const read = $derived(readRows(cells, mapping, { goodreads }));
  const sample = $derived(cells.slice(0, 3));

  function decode(enc?: CsvEncoding) {
    if (!bytes) return;
    const decoded = decodeCsv(bytes, enc);
    encoding = decoded.encoding;
    const parsed = parseCsv(decoded.text);
    headers = parsed.headers;
    cells = parsed.rows;
    mapping = suggestMapping(headers);
    goodreads = isGoodreads(headers);
  }

  async function pickFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    error = null;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
      decode();
    } catch {
      error = ko.csv.readError;
      return;
    }
    if (headers.length === 0 || cells.length === 0) {
      error = ko.csv.empty;
      return;
    }
    step = 'map';
  }

  function toItems(): Item[] {
    return read.rows.map((row) => ({
      row,
      supplement: NO_SUPPLEMENT,
      excluded: false,
      duplicateAction: 'skip',
      chosen: -1,
    }));
  }

  async function lookup() {
    items = toItems();
    step = 'lookup';
    stopped = false;
    ctrl = new AbortController();
    progress = { done: 0, total: items.length };
    await runPool(
      items,
      async (item, i) => {
        const s = await supplementRow($state.snapshot(item.row), api);
        items[i]!.supplement = s;
      },
      { signal: ctrl.signal, onProgress: (done) => (progress.done = done) },
    );
    stopped = ctrl.signal.aborted;
    step = 'preview';
  }

  function skipLookup() {
    items = toItems();
    stopped = false;
    step = 'preview';
  }

  async function choose(i: number, idx: number) {
    const item = items[i]!;
    item.chosen = idx;
    const candidates = item.supplement.candidates;
    const picked = candidates[idx];
    if (!picked) {
      item.supplement = { state: 'candidates', info: null, candidates };
      return;
    }
    const s = await chooseCandidate($state.snapshot(picked), api);
    item.supplement = { ...s, candidates };
  }

  const dups = $derived(
    items.map((it) => duplicateOf(it.row, it.supplement, library.books)?.title ?? null),
  );
  const counts = $derived({
    total: items.length,
    enriched: items.filter((it) => it.supplement.state === 'enriched').length,
    candidates: items.filter((it) => it.supplement.state === 'candidates').length,
    notfound: items.filter((it) => it.supplement.state === 'notfound').length,
    duplicates: dups.filter(Boolean).length,
  });
  const steps = $derived(
    planImport(
      items.map((it) => ({
        row: it.row,
        supplement: it.supplement,
        excluded: it.excluded,
        duplicateAction: it.duplicateAction,
      })),
      library.books,
    ),
  );
  const toRun = $derived(steps.filter((s) => s.kind !== 'skip').length);

  function setAllDuplicates(action: DuplicateAction) {
    items.forEach((it, i) => {
      if (dups[i]) it.duplicateAction = action;
    });
  }

  async function run() {
    error = null;
    step = 'saving';
    status.save = 'saving';
    try {
      result = await runImport($state.snapshot(steps), library.readings, {
        covers: withCovers,
        onProgress: (p) => (saving = p),
      });
      status.save = 'saved';
      await library.load();
      step = 'done';
    } catch (e) {
      console.warn('가져오지 못했어요', e);
      status.save = 'error';
      error = ko.csv.failed;
      step = 'preview';
    }
  }

  function reset() {
    step = 'file';
    items = [];
    headers = [];
    cells = [];
    bytes = null;
    result = null;
    error = null;
  }

  const stateLabel = (s: Supplement['state']) => ko.csv.state[s];
  const when = (row: CsvRow) =>
    row.status === 'reading'
      ? ko.csv.reading
      : row.status === 'dropped'
        ? ko.csv.dropped
        : (row.finishedAt ?? '–') + (row.dateApprox ? ' (일 미상)' : '');
</script>

<section class="card" aria-labelledby="csv-title">
  <h2 class="display" id="csv-title">{ko.csv.title}</h2>
  <p class="hint">{ko.csv.intro}</p>

  {#if error}<p class="error" role="alert">{error}</p>{/if}

  {#if step === 'file'}
    <label class="file btn-primary">
      {ko.csv.pick}
      <input type="file" accept=".csv,text/csv" onchange={pickFile} />
    </label>
  {:else if step === 'map'}
    <div class="row">
      <label for="csv-enc" class="label">{ko.csv.encoding}</label>
      <select
        id="csv-enc"
        value={encoding}
        onchange={(e) => decode(e.currentTarget.value as CsvEncoding)}
        aria-describedby="csv-enc-hint"
      >
        <option value="utf-8">{ko.csv.utf8}</option>
        <option value="euc-kr">{ko.csv.cp949}</option>
      </select>
      <span class="hint" id="csv-enc-hint">{ko.csv.encodingHint}</span>
    </div>

    <div class="table-wrap">
      <table class="sample" aria-label={ko.csv.sample}>
        <thead>
          <tr
            >{#each headers as h, i (i)}<th scope="col">{h}</th>{/each}</tr
          >
        </thead>
        <tbody>
          {#each sample as r, ri (ri)}
            <tr
              >{#each headers.keys() as ci (ci)}<td>{r[ci] ?? ''}</td>{/each}</tr
            >
          {/each}
        </tbody>
      </table>
    </div>

    <fieldset class="mapping">
      <legend class="label">{ko.csv.mapping}</legend>
      <p class="hint">{ko.csv.mappingHint}</p>
      {#if goodreads}<p class="note">{ko.csv.goodreads}</p>{/if}
      <div class="grid">
        {#each FIELDS as f (f)}
          <label for="map-{f}">{ko.csv.fields[f]}{f === 'title' ? ' *' : ''}</label>
          <select id="map-{f}" bind:value={mapping[f]}>
            <option value={null}>{ko.csv.none}</option>
            {#each headers as h, i (i)}<option value={i}>{h || `${i + 1}번째 열`}</option>{/each}
          </select>
        {/each}
      </div>
    </fieldset>

    {#if mapping.title === null}
      <p class="error" role="alert">{ko.csv.required}</p>
    {:else}
      <p class="hint">{ko.csv.rowsInfo(read.rows.length, read.skipped.length)}</p>
    {/if}
    <p class="hint">{ko.csv.lookupHint}</p>
    <div class="actions">
      <button type="button" class="btn" onclick={reset}>{ko.csv.back}</button>
      <button
        type="button"
        class="btn"
        disabled={mapping.title === null || read.rows.length === 0}
        onclick={skipLookup}>{ko.csv.skipLookup}</button
      >
      <button
        type="button"
        class="btn-primary"
        disabled={mapping.title === null || read.rows.length === 0}
        onclick={lookup}>{ko.csv.toLookup}</button
      >
    </div>
  {:else if step === 'lookup'}
    <label class="progress">
      <span>{ko.csv.lookingUp(progress.done, progress.total)}</span>
      <progress max={progress.total} value={progress.done}></progress>
    </label>
    <div class="actions">
      <button type="button" class="btn" onclick={() => ctrl?.abort()}>{ko.csv.stop}</button>
    </div>
  {:else if step === 'preview'}
    <h3 class="sub">{ko.csv.preview}</h3>
    {#if stopped}<p class="note">{ko.csv.stopped}</p>{/if}
    <p class="hint" aria-live="polite">{ko.csv.summary(counts)}</p>
    {#if counts.duplicates > 0}
      <div class="row">
        <label for="dup-all" class="label">{ko.csv.dupAll}</label>
        <select
          id="dup-all"
          onchange={(e) => setAllDuplicates(e.currentTarget.value as DuplicateAction)}
        >
          <option value="skip">{ko.csv.dup.skip}</option>
          <option value="addReading">{ko.csv.dup.addReading}</option>
          <option value="overwrite">{ko.csv.dup.overwrite}</option>
        </select>
      </div>
    {/if}
    <div class="table-wrap">
      <table class="preview">
        <thead>
          <tr>
            <th scope="col"><span class="sr">{ko.csv.includeCol}</span></th>
            <th scope="col">{ko.csv.line}</th>
            <th scope="col">{ko.csv.book}</th>
            <th scope="col">{ko.csv.finished}</th>
            <th scope="col">{ko.csv.rating}</th>
            <th scope="col">{ko.csv.status}</th>
          </tr>
        </thead>
        <tbody>
          {#each items as item, i (item.row.line)}
            <tr class:excluded={item.excluded}>
              <td>
                <input
                  type="checkbox"
                  checked={!item.excluded}
                  onchange={(e) => (item.excluded = !e.currentTarget.checked)}
                  aria-label={ko.csv.include(item.row.line)}
                />
              </td>
              <td class="num">{item.row.line}</td>
              <td
                ><div class="book">
                  <b>{item.row.title}</b>
                  {#if item.row.author}<span class="muted">{item.row.author}</span>{/if}
                  {#each item.row.problems as p (p)}
                    <span class="warn">{ko.csv.problems[p as keyof typeof ko.csv.problems]}</span>
                  {/each}
                  {#if dups[i]}
                    <span class="dup">
                      {ko.csv.duplicate(dups[i]!)}
                      <select
                        aria-label={`${item.row.line}번째 줄 ${ko.csv.dupAction}`}
                        bind:value={item.duplicateAction}
                      >
                        <option value="skip">{ko.csv.dup.skip}</option>
                        <option value="addReading">{ko.csv.dup.addReading}</option>
                        <option value="overwrite">{ko.csv.dup.overwrite}</option>
                      </select>
                    </span>
                  {/if}
                </div></td
              >
              <td>{when(item.row)}</td>
              <td class="num">{item.row.rating ?? '–'}</td>
              <td>
                <span class="badge {item.supplement.state}"
                  >{stateLabel(item.supplement.state)}</span
                >
                {#if item.supplement.candidates.length > 0}
                  <select
                    aria-label={`${item.row.line}번째 줄 ${ko.csv.choose}`}
                    value={item.chosen}
                    onchange={(e) => choose(i, Number(e.currentTarget.value))}
                  >
                    <option value={-1}>{ko.csv.chooseNone}</option>
                    {#each item.supplement.candidates as c, ci (ci)}
                      <option value={ci}>{ko.csv.candidate(c)}</option>
                    {/each}
                  </select>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <label class="check">
      <input type="checkbox" bind:checked={withCovers} />
      {ko.csv.covers}
    </label>
    <div class="actions">
      <button type="button" class="btn" onclick={reset}>{ko.csv.again}</button>
      <button type="button" class="btn-primary" disabled={toRun === 0} onclick={run}>
        {toRun === 0 ? ko.csv.nothing : ko.csv.run(toRun)}
      </button>
    </div>
  {:else if step === 'saving'}
    <label class="progress">
      <span
        >{saving?.phase === 'covers'
          ? ko.csv.savingCovers(saving.done, saving.total)
          : ko.csv.saving}</span
      >
      <progress max={saving?.total ?? 1} value={saving?.done ?? 0}></progress>
    </label>
  {:else if step === 'done' && result}
    <p class="done" role="status">{ko.csv.done(result)}</p>
    {#if result.coverFailed > 0}<p class="hint">{ko.csv.coverFailed(result.coverFailed)}</p>{/if}
    <div class="actions">
      <a class="btn-primary" href="#/">{ko.csv.toShelf}</a>
      <button type="button" class="btn" onclick={reset}>{ko.csv.again}</button>
    </div>
  {/if}
</section>

<style>
  .card {
    padding: 22px 24px;
    border-radius: var(--radius-l);
    background: var(--card);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .sub {
    margin: 0;
    font-size: 16px;
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .note {
    margin: 0;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: var(--radius-s);
    background: var(--accent-soft);
  }
  .error {
    margin: 0;
    font-size: 14px;
    color: var(--text);
    padding: 8px 12px;
    border-radius: var(--radius-s);
    border: 1px solid var(--accent);
  }
  .done {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .file {
    position: relative;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }
  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .file:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }
  select {
    height: 40px;
    padding: 0 10px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    max-width: 100%;
  }
  .mapping {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: max-content minmax(0, 260px);
    gap: 8px 14px;
    align-items: center;
  }
  .table-wrap {
    overflow-x: auto;
    max-height: 520px;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-s);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 13px;
  }
  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
  }
  th {
    position: sticky;
    top: 0;
    background: var(--card);
    color: var(--muted);
    font-weight: 500;
    white-space: nowrap;
  }
  .sample td {
    white-space: nowrap;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .book {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 200px;
  }
  .muted {
    color: var(--muted);
  }
  .warn {
    font-size: 12px;
    color: var(--accent);
  }
  .dup {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    font-size: 12px;
    color: var(--accent);
  }
  .dup select,
  td select {
    height: 32px;
    font-size: 12px;
    margin-top: 4px;
    max-width: 260px;
  }
  tr.excluded td:not(:first-child) {
    opacity: 0.45;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    white-space: nowrap;
    border: 1px solid var(--line);
  }
  .badge.enriched {
    border-color: var(--success);
  }
  .badge.candidates,
  .badge.notfound,
  .badge.error {
    border-color: var(--accent);
    color: var(--accent);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    min-height: 44px;
  }
  .check input,
  td input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
  .progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
  }
  progress {
    width: 100%;
    height: 10px;
    accent-color: var(--accent);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }
  .btn {
    height: 44px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
  }
  .btn-primary {
    padding: 0 18px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 899px) {
    .card {
      padding: 18px 16px;
    }
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
