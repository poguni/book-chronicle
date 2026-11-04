<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import type { SaveState } from '../lib/status.svelte';

  // 저장 상태 점 (DESIGN 12장): 저장 중 보조색, 저장됨 초록, 실패 강조색. 글자로도 함께 알립니다.
  let { state }: { state: SaveState } = $props();
</script>

<span class="save" role="status">
  <span class="dot {state}" aria-hidden="true"></span>{ko.save[state]}
</span>

<style>
  .save {
    display: inline-flex;
    align-items: center;
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 4px;
    margin-right: 8px;
    background: var(--success);
  }
  .dot.saving {
    background: var(--muted);
  }
  .dot.error {
    background: var(--accent);
  }
</style>
