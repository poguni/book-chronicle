// 올해 요약·한눈에·연도별 나이테에 쓰는 통계 (DESIGN 7.1~7.3)
import type { ShelfSpine, ShelfYear } from './shelves';

export type YearSummary = {
  books: number;
  pages: number;
  averageRating: number | null;
  /** 작년보다 몇 권 더(음수면 적게). 작년 기록이 없으면 null */
  diffFromLastYear: number | null;
};

export function shelfOf(shelves: readonly ShelfYear[], year: number): ShelfYear | undefined {
  return shelves.find((s) => s.year === year);
}

/** 별점이 있는 기록만의 평균(별점 없음 null은 0과 다름, 결정 0001-13). 소수 첫째 자리 */
export function averageRating(spines: readonly ShelfSpine[]): number | null {
  const rated = spines.map((s) => s.rating).filter((r): r is number => r !== null);
  if (rated.length === 0) return null;
  return Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10;
}

export function yearSummary(shelves: readonly ShelfYear[], year: number): YearSummary {
  const now = shelfOf(shelves, year);
  const last = shelfOf(shelves, year - 1);
  return {
    books: now?.count ?? 0,
    pages: now?.pages ?? 0,
    averageRating: averageRating(now?.spines ?? []),
    diffFromLastYear: last && last.count > 0 ? (now?.count ?? 0) - last.count : null,
  };
}

/** 월별 완독 권수 12칸 */
export function monthCounts(spines: readonly ShelfSpine[]): number[] {
  const counts = Array.from({ length: 12 }, () => 0);
  for (const s of spines) {
    const month = s.finishedAt ? Number(s.finishedAt.slice(5, 7)) : NaN;
    if (month >= 1 && month <= 12) counts[month - 1] = (counts[month - 1] ?? 0) + 1;
  }
  return counts;
}

/** 가장 많이 읽은 분야. 같으면 먼저 읽은 분야 */
export function topCategory(spines: readonly ShelfSpine[]): string | null {
  const counts = new Map<string, number>();
  for (const s of spines) if (s.category) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  let best: string | null = null;
  let max = 0;
  for (const [c, n] of counts) {
    if (n > max) {
      best = c;
      max = n;
    }
  }
  return best;
}

/** 몇 번째 나이테인지: 올해까지 책이 있는 해의 수(올해는 비어 있어도 셈) */
export function ringCount(shelves: readonly ShelfYear[], currentYear: number): number {
  const years = new Set<number>([currentYear]);
  for (const s of shelves)
    if (s.year !== null && s.year <= currentYear && s.count > 0) years.add(s.year);
  return years.size;
}

/** 사이드바 연도별 나이테: 연도 + 권수 + 책등 색을 쪽수 비율로 이은 띠 (연도 미상 제외) */
export function yearBands(shelves: readonly ShelfYear[]) {
  return shelves
    .filter((s): s is ShelfYear & { year: number } => s.year !== null)
    .map((s) => ({
      year: s.year,
      count: s.count,
      segments: s.spines.map((sp) => ({ pages: sp.pages, color: sp.palette.base })),
    }));
}
