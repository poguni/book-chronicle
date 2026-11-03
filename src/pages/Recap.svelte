<script lang="ts">
  import { ko } from '../lib/i18n/ko';

  let { year }: { year: number | null } = $props();
</script>

<h1>{year === null ? ko.pages.recap : ko.recapOfYear(year)}</h1>
<p>{ko.placeholder}</p>
