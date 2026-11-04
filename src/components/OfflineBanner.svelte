<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { status } from '../lib/status.svelte';
  import Icon from './Icon.svelte';

  // 연결 끊김 띠 (DESIGN 12장): 연결되면 저절로 사라집니다.
</script>

{#if !status.online}
  <div class="offline" role="status">
    <Icon name="warning" size={16} strokeWidth={2} />
    <span>{ko.offline}</span>
  </div>
{/if}

<style>
  .offline {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-m);
    background: var(--card);
    border: 1px solid var(--accent);
    font-size: 14px;
  }
  .offline :global(svg) {
    color: var(--accent);
    flex: none;
  }
</style>
