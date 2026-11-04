<script lang="ts">
  import BackupPanel from '../components/BackupPanel.svelte';
  import CsvImport from '../components/CsvImport.svelte';
  import { ko } from '../lib/i18n/ko';

  // 가져오기·백업 (PRD F3·F9)
</script>

<h1 class="display page-title">{ko.pages.import}</h1>

<div class="stack">
  <CsvImport />
  <BackupPanel />
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 1000px;
    min-width: 0;
  }
</style>
