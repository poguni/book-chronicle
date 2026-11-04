<script lang="ts" module>
  /** 새 책 / 기록 고치기 / 같은 책 다시 읽기 */
  export type DialogMode =
    | { kind: 'new' }
    | { kind: 'edit'; bookId: string; readingId: string }
    | { kind: 'reread'; bookId: string };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import {
    emptyForm,
    formFromRows,
    validateForm,
    type BookFormErrors,
    type BookFormValues,
  } from '../lib/bookForm';
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { DEFAULT_PAGES, spineHeight } from '../lib/spine/geometry';
  import { CATEGORIES, patternFor, type Pattern } from '../lib/spine/patterns';
  import Book from './Book.svelte';
  import Icon from './Icon.svelte';
  import StarRating from './StarRating.svelte';

  // 책 꽂기·고치기 대화 상자 (DESIGN 11장). 알라딘 검색은 Phase 5에서 왼쪽에 붙입니다.
  let {
    mode,
    onclose,
    onchangemode,
  }: {
    mode: DialogMode;
    onclose: () => void;
    onchangemode: (mode: DialogMode) => void;
  } = $props();

  // 대화 상자를 열 때 한 번만 값을 채웁니다.
  const start = untrack(() => {
    if (mode.kind === 'new') {
      const bookId = crypto.randomUUID();
      return { bookId, readingId: null, values: emptyForm(bookId) };
    }
    const book = library.bookById(mode.bookId);
    const reading = mode.kind === 'edit' ? (library.readingById(mode.readingId) ?? null) : null;
    const values = book ? formFromRows(book, reading) : emptyForm(mode.bookId);
    if (mode.kind === 'reread') {
      values.finishedAt = '';
      values.rating = '';
      values.note = '';
      values.status = 'finished';
    }
    return { bookId: mode.bookId, readingId: reading?.id ?? null, values };
  });

  let values = $state<BookFormValues>(start.values);
  let errors = $state<BookFormErrors>({});
  let saveError = $state(false);
  let saving = $state(false);
  let paletteTouched = $state(false);
  let confirmingDelete = $state(false);

  // 분야: 목록에서 고르거나, 맨 위 "직접 입력"을 골라 적습니다(결정 0006).
  const CUSTOM = '__custom__';
  const isListed = (c: string) => (CATEGORIES as readonly string[]).includes(c);
  let categoryChoice = $state(isListed(start.values.category) ? start.values.category : CUSTOM);
  function chooseCategory(e: Event) {
    categoryChoice = (e.currentTarget as HTMLSelectElement).value;
    values.category = categoryChoice === CUSTOM ? '' : categoryChoice;
  }
  let dialog: HTMLDialogElement;

  const heading = $derived(
    mode.kind === 'new'
      ? ko.form.titleNew
      : mode.kind === 'edit'
        ? ko.form.titleEdit
        : ko.form.titleReread,
  );
  const onlyReading = $derived(mode.kind === 'edit' && library.readingsOf(mode.bookId).length <= 1);

  const submitLabel = $derived.by(() => {
    if (saving) return ko.form.saving;
    if (mode.kind === 'edit') return ko.form.submitEdit;
    if (values.status !== 'finished') return ko.form.submitRecord;
    const year = Number(values.finishedAt.slice(0, 4));
    return year ? ko.form.submitYear(year) : ko.form.submitUnknown;
  });

  const patterns: { value: Pattern | null; label: string }[] = [
    { value: null, label: ko.form.patternAuto },
    { value: 'hardcover', label: ko.form.patternHardcover },
    { value: 'paperback', label: ko.form.patternPaperback },
    { value: 'label', label: ko.form.patternLabel },
  ];

  const preview = $derived.by(() => {
    const pages = Number(values.pages.replace(/,/g, ''));
    const known = Number.isInteger(pages) && pages > 0;
    return {
      title: values.title.trim() || ko.form.title,
      author: values.author.trim() || null,
      pages: known ? pages : DEFAULT_PAGES,
      estimated: !known,
      height: spineHeight(start.bookId),
      palette: values.palette,
      pattern: patternFor(values.pattern, values.category.trim() || null, library.patternMap),
      status: 'finished' as const,
      finishedAt: null,
      isBookOfYear: false,
    };
  });

  $effect(() => {
    dialog.showModal();
  });

  async function onsubmit(e: SubmitEvent) {
    e.preventDefault();
    if (saving) return;
    const result = validateForm(values);
    if (!result.ok) {
      errors = result.errors;
      return;
    }
    errors = {};
    saving = true;
    saveError = false;
    const ok =
      mode.kind === 'new'
        ? await library.addBook(start.bookId, result.data, paletteTouched)
        : await library.saveEntry(start.bookId, start.readingId, result.data, paletteTouched);
    saving = false;
    if (ok) dialog.close();
    else saveError = true;
  }

  async function remove() {
    if (mode.kind !== 'edit' || saving) return;
    saving = true;
    saveError = false;
    const ok = await library.removeEntry(mode.bookId, mode.readingId);
    saving = false;
    if (ok) dialog.close();
    else saveError = true;
  }
