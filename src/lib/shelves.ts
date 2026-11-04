// 완독 기록을 연도별 책장으로 묶는 순수 함수 (PRD F4, 결정 0001-5·6·7)
import type { Database } from './database.types';
import { hueKey } from './spine/color';
import { categoryAveragePages, effectivePages, spineHeight } from './spine/geometry';
import { patternFor, type Pattern } from './spine/patterns';
import { parseSpineData, type Palette } from './spine/spineData';

type Tables = Database['bookchronicle']['Tables'];
export type BookRow = Tables['books']['Row'];
export type ReadingRow = Tables['readings']['Row'];
export type YearRow = Tables['years']['Row'];

/** 책장에 꽂힌 책등 하나 = 완독 기록 하나 */
export type ShelfSpine = {
  readingId: string;
  bookId: string;
  title: string;
  author: string | null;
  category: string | null;
  /** 두께 계산용 쪽수(모르면 추정값) */
  pages: number;
  /** 책에 적힌 쪽수(모르면 null) */
  knownPages: number | null;
  estimated: boolean;
  height: number;
  palette: Palette;
  pattern: Pattern;
  finishedAt: string | null;
  rating: number | null;
  createdAt: string;
  isBookOfYear: boolean;
};

export type ShelfYear = {
  /** 연도. 완독일이 없는 기록을 모은 칸은 null(연도 미상) */
  year: number | null;
  spines: ShelfSpine[];
  count: number;
  pages: number;
  bookOfYearTitle: string | null;
};

export type SortKey = 'date' | 'color' | 'category';

function byDate(a: ShelfSpine, b: ShelfSpine): number {
  const fa = a.finishedAt ?? '';
  const fb = b.finishedAt ?? '';
  if (fa !== fb) return fa < fb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** 완독일순(기본) / 색상순 / 분야순. 같으면 완독일순 */
export function sortSpines(spines: readonly ShelfSpine[], key: SortKey): ShelfSpine[] {
  const list = [...spines];
  if (key === 'color') {
    return list.sort((a, b) => hueKey(a.palette.base) - hueKey(b.palette.base) || byDate(a, b));
  }
  if (key === 'category') {
    return list.sort((a, b) => {
      const ca = a.category ?? '￿';
      const cb = b.category ?? '￿';
      return ca === cb ? byDate(a, b) : ca.localeCompare(cb, 'ko');
    });
  }
  return list.sort(byDate);
}

/**
 * 연도별 책장. 최신 연도가 위, 올해는 비어 있어도 늘 있고, 지난 빈 해는 빼며,
 * "연도 미상"(완독했지만 완독일 없음)은 맨 아래. 읽는 중·중단 기록은 꽂지 않습니다.
 */
export function buildShelves(
  books: readonly BookRow[],
  readings: readonly ReadingRow[],
  years: readonly YearRow[],
  patternMap: Readonly<Record<string, Pattern>>,
  currentYear: number,
): ShelfYear[] {
  const bookById = new Map(books.map((b) => [b.id, b]));
  const averages = categoryAveragePages(books);
  const bookOfYear = new Map(years.map((y) => [y.year, y.book_of_year[0] ?? null]));

  const groups = new Map<number | null, ShelfSpine[]>([[currentYear, []]]);
  for (const r of readings) {
    if (r.status !== 'finished') continue;
    const book = bookById.get(r.book_id);
    if (!book) continue;
    const spine = parseSpineData(book.spine, book.id);
    const { pages, estimated } = effectivePages(book, averages);
    const list = groups.get(r.year) ?? [];
    list.push({
      readingId: r.id,
      bookId: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      pages,
      knownPages: book.pages,
      estimated,
      height: spineHeight(book.id),
      palette: spine.palette,
      pattern: patternFor(spine.pattern, book.category, patternMap),
      finishedAt: r.finished_at,
      rating: r.rating === null ? null : Number(r.rating),
      createdAt: r.created_at,
      isBookOfYear: r.year !== null && bookOfYear.get(r.year) === book.id,
    });
    groups.set(r.year, list);
  }

  const order = [...groups.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });

  return order.map((year) => {
    const spines = sortSpines(groups.get(year) ?? [], 'date');
    const boyId = year === null ? null : bookOfYear.get(year);
    return {
      year,
      spines,
      count: spines.length,
      pages: spines.reduce((sum, s) => sum + (s.knownPages ?? 0), 0),
      bookOfYearTitle: (boyId && bookById.get(boyId)?.title) || null,
    };
  });
}
