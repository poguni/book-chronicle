<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { prefs } from '../lib/prefs.svelte';

  // 설정 (PRD F10). 지금은 움직임 줄이기만 있고, 나머지는 설정 Phase에서 채웁니다.
</script>

<h1 class="display page-title">{ko.pages.settings}</h1>

<section class="card">
  <label class="toggle">
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

<p class="hint">{ko.settings.more}</p>

<style>
  .card {
    max-width: 560px;
    padding: 18px 20px;
    border-radius: var(--radius-l);
    background: var(--card);
    border: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    font-weight: 700;
    cursor: pointer;
  }
  .toggle input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent);
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
</style>
