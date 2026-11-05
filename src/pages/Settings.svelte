<script lang="ts">
  import GoalProgress from '../components/GoalProgress.svelte';
  import { auth } from '../lib/auth.svelte';
  import { BookApiError, searchBooks } from '../lib/bookApi';
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import { CATEGORIES, DEFAULT_PATTERN_MAP, PATTERNS, type Pattern } from '../lib/spine/patterns';
  import { categoryCounts, shelfOf } from '../lib/stats';
  import type { SpineStyle, ThemePref } from '../lib/theme';

  // 설정 (PRD F10, DESIGN 10장): 보기, 분야와 책등 무늬, 도서 검색 연결, 백업, 계정
  const THEMES: { value: ThemePref; label: string }[] = [
    { value: 'system', label: ko.settings.themeSystem },
    { value: 'study', label: ko.side.themeStudy },
    { value: 'paper', label: ko.side.themePaper },
  ];
  const SPINES: { value: SpineStyle; label: string }[] = [
    { value: 'generated', label: ko.side.spineGenerated },
    { value: 'texture', label: ko.side.spineTexture },
  ];
  const PATTERN_LABEL: Record<Pattern, string> = {
    hardcover: ko.form.patternHardcover,
    paperback: ko.form.patternPaperback,
    label: ko.form.patternLabel,
  };

  // ── 분야: 24개 분야 + 책에 쓰인 다른 분야, 권수
  const counts = $derived(categoryCounts(library.books));
  const categories = $derived([
    ...CATEGORIES,
    ...[...counts.keys()]
      .filter((c) => !(CATEGORIES as readonly string[]).includes(c))
      .sort((a, b) => a.localeCompare(b, 'ko')),
  ]);
  const defaultOf = (c: string): Pattern => DEFAULT_PATTERN_MAP[c] ?? 'label';

  function setPattern(category: string, value: string) {
    const map = { ...library.patternMap };
    if (value === '' || value === defaultOf(category)) delete map[category];
    else map[category] = value as Pattern;
    void library.savePatternMap(map);
  }

  let renaming = $state<string | null>(null);
  let newName = $state('');
  let renameMessage = $state<string | null>(null);
  async function rename() {
    const from = renaming;
    const to = newName.trim();
    if (!from || !to || to === from) return;
    if (await library.renameCategory(from, to)) renameMessage = ko.settings.renamed(from, to);
    renaming = null;
  }

  // ── 도서 검색 연결 확인
  let checkState = $state<string | null>(null);
  async function check() {
    checkState = ko.settings.checking;
    try {
      const items = await searchBooks('데미안');
      checkState = ko.settings.connected(items.length);
    } catch (e) {
      checkState =
        e instanceof BookApiError && e.kind === 'denied'
          ? ko.settings.deniedCheck
          : ko.settings.unavailableCheck;
    }
  }

  const thisYear = new Date().getFullYear();
  const booksThisYear = $derived(shelfOf(library.shelves, thisYear)?.count ?? 0);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<h1 class="display page-title">{ko.pages.settings}</h1>

