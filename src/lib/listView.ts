// 전체 목록 (PRD F8, 결정 0020): 기록 하나가 한 줄. 검색·거르기·정렬·요약은 화면과 분리한 순수 함수.
import type { ShelfKind, ShelfSpine, ShelfYear } from './shelves';

export type ListRow = {
  spine: ShelfSpine;
  /** 어느 책장에 있는 기록인지 (연도 / 연도 미상 / 읽는 중 / 중단) */
  shelf: ShelfKind;
  /** 연도 책장의 연도(아니면 null) */
  year: number | null;
  /** 이 책의 몇 번째 완독인지(1부터). 완독 기록이 아니면 0 */
  nth: number;
  /** 이 책을 완독한 횟수 */
  reads: number;
};

/** 연도 거르기: 'all' | 'unknown' | 'reading' | 'dropped' | '2026' 같은 연도 */
export type YearFilter = string;
/** 별점 거르기: 전체 / 4.5 이상 / 4 이상 / 3 이하 / 별점 없음 */
export type RatingFilter = 'all' | 'gte4.5' | 'gte4' | 'lte3' | 'none';
export type ListSort = 'newest' | 'oldest' | 'title' | 'rating' | 'pages';

export type ListFilter = {
  q: string;
  year: YearFilter;
  /** 분야('' = 전체) */
  category: string;
  rating: RatingFilter;
  /** 두 번 이상 완독한 책만, 같은 책끼리 붙여서 */
  reread: boolean;
  sort: ListSort;
};

export const EMPTY_FILTER: ListFilter = {
  q: '',
  year: 'all',
  category: '',
  rating: 'all',
  reread: false,
  sort: 'newest',
};

/** 정렬만 빼고 무엇이든 거르고 있으면 true (초기화 버튼을 보여 줌) */
export function isFiltered(f: ListFilter): boolean {
  return (
    f.q.trim() !== '' || f.year !== 'all' || f.category !== '' || f.rating !== 'all' || f.reread
  );
}

/** 완독 기록을 읽은 순서로: 완독일 → 완독일 없는 기록(만든 순) */
function readOrder(a: ShelfSpine, b: ShelfSpine): number {
  const fa = a.finishedAt ?? '9999';
  const fb = b.finishedAt ?? '9999';
  if (fa !== fb) return fa < fb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** 책장 데이터를 목록 줄로 (읽는 중·중단 기록도 포함) */
export function listRows(shelves: readonly ShelfYear[]): ListRow[] {
  const finishedByBook = new Map<string, ShelfSpine[]>();
  for (const shelf of shelves) {
    if (shelf.kind !== 'year' && shelf.kind !== 'unknown') continue;
    for (const s of shelf.spines) {
      finishedByBook.set(s.bookId, [...(finishedByBook.get(s.bookId) ?? []), s]);
    }
  }
  const nthOf = new Map<string, number>();
  for (const list of finishedByBook.values()) {
    [...list].sort(readOrder).forEach((s, i) => nthOf.set(s.readingId, i + 1));
  }
  return shelves.flatMap((shelf) =>
    shelf.spines.map((spine) => ({
      spine,
      shelf: shelf.kind,
      year: shelf.year,
      nth: nthOf.get(spine.readingId) ?? 0,
      reads: finishedByBook.get(spine.bookId)?.length ?? 0,
    })),
  );
}

/** 검색용: 소문자로, 띄어쓰기는 지움 ("해리 포터" = "해리포터") */
export function normalizeQuery(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, '');
}

function matchesYear(row: ListRow, year: YearFilter): boolean {
  if (year === 'all') return true;
  if (year === 'unknown' || year === 'reading' || year === 'dropped') return row.shelf === year;
  return row.shelf === 'year' && String(row.year) === year;
}

function matchesRating(rating: number | null, f: RatingFilter): boolean {
  if (f === 'all') return true;
  if (f === 'none') return rating === null;
  if (rating === null) return false;
  if (f === 'gte4.5') return rating >= 4.5;
  if (f === 'gte4') return rating >= 4;
  return rating <= 3;
}

