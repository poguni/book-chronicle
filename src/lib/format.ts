// 화면 표기용 순수 함수

const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

/** 2026년 11월 4일 수요일 */
export function formatToday(date: Date): string {
  return DATE_FORMAT.format(date);
}

/** 4,967 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

const ORDINALS = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

/** 1 → "첫 번째", 4 → "네 번째", 11 → "11번째" */
export function ordinalKo(n: number): string {
  const word = ORDINALS[n - 1];
  return word ? `${word} 번째` : `${n}번째`;
}

export type MonthBar = { month: number; count: number; state: 'past' | 'now' | 'off' };

/**
 * 월별 막대 12칸 (DESIGN 7.3). 보는 연도가 올해면 현재 달은 now, 아직 오지 않은 달은 off.
 * 지난 연도는 모두 past, 다음 연도는 모두 off.
 */
export function monthBars(counts: readonly number[], year: number, today: Date): MonthBar[] {
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    let state: MonthBar['state'] = 'past';
    if (year > thisYear || (year === thisYear && month > thisMonth)) state = 'off';
    else if (year === thisYear && month === thisMonth) state = 'now';
    return { month, count: counts[i] ?? 0, state };
  });
}
