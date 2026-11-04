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
  return shelves.find((s) => s.kind === 'year' && s.year === year);
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

/** 올해의 나이테 원 하나: 지름(px), 색(원뿔 그러데이션 또는 CSS 변수) */
export type RingDisc = { size: number; background: string };

/**
 * 올해의 나이테 (DESIGN 7.3). 바깥 고리가 가장 최근 연도, 고리 두께는 권수에 비례,
 * 고리 조각 하나가 책 한 권(색 = 책등 바탕색, 조각 크기 = 쪽수). 고리 사이 4px 틈, 가운데 강조색 점.
 * 크기가 줄어드는 원을 겹쳐 그립니다. 책이 있는 해만, 최근 maxYears해까지.
 */
export function yearRings(
  shelves: readonly ShelfYear[],
  size = 132,
  maxYears = 6,
): { discs: RingDisc[]; years: number[] } {
  const GAP = 4;
  const CENTER = 10;
  const MIN = 2;
  const years = shelves
    .filter((s): s is ShelfYear & { year: number } => s.kind === 'year' && s.count > 0)
    .sort((a, b) => b.year - a.year)
    .slice(0, maxYears);
  const discs: RingDisc[] = [];
  if (years.length > 0) {
    const total = years.reduce((n, s) => n + s.count, 0);
    const room = (size - CENTER) / 2 - GAP * years.length - MIN * years.length;
    let radius = size / 2;
    for (const shelf of years) {
      const thickness = MIN + Math.max(0, room) * (shelf.count / total);
      const pages = shelf.spines.reduce((n, sp) => n + sp.pages, 0);
      let acc = 0;
      const stops = shelf.spines.map((sp) => {
        const from = (acc / pages) * 100;
        acc += sp.pages;
        return `${sp.palette.base} ${from.toFixed(2)}% ${((acc / pages) * 100).toFixed(2)}%`;
      });
      discs.push({
        size: Math.round(radius * 2),
        background: `conic-gradient(from -90deg, ${stops.join(', ')})`,
      });
      radius -= thickness;
      discs.push({ size: Math.round(radius * 2), background: 'var(--ring-gap)' });
      radius -= GAP;
    }
  }
  discs.push({ size: CENTER, background: 'var(--accent)' });
  return { discs, years: years.map((s) => s.year) };
}
