// 완독 기록을 연도별 책장으로 묶는 순수 함수 (PRD F4, 결정 0001-5·6·7)
import type { Database } from './database.types';
import type { ReadingStatus } from './bookForm';
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
  status: ReadingStatus;
  finishedAt: string | null;
  rating: number | null;
  createdAt: string;
  /** 끌어 옮겨 정한 책장 안 순서(없으면 null) */
  position: number | null;
  isBookOfYear: boolean;
};

/** year: 연도 책장 / unknown: 완독일 없는 완독(연도 미상) / reading: 읽는 중 / dropped: 중단한 책 */
export type ShelfKind = 'year' | 'unknown' | 'reading' | 'dropped';

export type ShelfYear = {
  kind: ShelfKind;
  /** 연도. 연도 책장이 아니면 null */
  year: number | null;
  spines: ShelfSpine[];
  count: number;
  pages: number;
  bookOfYearTitle: string | null;
};

export type SortKey = 'manual' | 'date' | 'color' | 'category';

function byDate(a: ShelfSpine, b: ShelfSpine): number {
  const fa = a.finishedAt ?? '';
  const fb = b.finishedAt ?? '';
  if (fa !== fb) return fa < fb ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * 내 순서(기본) / 완독일순 / 색상순 / 분야순. 같으면 완독일순.
 * 내 순서: 끌어 옮겨 정한 순서대로, 순서가 없는 책(새로 꽂은 책)은 그 뒤에 완독일순 (결정 0009)
 */
export function sortSpines(spines: readonly ShelfSpine[], key: SortKey): ShelfSpine[] {
  const list = [...spines];
  if (key === 'manual') {
    return list.sort((a, b) => {
      if (a.position !== null && b.position !== null && a.position !== b.position)
        return a.position - b.position;
      if (a.position !== null && b.position === null) return -1;
      if (a.position === null && b.position !== null) return 1;
      return byDate(a, b);
    });
  }
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
 * 책장 목록. 맨 위에 "읽는 중"(있을 때만), 이어서 연도 책장(최신 연도가 위, 올해는 비어 있어도 늘 있고,
 * 지난 빈 해는 뺌), "연도 미상"(완독했지만 완독일 없음), 맨 아래 "중단한 책"(있을 때만).
 * 읽는 중·중단 기록은 연도 책장과 통계에 넣지 않습니다(결정 0006).
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
  const reading: ShelfSpine[] = [];
  const dropped: ShelfSpine[] = [];
  for (const r of readings) {
    const status: ReadingStatus =
      r.status === 'reading' || r.status === 'dropped' ? r.status : 'finished';
    const book = bookById.get(r.book_id);
    if (!book) continue;
    const spine = parseSpineData(book.spine, book.id);
    const { pages, estimated } = effectivePages(book, averages);
    const spineItem: ShelfSpine = {
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
      status,
      finishedAt: status === 'finished' ? r.finished_at : null,
      rating: r.rating === null ? null : Number(r.rating),
      createdAt: r.created_at,
      position: r.shelf_position ?? null,
      isBookOfYear: status === 'finished' && r.year !== null && bookOfYear.get(r.year) === book.id,
    };
    if (status === 'reading') reading.push(spineItem);
    else if (status === 'dropped') dropped.push(spineItem);
    else groups.set(r.year, [...(groups.get(r.year) ?? []), spineItem]);
  }

  const order = [...groups.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });

  const shelf = (kind: ShelfKind, year: number | null, list: ShelfSpine[]): ShelfYear => {
    const spines = sortSpines(list, 'date');
    const boyId = year === null ? null : bookOfYear.get(year);
    return {
      kind,
      year,
      spines,
      count: spines.length,
      pages: spines.reduce((sum, s) => sum + (s.knownPages ?? 0), 0),
      bookOfYearTitle: (boyId && bookById.get(boyId)?.title) || null,
    };
  };

  return [
    ...(reading.length > 0 ? [shelf('reading', null, reading)] : []),
    ...order.map((year) => shelf(year === null ? 'unknown' : 'year', year, groups.get(year) ?? [])),
    ...(dropped.length > 0 ? [shelf('dropped', null, dropped)] : []),
  ];
}
