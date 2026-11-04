// 별 채우기 별점 입력의 계산 (0.5 단위, 0~5점). 별점 없음(null)은 0점과 다릅니다(결정 0001-13).

export const MAX_RATING = 5;

/** 별 줄의 왼쪽에서 x만큼 떨어진 곳을 눌렀을 때의 점수. 별 하나의 왼쪽 절반은 0.5점 */
export function ratingFromPosition(x: number, width: number): number {
  if (width <= 0) return MAX_RATING;
  const raw = Math.ceil((x / width) * MAX_RATING * 2) / 2;
  return Math.min(MAX_RATING, Math.max(0.5, raw));
}

/** 키보드로 0.5점씩 올리고 내리기. 별점 없음에서 올리면 0.5점, 내리면 그대로 */
export function stepRating(value: number | null, delta: number): number | null {
  if (value === null) return delta > 0 ? 0.5 : null;
  return Math.min(MAX_RATING, Math.max(0, value + delta));
}

/** 별 n번째(1~5)를 얼마나 채울지: 'full' | 'half' | 'empty' */
export function starFill(value: number | null, n: number): 'full' | 'half' | 'empty' {
  if (value === null || value < n - 0.5) return 'empty';
  return value >= n ? 'full' : 'half';
}
