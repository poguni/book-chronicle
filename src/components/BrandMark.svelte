<script lang="ts">
  // 브랜드 아이콘: 나이테 동심원 4개, 강조색 선 1.4px (DESIGN 7.1)
  let { size = 40 }: { size?: number } = $props();
</script>

<svg
  class="brand-mark"
  width={size}
  height={size}
  viewBox="0 0 40 40"
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  aria-hidden="true"
>
  <circle cx="20" cy="20" r="4" />
  <circle cx="20" cy="20" r="9" />
  <circle cx="20" cy="20" r="14" />
  <circle cx="20" cy="20" r="18.5" />
</svg>

<style>
  .brand-mark {
    color: var(--accent);
    flex: none;
  }
</style>