/** 최신순: 완독일이 늦은 것부터, 완독일 없는 기록은 끝(그 안에서는 최근에 만든 것부터) */
function newest(a: ListRow, b: ListRow): number {
  const fa = a.spine.finishedAt;
  const fb = b.spine.finishedAt;
  if (fa !== fb) {
    if (fa === null) return 1;
    if (fb === null) return -1;
    return fa < fb ? 1 : -1;
  }
  const ca = a.spine.createdAt;
  const cb = b.spine.createdAt;
  return ca < cb ? 1 : ca > cb ? -1 : 0;
}

function oldest(a: ListRow, b: ListRow): number {
  const fa = a.spine.finishedAt;
  const fb = b.spine.finishedAt;
  if (fa !== fb) {
    if (fa === null) return 1;
    if (fb === null) return -1;
    return fa < fb ? -1 : 1;
  }
  const ca = a.spine.createdAt;
  const cb = b.spine.createdAt;
  return ca < cb ? -1 : ca > cb ? 1 : 0;
}

const COMPARE: Record<ListSort, (a: ListRow, b: ListRow) => number> = {
  newest,
  oldest,
  title: (a, b) => a.spine.title.localeCompare(b.spine.title, 'ko') || newest(a, b),
  // 별점 높은 것부터, 별점 없음은 끝
  rating: (a, b) => (b.spine.rating ?? -1) - (a.spine.rating ?? -1) || newest(a, b),
  // 두꺼운 책부터, 쪽수 모름은 끝
  pages: (a, b) => (b.spine.knownPages ?? -1) - (a.spine.knownPages ?? -1) || newest(a, b),
};

/** 검색·거르기·정렬. 다시 읽은 책 보기에서는 같은 책 기록을 첫 줄 자리에 읽은 순서로 붙입니다. */
export function filterRows(rows: readonly ListRow[], f: ListFilter): ListRow[] {
  const q = normalizeQuery(f.q);
  const hit = rows.filter(
    (r) =>
      (q === '' ||
        normalizeQuery(r.spine.title).includes(q) ||
        normalizeQuery(r.spine.author ?? '').includes(q)) &&
      matchesYear(r, f.year) &&
      (f.category === '' || r.spine.category === f.category) &&
      matchesRating(r.spine.rating, f.rating) &&
      (!f.reread || r.reads >= 2),
  );
  const sorted = hit.sort(COMPARE[f.sort]);
  if (!f.reread) return sorted;

  const groups = new Map<string, ListRow[]>();
  for (const r of sorted) groups.set(r.spine.bookId, [...(groups.get(r.spine.bookId) ?? []), r]);
  // 완독 기록은 읽은 순서(1회째, 2회째…), 읽는 중·중단 기록은 그 뒤
  return [...groups.values()].flatMap((g) =>
    g.sort((a, b) => (a.nth || Infinity) - (b.nth || Infinity) || oldest(a, b)),
  );
}

export type ListSummary = {
  /** 줄(기록) 수 */
  count: number;
  /** 쪽수를 아는 책의 쪽수 합 */
  pages: number;
  /** 별점 평균(별점 있는 기록만, 소수 첫째 자리). 없으면 null */
  rating: number | null;
};

export function summarizeRows(rows: readonly ListRow[]): ListSummary {
  const rated = rows.filter((r) => r.spine.rating !== null);
  const sum = rated.reduce((s, r) => s + (r.spine.rating ?? 0), 0);
  return {
    count: rows.length,
    pages: rows.reduce((s, r) => s + (r.spine.knownPages ?? 0), 0),
    rating: rated.length > 0 ? Math.round((sum / rated.length) * 10) / 10 : null,
  };
}

/** 분야 거르기에 보여 줄 분야: 목록에 있는 분야만, 가나다순 */
export function rowCategories(rows: readonly ListRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) if (r.spine.category) set.add(r.spine.category);
  return [...set].sort((a, b) => a.localeCompare(b, 'ko'));
}

/** 연도 거르기에 보여 줄 연도: 기록이 있는 연도만, 최신부터 */
export function rowYears(rows: readonly ListRow[]): number[] {
  const set = new Set<number>();
  for (const r of rows) if (r.shelf === 'year' && r.year !== null) set.add(r.year);
  return [...set].sort((a, b) => b - a);
}
