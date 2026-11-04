<script lang="ts">
  import { ko } from '../lib/i18n/ko';

  // 한 줄 회고 (PRD F6): 80자까지. 연도를 바꾸면 부모가 새로 만듭니다({#key}).
  let { initial, onsave }: { initial: string; onsave: (text: string) => Promise<boolean> } =
    $props();

  // svelte-ignore state_referenced_locally
  let text = $state(initial);
  let message = $state<string | null>(null);
  let saving = $state(false);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    message = (await onsave(text)) ? ko.recap.saved : ko.recap.saveFailed;
    saving = false;
  }
</script>

<form class="form" onsubmit={save}>
  <label for="one-liner" class="label">{ko.recap.oneLiner}</label>
  <p class="hint" id="one-liner-hint">{ko.recap.oneLinerHint}</p>
  <div class="row">
    <input
      id="one-liner"
      bind:value={text}
      maxlength="80"
      placeholder={ko.recap.oneLinerPlaceholder}
      aria-describedby="one-liner-hint one-liner-count"
      oninput={() => (message = null)}
    />
    <button type="submit" class="btn" disabled={saving}>{ko.recap.save}</button>
  </div>
  <div class="meta">
    <span id="one-liner-count" class="hint">{ko.recap.count([...text].length)}</span>
    {#if message}<span role="status">{message}</span>{/if}
  </div>
</form>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .row {
    display: flex;
    gap: 8px;
  }
  input {
    flex: 1;
    min-width: 0;
    height: 46px;
    padding: 0 14px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-display);
    font-size: 16px;
  }
  .btn {
    height: 46px;
    padding: 0 18px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
</style>
