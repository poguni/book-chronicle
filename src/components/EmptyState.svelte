<script lang="ts">
  import type { Snippet } from 'svelte';

  // 빈 상태 (DESIGN 12장): 짧은 안내 + 필요하면 다음 행동 버튼
  let { message, children }: { message: string; children?: Snippet } = $props();
</script>

<div class="empty">
  <p>{message}</p>
  {#if children}{@render children()}{/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    padding: 12px;
  }
  p {
    margin: 0;
  }
</style>