<div class="stack">
  <section class="card" aria-labelledby="set-view">
    <h2 class="display" id="set-view">{ko.settings.view}</h2>
    <fieldset>
      <legend class="label">{ko.settings.theme}</legend>
      <div class="opts">
        {#each THEMES as t (t.value)}
          <label>
            <input
              type="radio"
              name="theme"
              value={t.value}
              checked={prefs.themePref === t.value}
              onchange={() => library.chooseTheme(t.value)}
            />{t.label}
          </label>
        {/each}
      </div>
    </fieldset>
    <fieldset>
      <legend class="label">{ko.settings.spine}</legend>
      <div class="opts">
        {#each SPINES as s (s.value)}
          <label>
            <input
              type="radio"
              name="spine"
              value={s.value}
              checked={prefs.spine === s.value}
              onchange={() => library.chooseSpine(s.value)}
            />{s.label}
          </label>
        {/each}
      </div>
      <p class="hint">{ko.settings.textureHint}</p>
      {#if library.textureJob}
        <label class="progress">
          <span>{ko.settings.textureMaking(library.textureJob.done, library.textureJob.total)}</span
          >
          <progress max={library.textureJob.total} value={library.textureJob.done}></progress>
        </label>
      {/if}
    </fieldset>
    <p class="hint">{ko.settings.themeHint}</p>
    <label class="check">
      <input
        type="checkbox"
        checked={prefs.reduceMotion}
        onchange={(e) => prefs.setReduceMotion(e.currentTarget.checked)}
        aria-describedby="motion-hint"
      />
      <span>{ko.settings.motion}</span>
    </label>
    <p id="motion-hint" class="hint">{ko.settings.motionHint}</p>
  </section>

  <section class="card" aria-labelledby="set-goal">
    <h2 class="display" id="set-goal">{ko.goal.title}</h2>
    <p class="hint">{ko.goal.settingsHint}</p>
    <GoalProgress
      year={thisYear}
      books={booksThisYear}
      goal={library.goalOf(thisYear)}
      onsave={(g) => library.saveReadingGoal(thisYear, g)}
    />
  </section>

  <section class="card" aria-labelledby="set-cat">
    <h2 class="display" id="set-cat">{ko.settings.categories}</h2>
    <p class="hint">{ko.settings.categoriesHint}</p>
    {#if renameMessage}<p role="status" class="msg">{renameMessage}</p>{/if}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{ko.settings.category}</th>
            <th scope="col" class="num">{ko.settings.books}</th>
            <th scope="col">{ko.settings.pattern}</th>
            <th scope="col"><span class="sr">{ko.settings.rename}</span></th>
          </tr>
        </thead>
        <tbody>
          {#each categories as c (c)}
            {@const n = counts.get(c) ?? 0}
            <tr>
              <th scope="row">
                {#if renaming === c}
                  <form
                    class="rename"
                    onsubmit={(e) => {
                      e.preventDefault();
                      void rename();
                    }}
                  >
                    <input bind:value={newName} aria-label={ko.settings.renameTo(c)} />
                    <button type="submit" class="mini">{ko.settings.renameApply}</button>
                    <button type="button" class="mini" onclick={() => (renaming = null)}
                      >{ko.settings.renameCancel}</button
                    >
                  </form>
                {:else}
                  {c}
                {/if}
              </th>
              <td class="num">{n}</td>
              <td>
                <select
                  aria-label={`${c} ${ko.settings.pattern}`}
                  value={library.patternMap[c] ?? ''}
                  onchange={(e) => setPattern(c, e.currentTarget.value)}
                >
                  <option value="">{ko.settings.patternDefault(PATTERN_LABEL[defaultOf(c)])}</option
                  >
                  {#each PATTERNS as p (p)}<option value={p}>{PATTERN_LABEL[p]}</option>{/each}
                </select>
              </td>
              <td>
                {#if n > 0 && renaming !== c}
                  <button
                    type="button"
                    class="mini"
                    aria-label={`${c} ${ko.settings.rename}`}
                    onclick={() => {
                      renaming = c;
                      newName = c;
                      renameMessage = null;
                    }}>{ko.settings.rename}</button
                  >
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="card" aria-labelledby="set-conn">
    <h2 class="display" id="set-conn">{ko.settings.connection}</h2>
    <p class="hint">{ko.settings.connectionHint}</p>
    <div class="row">
      <button type="button" class="btn" onclick={check}>{ko.settings.check}</button>
      {#if checkState}<span role="status">{checkState}</span>{/if}
    </div>
  </section>

  <section class="card" aria-labelledby="set-backup">
    <h2 class="display" id="set-backup">{ko.settings.backup}</h2>
    <p class="hint">{ko.backup.last(library.lastBackupAt ? fmt(library.lastBackupAt) : null)}</p>
    <a href="#/import" class="btn link">{ko.settings.toBackup}</a>
  </section>

  <section class="card" aria-labelledby="set-account">
    <h2 class="display" id="set-account">{ko.settings.account}</h2>
    <p><span class="hint">{ko.settings.email}</span> {auth.session?.user.email ?? ''}</p>
    <button type="button" class="btn" onclick={() => auth.signOut()}>{ko.settings.logout}</button>
  </section>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 820px;
    min-width: 0;
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
  p {
    margin: 0;
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
  }
  .msg {
    font-weight: 700;
    font-size: 14px;
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
  }
  .opts label,
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    font-size: 14px;
    cursor: pointer;
  }
  .check {
    font-weight: 700;
  }
  input[type='radio'],
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
  .progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }
  progress {
    width: 100%;
    accent-color: var(--accent);
  }
  .table-wrap {
    overflow-x: auto;
    max-height: 480px;
    overflow-y: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 14px;
  }
  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    white-space: nowrap;
  }
  thead th {
    position: sticky;
    top: 0;
    background: var(--card);
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }
  th[scope='row'] {
    font-weight: 500;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  select,
  .rename input {
    height: 36px;
    padding: 0 8px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
  }
  .rename {
    display: flex;
    gap: 6px;
  }
  .rename input {
    width: 140px;
  }
  .mini {
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    font-size: 12px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    font-size: 14px;
  }
  .btn {
    align-self: flex-start;
    height: 44px;
    padding: 0 16px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
  }
  .link {
    text-decoration: none;
  }
</style>
