<script lang="ts">
  import type { MonthBar } from '../lib/format';

  // 월별 막대 12칸 (DESIGN 7.3): 현재 달 강조색, 아직 오지 않은 달 --bar-off
  let { bars, label }: { bars: MonthBar[]; label: string } = $props();

  // 시안은 한 권에 26px. 한 달에 많이 읽어도 칸(64px)을 넘지 않게 가장 많은 달에 맞춥니다.
  const unit = $derived(Math.min(26, 64 / Math.max(1, ...bars.map((b) => b.count))));
</script>

<div class="months" role="img" aria-label={label}>
  {#each bars as bar (bar.month)}
    <div>
      <i class={bar.state} style:height="{bar.count ? Math.max(4, bar.count * unit) : 3}px"></i>
      <span>{bar.month}</span>
    </div>
  {/each}
</div>

<style>
  .months {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 6px;
    align-items: end;
    height: 96px;
    padding: 12px 12px 6px;
    border-radius: 12px;
    background: var(--card);
    border: 1px solid var(--line);
  }
  .months div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  i {
    display: block;
    width: 100%;
    max-width: 12px;
    border-radius: 3px 3px 0 0;
    background: var(--bar);
  }
  i.now {
    background: var(--accent);
  }
  i.off {
    background: var(--bar-off);
  }
  span {
    font-size: 10px;
    color: var(--muted);
  }
</style>
