// 연도마다 고정된 색·선 모양 (결정 0013). 색은 연도를 따라가고 순위를 따라가지 않습니다:
// 책이 있는 모든 연도(최신이 앞) 안의 자리로 정해, 비교할 연도를 바꿔도 색이 바뀌지 않습니다.
// 색약 배려로 선 모양(실선·점선)과 점 모양도 함께 다르게 합니다.
export const DASHES: number[][] = [[], [8, 5], [2, 4], [12, 4, 2, 4], [4, 4]];
export const POINTS = ['circle', 'rect', 'triangle', 'rectRot', 'crossRot'] as const;

export function yearStyle(allYears: readonly number[], year: number) {
  const i = Math.max(0, allYears.indexOf(year));
  return {
    /** --series-1 … --series-7 */
    slot: (i % 7) + 1,
    dash: DASHES[i % DASHES.length]!,
    point: POINTS[i % POINTS.length]!,
  };
}
