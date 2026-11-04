<script lang="ts">
  import { ordinalKo } from '../lib/format';
  import { ko } from '../lib/i18n/ko';
  import type { ShelfYear } from '../lib/shelves';
  import { ringCount, shelfOf, yearRings } from '../lib/stats';

  // 올해의 나이테 (DESIGN 7.3): 132px 동심원. 바깥 고리가 올해(가장 최근 연도)
  let { shelves, year }: { shelves: ShelfYear[]; year: number } = $props();

  const SIZE = 132;
  const rings = $derived(yearRings(shelves, SIZE));
  const count = $derived(shelfOf(shelves, year)?.count ?? 0);
  const thickest = $derived(
    shelves.every((s) => s.kind !== 'year' || s.year === year || s.count <= count),
  );
  const caption = $derived(
    count === 0
      ? ko.detail.ringsEmpty
      : (thickest ? ko.detail.ringsThickest : ko.detail.ringsGrowing)(
          ordinalKo(ringCount(shelves, year)),
          count,
        ),
  );
</script>

<div class="ringcard">
  <div class="rings" role="img" aria-label={ko.detail.ringsLabel(rings.years)}>
    {#each rings.discs as d, i (i)}
      <span
        style:left="{(SIZE - d.size) / 2}px"
        style:top="{(SIZE - d.size) / 2}px"
        style:width="{d.size}px"
        style:height="{d.size}px"
        style:background={d.background}
      ></span>
    {/each}
  </div>
  <div class="text">
    <h3 class="display">{ko.detail.ringsTitle}</h3>
    <span class="caption">{caption}</span>
    <a href="#/recap/{year}" class="btn-line">{ko.detail.toRecap}</a>
  </div>
</div>

<style>
  /* 시안 '나이테' 절을 옮김 */
  .ringcard {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .rings {
    position: relative;
    width: 132px;
    height: 132px;
    flex: none;
  }
  .rings span {
    position: absolute;
    border-radius: 50%;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  h3 {
    margin: 0;
    font-size: 17px;
  }
  .caption {
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
  }
  .btn-line {
    align-self: flex-start;
    height: 40px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    border-radius: 10px;
    border: 1px solid var(--accent);
    color: var(--accent);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
  }
</style>
