<script lang="ts" module>
  // 아이콘 세트 (DESIGN 10장): 24px 격자, 선 1.8px, 둥근 끝, 채움 없음, 색은 currentColor
  const PATHS = {
    shelf: 'M4 4v16M8 6v14M12 4v16M16.5 6.5l3.5 13M2 20.5h20',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    bookmark: 'M7 3h10v18l-5-4-5 4z',
    list: 'M4 6h16M4 12h16M4 18h10',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    gear: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
    search: 'M20 20l-3.5-3.5',
    plus: 'M12 5v14M5 12h14',
    barcode: 'M4 6v12M7 6v12M10.5 6v12M13 6v12M16.5 6v12M20 6v12',
    close: 'M6 6l12 12M18 6L6 18',
    menu: 'M4 7h16M4 12h16M4 17h16',
    logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    warning: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  } as const;

  // 경로 말고 원이 함께 있는 아이콘
  const CIRCLES: Partial<Record<IconName, { cx: number; cy: number; r: number }>> = {
    gear: { cx: 12, cy: 12, r: 3 },
    search: { cx: 11, cy: 11, r: 7 },
  };

  export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
  let {
    name,
    size = 18,
    strokeWidth = 1.8,
  }: { name: IconName; size?: number; strokeWidth?: number } = $props();

  const circle = $derived(CIRCLES[name]);
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if circle}<circle cx={circle.cx} cy={circle.cy} r={circle.r} />{/if}
  <path d={PATHS[name]} />
</svg>
