<script lang="ts">
  import { backupDue } from '../lib/backup';
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import Icon from './Icon.svelte';

  // 마지막 백업 후 30일이 지나면 백업을 권합니다(PRD F9). "나중에"는 이 탭에서만 기억합니다.
  const KEY = 'bookchronicle-backup-later';
  let later = $state(read());

  function read(): boolean {
    try {
      return sessionStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  }

  function dismiss() {
    later = true;
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 숨김
    }
  }

  const due = $derived(
    library.state === 'ready' && !later && backupDue(library.lastBackupAt, library.books),
  );
</script>

{#if due}
  <div class="reminder" role="status">
    <Icon name="download" size={16} strokeWidth={2} />
    <span>{ko.backup.reminder}</span>
    <a href="#/import">{ko.backup.reminderGo}</a>
    <button type="button" onclick={dismiss}>{ko.backup.reminderLater}</button>
  </div>
{/if}

<style>
  .reminder {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 14px;
    border-radius: var(--radius-m);
    background: var(--card);
    border: 1px solid var(--accent);
    font-size: 14px;
  }
  .reminder :global(svg) {
    color: var(--accent);
    flex: none;
  }
  span {
    flex: 1 1 240px;
  }
  a {
    font-weight: 700;
  }
  button {
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
    min-height: 32px;
  }
</style>
