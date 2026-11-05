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
export type GoalProgress = {
  books: number;
  goal: number;
  /** 0~1 (넘어도 1) */
  ratio: number;
  /** 정수 %, 100을 넘을 수 있음 */
  percent: number;
  left: number;
  done: boolean;
};

/** 목표 권수 진행률 (결정 0016). 목표가 없으면 null */
export function goalProgress(books: number, goal: number | null): GoalProgress | null {
  if (goal === null || goal <= 0) return null;
  return {
    books,
    goal,
    ratio: Math.min(1, books / goal),
    percent: Math.floor((books / goal) * 100),
    left: Math.max(0, goal - books),
    done: books >= goal,
  };
}

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

// ── 연도 비교 (PRD F5, 결정 0013) ──

/** 책장이 있는(책이 1권 이상인) 연도, 최신이 앞. 올해는 비어 있어도 넣습니다. */
export function yearsWithBooks(shelves: readonly ShelfYear[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const s of shelves)
    if (s.kind === 'year' && s.year !== null && s.count > 0) years.add(s.year);
  return [...years].sort((a, b) => b - a);
}

export type YearStats = {
  year: number;
  books: number;
  /** 쪽수를 아는 책만 더한 쪽수 */
  totalPages: number;
  averagePages: number | null;
  averageRating: number | null;
  thickest: { title: string; pages: number } | null;
  topCategory: string | null;
};

export function yearStats(shelves: readonly ShelfYear[], year: number): YearStats {
  const spines = shelfOf(shelves, year)?.spines ?? [];
  const known = spines.filter(
    (s): s is ShelfSpine & { knownPages: number } => s.knownPages !== null,
  );
  const totalPages = known.reduce((n, s) => n + s.knownPages, 0);
  const thick = known.reduce<ShelfSpine | null>(
    (best, s) => (!best || s.knownPages! > best.knownPages! ? s : best),
    null,
  );
  return {
    year,
    books: spines.length,
    totalPages,
    averagePages: known.length > 0 ? Math.round(totalPages / known.length) : null,
    averageRating: averageRating(spines),
    thickest: thick ? { title: thick.title, pages: thick.knownPages! } : null,
    topCategory: topCategory(spines),
  };
}

/** 증감: 차이와 %(이전 값이 0이거나 없으면 % 없음) */
export function change(
  now: number | null,
  before: number | null,
): { delta: number; percent: number | null } | null {
  if (now === null || before === null) return null;
  const delta = Math.round((now - before) * 10) / 10;
  return { delta, percent: before === 0 ? null : Math.round(((now - before) / before) * 100) };
}

/** 월별 권수 또는 쪽수 12칸. cumulative면 1월부터 쌓은 값(연중 페이스) */
export function monthlySeries(
  spines: readonly ShelfSpine[],
  metric: 'books' | 'pages',
  cumulative: boolean,
): number[] {
  const values = Array.from({ length: 12 }, () => 0);
  for (const s of spines) {
    const m = s.finishedAt ? Number(s.finishedAt.slice(5, 7)) : NaN;
    if (m >= 1 && m <= 12) values[m - 1]! += metric === 'books' ? 1 : (s.knownPages ?? 0);
  }
  if (cumulative) for (let i = 1; i < 12; i++) values[i]! += values[i - 1]!;
  return values;
}

/**
 * 연도별 추이 (PRD F5 P1): 책이 있는 첫해부터 올해까지 해마다 권수와 쪽수(아는 책만).
 * 사이의 빈 해는 0으로 채워 가로축이 끊기지 않게 합니다. 오래된 해가 앞.
 */
export function yearTrend(
  shelves: readonly ShelfYear[],
  currentYear: number,
): { year: number; books: number; pages: number }[] {
  const years = yearsWithBooks(shelves, currentYear);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const out: { year: number; books: number; pages: number }[] = [];
  for (let y = first; y <= last; y++) {
    const s = yearStats(shelves, y);
    out.push({ year: y, books: s.books, pages: s.totalPages });
  }
  return out;
}

export const OTHER_CATEGORY = '기타';

/**
 * 분야 비중 (PRD F5): 연도마다 분야별 권수. 분야는 모든 연도를 합쳐 많은 순 상위 top개 + 기타
 * (분야 없음 포함). 분야 순서·색이 고른 연도에 따라 바뀌지 않도록 전체 연도로 순위를 정합니다.
 */
export function categoryShares(
  shelves: readonly ShelfYear[],
  years: readonly number[],
  top = 6,
): { categories: string[]; rows: { year: number; counts: number[]; total: number }[] } {
  const all = new Map<string, number>();
  for (const s of shelves)
    if (s.kind === 'year')
      for (const sp of s.spines)
        if (sp.category) all.set(sp.category, (all.get(sp.category) ?? 0) + 1);
  const ranked = [...all].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
  const named = ranked.slice(0, top).map(([c]) => c);
  const rows = years.map((year) => {
    const spines = shelfOf(shelves, year)?.spines ?? [];
    const counts = Array.from({ length: named.length + 1 }, () => 0);
    for (const sp of spines) {
      const i = sp.category ? named.indexOf(sp.category) : -1;
      counts[i >= 0 ? i : named.length]! += 1;
    }
    return { year, counts, total: spines.length };
  });
  const hasOther = rows.some((r) => r.counts[named.length]! > 0);
  return {
    categories: hasOther ? [...named, OTHER_CATEGORY] : named,
    rows: hasOther ? rows : rows.map((r) => ({ ...r, counts: r.counts.slice(0, named.length) })),
  };
}

/**
 * 그해의 책 후보 (PRD F6): 아직 고르지 않은 책 중 별점이 가장 높은 책을 제안만 합니다.
 * 같으면 나중에 읽은 책. 별점 있는 책이 없으면 null. exclude: 이미 고른 책 ID
 */
export function bookOfYearCandidate(
  shelves: readonly ShelfYear[],
  year: number,
  exclude: readonly string[] = [],
): ShelfSpine | null {
  const rated = (shelfOf(shelves, year)?.spines ?? []).filter(
    (s) => s.rating !== null && !exclude.includes(s.bookId),
  );
  return rated.reduce<ShelfSpine | null>((best, s) => {
    if (!best) return s;
    if (s.rating! !== best.rating!) return s.rating! > best.rating! ? s : best;
    return (s.finishedAt ?? '') >= (best.finishedAt ?? '') ? s : best;
  }, null);
}

/**
 * 12월 안내를 띄울 때인지 (PRD F6): 12월이고, 올해 책이 있고, 그해의 책을 아직 고르지 않았고,
 * 이 기기에서 올해 한 번도 보여 주지 않았을 때
 */
export function decemberNoticeDue(
  today: Date,
  p: { booksThisYear: number; bookOfYearChosen: boolean; seen: boolean },
): boolean {
  return today.getMonth() === 11 && p.booksThisYear > 0 && !p.bookOfYearChosen && !p.seen;
}

/** 분야별 책 수 (설정의 분야 관리) */
export function categoryCounts(books: readonly { category: string | null }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const b of books) if (b.category) m.set(b.category, (m.get(b.category) ?? 0) + 1);
  return m;
}