</script>

<dialog bind:this={dialog} aria-label={heading} {onclose}>
  <form {onsubmit} novalidate>
    <header>
      <h2 class="display">{heading}</h2>
      <button
        type="button"
        class="icon-btn"
        aria-label={ko.form.close}
        onclick={() => dialog.close()}
      >
        <Icon name="close" strokeWidth={2} />
      </button>
    </header>

    <div class="body">
      <fieldset>
        <legend class="label">{ko.form.bookSection}</legend>
        <div class="field">
          <label for="f-title">{ko.form.title} <b aria-hidden="true">*</b></label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="f-title"
            bind:value={values.title}
            required
            maxlength="500"
            autofocus
            aria-invalid={errors.title ? 'true' : undefined}
            aria-describedby={errors.title ? 'err-title' : undefined}
          />
          {#if errors.title}<span class="err" id="err-title">{errors.title}</span>{/if}
        </div>
        <label class="field">
          <span>{ko.form.author}</span>
          <input bind:value={values.author} />
        </label>
        <label class="field">
          <span>{ko.form.publisher}</span>
          <input bind:value={values.publisher} />
        </label>
        <div class="two">
          <div class="field">
            <label for="f-pages">{ko.form.pages}</label>
            <input
              id="f-pages"
              bind:value={values.pages}
              inputmode="numeric"
              aria-invalid={errors.pages ? 'true' : undefined}
              aria-describedby="hint-pages{errors.pages ? ' err-pages' : ''}"
            />
            <span class="hint" id="hint-pages">{ko.form.pagesHint}</span>
            {#if errors.pages}<span class="err" id="err-pages">{errors.pages}</span>{/if}
          </div>
          <div class="field">
            <label for="f-category">{ko.form.category}</label>
            <select id="f-category" value={categoryChoice} onchange={chooseCategory}>
              <option value={CUSTOM}>{ko.form.categoryCustom}</option>
              {#each CATEGORIES as c (c)}<option value={c}>{c}</option>{/each}
            </select>
            {#if categoryChoice === CUSTOM}
              <input
                bind:value={values.category}
                aria-label={ko.form.categoryCustomLabel}
                placeholder={ko.form.categoryPlaceholder}
              />
            {/if}
          </div>
        </div>
      </fieldset>

      <div class="col">
        <fieldset>
          <legend class="label">{ko.form.spineSection}</legend>
          <div class="spine-edit">
            <div class="preview" inert aria-hidden="true">
              <div class="preview-shelf">
                <Book spine={preview} showTitle={true} tabindex={-1} />
              </div>
              <div class="preview-plank"></div>
            </div>
            <div class="spine-fields">
              <div class="colors">
                <label class="color">
                  <input
                    type="color"
                    bind:value={values.palette.base}
                    oninput={() => (paletteTouched = true)}
                  />
                  <span>{ko.form.base}</span>
                </label>
                <label class="color">
                  <input
                    type="color"
                    bind:value={values.palette.band}
                    oninput={() => (paletteTouched = true)}
                  />
                  <span>{ko.form.band}</span>
                </label>
                <label class="color">
                  <input
                    type="color"
                    bind:value={values.palette.accent}
                    oninput={() => (paletteTouched = true)}
                  />
                  <span>{ko.form.accent}</span>
                </label>
              </div>
              <div class="field">
                <label for="f-pattern">{ko.form.pattern}</label>
                <select id="f-pattern" bind:value={values.pattern}>
                  {#each patterns as p (p.label)}<option value={p.value}>{p.label}</option>{/each}
                </select>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend class="label">{ko.form.readingSection}</legend>
          <div class="two">
            <div class="field">
              <label for="f-status">{ko.form.status}</label>
              <select id="f-status" bind:value={values.status}>
                <option value="finished">{ko.form.statusFinished}</option>
                <option value="reading">{ko.form.statusReading}</option>
                <option value="dropped">{ko.form.statusDropped}</option>
              </select>
            </div>
            {#if values.status === 'finished'}
              <div class="field">
                <label for="f-date">{ko.form.finishedAt}</label>
                <input
                  id="f-date"
                  type="date"
                  min="1900-01-01"
                  max="2200-12-31"
                  bind:value={values.finishedAt}
                  aria-invalid={errors.finishedAt ? 'true' : undefined}
                  aria-describedby="hint-date{errors.finishedAt ? ' err-date' : ''}"
                />
                <span class="hint" id="hint-date">{ko.form.finishedAtHint}</span>
                {#if errors.finishedAt}<span class="err" id="err-date">{errors.finishedAt}</span
                  >{/if}
              </div>
            {/if}
          </div>
          <div class="field">
            <span class="field-label" id="f-rating-label">{ko.form.rating}</span>
            <StarRating
              bind:value={
                () => (values.rating === '' ? null : Number(values.rating)),
                (v) => (values.rating = v === null ? '' : String(v))
              }
              labelledby="f-rating-label"
              describedby={errors.rating ? 'err-rating' : undefined}
            />
            {#if errors.rating}<span class="err" id="err-rating">{errors.rating}</span>{/if}
          </div>
          <label class="field">
            <span>{ko.form.note}</span>
            <textarea bind:value={values.note} rows="2" placeholder={ko.form.notePlaceholder}
            ></textarea>
          </label>
        </fieldset>
      </div>
    </div>

    {#if saveError}
      <p class="save-error" role="alert">
        <Icon name="warning" size={16} strokeWidth={2} />{ko.form.errorSave}
      </p>
    {/if}

    <footer>
      {#if mode.kind === 'edit'}
        <div class="side-actions">
          {#if confirmingDelete}
            <span class="confirm" role="alert">
              {onlyReading ? ko.form.confirmDeleteBook : ko.form.confirmDeleteReading}
            </span>
            <button type="button" class="btn danger" onclick={remove} disabled={saving}>
              {ko.form.confirmYes}
            </button>
            <button type="button" class="btn" onclick={() => (confirmingDelete = false)}>
              {ko.form.cancel}
            </button>
          {:else}
            <button type="button" class="btn" onclick={() => (confirmingDelete = true)}>
              {onlyReading ? ko.form.deleteBook : ko.form.deleteReading}
            </button>
            <button
              type="button"
              class="btn"
              onclick={() => onchangemode({ kind: 'reread', bookId: start.bookId })}
            >
              {ko.form.reread}
            </button>
          {/if}
        </div>
      {/if}
      <div class="main-actions">
        <button type="button" class="btn" onclick={() => dialog.close()}>{ko.form.cancel}</button>
        <button type="submit" class="btn-primary" disabled={saving}>{submitLabel}</button>
      </div>
    </footer>
  </form>
</dialog>

<style>
  /* 가운데 대화 상자: 폭 720px, 모바일은 전체 화면 (DESIGN 11장) */
  dialog {
    width: min(720px, calc(100vw - 32px));
    max-height: calc(100dvh - 48px);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: var(--panel);
    color: var(--text);
    box-shadow: var(--book-shadow);
    overflow: auto;
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px 28px 28px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h2 {
    margin: 0;
    font-size: 22px;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 12px;
  }
  .two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    min-width: 0;
  }
  .field b {
    color: var(--accent);
  }
  .field select + input {
    margin-top: 6px;
  }
  .field input,
  .field select,
  .field textarea {
    min-height: 44px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    padding: 0 12px;
    font-size: 15px;
    color: var(--text);
    width: 100%;
    font-family: inherit;
  }
  .field textarea {
    padding: 10px 12px;
    resize: vertical;
    line-height: 1.5;
  }
  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .hint {
    font-size: 12px;
  }
  .err {
    font-size: 13px;
    color: var(--text);
  }
  [aria-invalid='true'] {
    border-color: var(--accent);
  }
  .spine-edit {
    display: flex;
    gap: 16px;
    align-items: stretch;
  }
  /* 760px 책장 위에 꽂힌 것과 같은 두께로 미리 보기 */
  .preview {
    --spine-k: 0.1444px;
    --spine-max: 68px;
    flex: none;
    width: 96px;
    display: flex;
    flex-direction: column;
  }
  .preview-shelf {
    flex: 1;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-top: 12px;
    min-height: calc(176 * var(--spine-hk) + 12px);
    background: var(--shelf-back);
    border-radius: 8px 8px 0 0;
  }
  .preview-plank {
    height: 8px;
    background: var(--plank);
    border-radius: 2px;
  }
  .spine-fields {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .colors {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .color {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
    cursor: pointer;
  }
  .color input {
    width: 44px;
    height: 44px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--card);
    cursor: pointer;
  }
  .save-error {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    padding: 10px 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--accent);
    background: var(--card);
  }
  .save-error :global(svg) {
    color: var(--accent);
    flex: none;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .side-actions,
  .main-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .main-actions {
    margin-left: auto;
  }
  .confirm {
    font-size: 13px;
    flex-basis: 100%;
  }
  .btn {
    height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    cursor: pointer;
    font-size: 14px;
  }
  .btn.danger {
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
    background: transparent;
  }
  .btn-primary:disabled,
  .btn:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  .icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: none;
  }
  @media (max-width: 760px) {
    dialog {
      width: 100vw;
      max-width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      margin: 0;
      border-radius: 0;
      border: 0;
    }
    form {
      padding: 16px 16px 24px;
    }
    .body {
      grid-template-columns: minmax(0, 1fr);
    }
    .main-actions {
      width: 100%;
    }
    .main-actions .btn-primary {
      flex: 1;
    }
  }
</style>
