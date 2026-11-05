<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { dateInYear, movedDate } from '../lib/moveYear';
  import type { ShelfSpine } from '../lib/shelves';

  // 다른 해 책장에 놓았을 때: 완독일을 확인하고 옮깁니다(결정 0016).
  let {
    spine,
    year,
    today,
    onconfirm,
    onclose,
  }: {
    spine: ShelfSpine;
    year: number;
    today: Date;
    onconfirm: (date: string) => Promise<boolean>;
    onclose: () => void;
  } = $props();

  let dialog: HTMLDialogElement;
  // svelte-ignore state_referenced_locally
  let date = $state(movedDate(spine.finishedAt, year, today));
  let message = $state<string | null>(null);
  let saving = $state(false);

  $effect(() => {
    dialog.showModal();
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!dateInYear(date, year)) {
      message = ko.move.notInYear(year);
      return;
    }
    saving = true;
    const ok = await onconfirm(date);
    saving = false;
    if (ok) dialog.close();
    else message = ko.move.failed;
  }
</script>

<dialog bind:this={dialog} aria-labelledby="move-title" {onclose}>
  <form novalidate onsubmit={submit}>
    <h2 id="move-title" class="display">{ko.move.title(spine.title, year)}</h2>
    <p class="hint">{ko.move.hint}</p>
    <label class="field">
      <span class="label">{ko.move.date}</span>
      <input
        type="date"
        bind:value={date}
        min="{year}-01-01"
        max="{year}-12-31"
        aria-describedby={message ? 'move-msg' : undefined}
        oninput={() => (message = null)}
      />
    </label>
    {#if message}<p id="move-msg" class="msg" role="alert">{message}</p>{/if}
    <div class="actions">
      <button type="button" class="btn" onclick={() => dialog.close()}>{ko.move.cancel}</button>
      <button type="submit" class="btn-primary" disabled={saving}>{ko.move.confirm}</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100vw - 32px));
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: var(--panel);
    color: var(--text);
    box-shadow: var(--book-shadow);
  }
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 24px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
    line-height: 1.4;
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  input {
    height: 44px;
    padding: 0 12px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    font-size: 15px;
  }
  .msg {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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
  .btn-primary {
    padding: 0 18px;
  }
</style>
