<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { goalProgress } from '../lib/stats';

  // 목표 권수 (결정 0016): 진행률(숫자 + 막대)과, onsave가 있으면 정하기·고치기·지우기
  let {
    year,
    books,
    goal,
    onsave,
  }: {
    year: number;
    books: number;
    goal: number | null;
    /** 없으면 보기만. null을 넘기면 목표를 지움 */
    onsave?: (goal: number | null) => Promise<boolean>;
  } = $props();

  const p = $derived(goalProgress(books, goal));
  const inputId = $props.id();

  let editing = $state(false);
  let value = $state('');
  let message = $state<string | null>(null);
  let saving = $state(false);

  function start() {
    value = goal === null ? '' : String(goal);
    message = null;
    editing = true;
  }

  async function save(next: number | null) {
    if (!onsave) return;
    saving = true;
    const ok = await onsave(next);
    saving = false;
    if (ok) editing = false;
    else message = ko.goal.saveFailed;
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      message = ko.goal.invalid;
      return;
    }
    void save(n);
  }
</script>

<div class="goal">
  {#if editing}
    <form class="form" novalidate onsubmit={submit}>
      <label for={inputId} class="lbl">{ko.goal.label(year)}</label>
      <div class="row">
        <input
          id={inputId}
          type="number"
          inputmode="numeric"
          min="1"
          max="1000"
          step="1"
          bind:value
          aria-describedby={message ? `${inputId}-msg` : undefined}
        />
        <button type="submit" class="btn primary" disabled={saving}>{ko.goal.save}</button>
        {#if goal !== null}
          <button type="button" class="btn" disabled={saving} onclick={() => save(null)}
            >{ko.goal.clear}</button
          >
        {/if}
        <button type="button" class="btn" onclick={() => (editing = false)}>{ko.goal.cancel}</button
        >
      </div>
      {#if message}<p id="{inputId}-msg" class="msg" role="alert">{message}</p>{/if}
    </form>
  {:else if p}
    <div class="line">
      <span class="nums"
        ><b>{ko.goal.progress(p.books, p.goal)}</b> · {ko.goal.percent(p.percent)}</span
      >
      <span class="state" class:done={p.done}>{p.done ? ko.goal.done : ko.goal.left(p.left)}</span>
      {#if onsave}
        <button type="button" class="link" onclick={start}>{ko.goal.edit}</button>
      {/if}
    </div>
    <div
      class="bar"
      role="progressbar"
      aria-label={ko.goal.bar(year)}
      aria-valuemin={0}
      aria-valuemax={p.goal}
      aria-valuenow={Math.min(p.books, p.goal)}
      aria-valuetext={`${ko.goal.progress(p.books, p.goal)}, ${ko.goal.percent(p.percent)}`}
    >
      <span style:width="{p.ratio * 100}%"></span>
    </div>
  {:else if onsave}
    <button type="button" class="link" onclick={start}>{ko.goal.set}</button>
  {/if}
</div>

<style>
  .goal {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    font-size: 13px;
    color: var(--muted);
  }
  .nums b {
    color: var(--text);
    font-weight: 700;
  }
  .state.done {
    color: var(--accent);
    font-weight: 700;
  }
  .bar {
    height: 6px;
    border-radius: 999px;
    background: var(--bar-off);
    overflow: hidden;
    max-width: 320px;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
  }
  .link {
    align-self: flex-start;
    min-height: 32px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lbl {
    font-size: 13px;
    color: var(--muted);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  input {
    width: 96px;
    height: 40px;
    padding: 0 10px;
    border-radius: var(--radius-s);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    font-size: 15px;
  }
  .btn {
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
  }
  .msg {
    margin: 0;
    font-size: 13px;
    color: var(--text);
  }
</style>
