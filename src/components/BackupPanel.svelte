<script lang="ts">
  import { auth } from '../lib/auth.svelte';
  import { BackupError, parseBackup, type Backup, type RestoreMode } from '../lib/backup';
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { status } from '../lib/status.svelte';
  import { downloadBackup, downloadCsv, prepareRestore, runRestore } from '../lib/transfer';

  // 백업·내보내기 (PRD F9): JSON 백업(표지 선택), CSV 내보내기, JSON 복원(합치기·덮어쓰기)
  let withCovers = $state(false);
  let busy = $state<string | null>(null);
  let message = $state<string | null>(null);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

  async function backup() {
    if (!auth.userId) return;
    message = null;
    busy = ko.backup.downloading(0, 0);
    try {
      await downloadBackup(auth.userId, {
        covers: withCovers,
        onProgress: (done, total) => (busy = ko.backup.downloading(done, total)),
      });
      await library.load();
      message = ko.backup.downloaded;
    } catch (e) {
      console.warn('백업하지 못했어요', e);
      message = ko.backup.downloadFailed;
    } finally {
      busy = null;
    }
  }

  async function csv() {
    message = null;
    try {
      await downloadCsv();
    } catch (e) {
      console.warn('CSV를 만들지 못했어요', e);
      message = ko.backup.downloadFailed;
    }
  }

  // ── 복원
  let file = $state.raw<Backup | null>(null);
  let fileError = $state<string | null>(null);
  let mode = $state<RestoreMode>('merge');
  let planned = $state.raw<Awaited<ReturnType<typeof prepareRestore>> | null>(null);
  let confirming = $state(false);

  async function pickBackup(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    file = null;
    planned = null;
    confirming = false;
    fileError = null;
    message = null;
    if (!f) return;
    try {
      file = parseBackup(await f.text());
      await plan();
    } catch (err) {
      fileError =
        err instanceof BackupError ? ko.backup.errors[err.code] : ko.backup.errors.not_json;
    }
  }

  async function plan() {
    if (!file || !auth.userId) return;
    confirming = false;
    planned = await prepareRestore(file, auth.userId, mode);
  }

  async function restore() {
    if (!planned || !auth.userId) return;
    if (planned.plan.clearFirst && !confirming) {
      confirming = true;
      return;
    }
    busy = ko.backup.restoring;
    status.save = 'saving';
    try {
      await runRestore(planned.plan, auth.userId, planned.current);
      status.save = 'saved';
      message = ko.backup.restored;
      file = null;
      planned = null;
    } catch (e) {
      console.warn('복원하지 못했어요', e);
      status.save = 'error';
      message = ko.backup.restoreFailed;
    } finally {
      confirming = false;
      busy = null;
      await library.load();
    }
  }
</script>

<section class="card" aria-labelledby="backup-title">
  <h2 class="display" id="backup-title">{ko.backup.title}</h2>
  <p class="hint">{ko.backup.intro}</p>
  <p class="hint">{ko.backup.last(library.lastBackupAt ? fmt(library.lastBackupAt) : null)}</p>

  <label class="check">
    <input type="checkbox" bind:checked={withCovers} disabled={busy !== null} />
    {ko.backup.withCovers}
  </label>
  <div class="actions">
    <button type="button" class="btn-primary" disabled={busy !== null} onclick={backup}>
      {ko.backup.download}
    </button>
    <button type="button" class="btn" disabled={busy !== null} onclick={csv}>
      {ko.backup.csv}
    </button>
  </div>
  <p class="hint">{ko.backup.csvHint}</p>

  {#if busy}<p class="hint" role="status">{busy}</p>{/if}
  {#if message}<p class="msg" role="status">{message}</p>{/if}

  <h3 class="sub">{ko.backup.restoreTitle}</h3>
  <label class="file btn">
    {ko.backup.restorePick}
    <input
      type="file"
      accept=".json,application/json"
      onchange={pickBackup}
      disabled={busy !== null}
    />
  </label>
  {#if fileError}<p class="msg" role="alert">{fileError}</p>{/if}

  {#if file && planned}
    <p class="hint">
      {ko.backup.fileInfo({
        date: fmt(file.exportedAt),
        books: file.books.length,
        readings: file.readings.length,
        covers: Object.keys(file.covers ?? {}).length,
      })}
    </p>
    <fieldset class="modes">
      <legend class="label">{ko.backup.mode}</legend>
      <label>
        <input type="radio" name="restore-mode" value="merge" bind:group={mode} onchange={plan} />
        <span><b>{ko.backup.merge}</b> · {ko.backup.mergeHint}</span>
      </label>
      <label>
        <input
          type="radio"
          name="restore-mode"
          value="overwrite"
          bind:group={mode}
          onchange={plan}
        />
        <span><b>{ko.backup.overwrite}</b> · {ko.backup.overwriteHint}</span>
      </label>
    </fieldset>
    {#if planned.plan.remapped}<p class="note">{ko.backup.otherAccount}</p>{/if}
    <p class="plan" class:danger={planned.plan.clearFirst}>
      {planned.plan.clearFirst
        ? ko.backup.planOverwrite({
            current: planned.current.books.length,
            books: planned.plan.books.length,
            readings: planned.plan.readings.length,
          })
        : ko.backup.planMerge({
            books: planned.plan.books.length,
            readings: planned.plan.readings.length,
            skipped: planned.plan.skippedBooks,
          })}
    </p>
    <div class="actions">
      {#if confirming}
        <button type="button" class="btn" onclick={() => (confirming = false)}>
          {ko.backup.cancel}
        </button>
      {/if}
      <button
        type="button"
        class="btn-primary"
        class:danger={confirming}
        disabled={busy !== null}
        onclick={restore}
      >
        {confirming ? ko.backup.restoreConfirm : ko.backup.restore}
      </button>
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
    gap: 12px;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .sub {
    margin: 12px 0 0;
    padding-top: 16px;
    border-top: 1px solid var(--line);
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
  .msg {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }
  .plan {
    margin: 0;
    font-size: 14px;
  }
  .plan.danger {
    padding: 10px 12px;
    border-radius: var(--radius-s);
    border: 1px solid var(--accent);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    min-height: 44px;
  }
  input[type='checkbox'],
  input[type='radio'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    flex: none;
  }
  .modes {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .modes label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    min-height: 32px;
    cursor: pointer;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
    display: inline-flex;
    align-items: center;
  }
  .btn-primary {
    padding: 0 18px;
  }
  .btn-primary.danger {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .file {
    position: relative;
    align-self: flex-start;
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
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 899px) {
    .card {
      padding: 18px 16px;
    }
  }
</style>
