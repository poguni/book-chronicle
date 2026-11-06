import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTER,
  filterRows,
  isFiltered,
  listRows,
  normalizeQuery,
  rowCategories,
  rowYears,
  summarizeRows,
  type ListFilter,
} from '../../src/lib/listView';
import { buildShelves, type BookRow, type ReadingRow } from '../../src/lib/shelves';

const T = '2026-01-01T00:00:00Z';

function book(id: string, over: Partial<BookRow> = {}): BookRow {
  return {
    id,
    user_id: 'u',
    title: `책 ${id}`,
    author: null,
    publisher: null,
    pub_date: null,
    isbn13: null,
    pages: 300,
    pages_estimated: false,
    category: '소설/시/희곡',
    category_raw: null,
    size: null,
    spine: { palette: { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' }, pattern: null },
    cover_path: null,
    texture_path: null,
    source: 'manual',
    created_at: T,
    updated_at: T,
    ...over,
  };
}

function reading(
  id: string,
  bookId: string,
  finishedAt: string | null,
  over: Partial<ReadingRow> = {},
): ReadingRow {
  return {
    id,
    user_id: 'u',
    book_id: bookId,
    status: 'finished',
    started_at: null,
    finished_at: finishedAt,
    date_approx: false,
    year: finishedAt ? Number(finishedAt.slice(0, 4)) : null,
    rating: null,
    note: null,
    shelf_position: null,
    created_at: T,
    updated_at: T,
    ...over,
  };
}

// 데미안: 2024·2026에 두 번 읽음 / 코스모스: 2025 / 해리 포터: 연도 미상 / 파친코: 읽는 중 / 율리시스: 중단
const books = [
  book('demian', { title: '데미안', author: '헤르만 헤세', pages: 248 }),
  book('cosmos', { title: '코스모스', author: '칼 세이건', pages: 719, category: '과학' }),
  book('harry', { title: '해리 포터와 마법사의 돌', author: 'J.K. 롤링', pages: null }),
  book('pachinko', { title: '파친코', author: '이민진', pages: 500 }),
  book('ulysses', { title: '율리시스', author: '제임스 조이스', pages: 1000 }),
];
const readings = [
  reading('d2', 'demian', '2026-03-01', { rating: 5 }),
  reading('d1', 'demian', '2024-05-01', { rating: 4 }),
  reading('c1', 'cosmos', '2025-07-10', { rating: 4.5 }),
  reading('h1', 'harry', null, { created_at: '2025-01-02T00:00:00Z' }),
  reading('p1', 'pachinko', null, { status: 'reading', created_at: '2026-02-01T00:00:00Z' }),
  reading('u1', 'ulysses', null, { status: 'dropped', rating: 2 }),
];
const rows = listRows(buildShelves(books, readings, [], {}, 2026));
const ids = (f: Partial<ListFilter>) =>
  filterRows(rows, { ...EMPTY_FILTER, ...f }).map((r) => r.spine.readingId);

describe('listRows', () => {
  it('읽는 중·중단을 포함한 모든 기록이 한 줄씩', () => {
    expect(rows.map((r) => r.spine.readingId).sort()).toEqual(
      ['c1', 'd1', 'd2', 'h1', 'p1', 'u1'].sort(),
    );
  });

  it('몇 번째 완독인지와 완독 횟수를 센다 (완독이 아니면 0번째)', () => {
    const by = Object.fromEntries(rows.map((r) => [r.spine.readingId, r]));
    expect([by.d1?.nth, by.d2?.nth, by.d2?.reads]).toEqual([1, 2, 2]);
    expect([by.c1?.nth, by.c1?.reads]).toEqual([1, 1]);
    expect([by.p1?.nth, by.p1?.reads]).toEqual([0, 0]);
    expect(by.h1?.shelf).toBe('unknown');
  });
});

describe('filterRows', () => {
  it('기본은 완독일 최신순, 완독일 없는 기록은 끝(최근에 만든 것부터)', () => {
    expect(ids({})).toEqual(['d2', 'c1', 'd1', 'p1', 'u1', 'h1']);
  });

  it('오래된 순: 완독일 없는 기록은 여전히 끝', () => {
    expect(ids({ sort: 'oldest' }).slice(0, 3)).toEqual(['d1', 'c1', 'd2']);
  });

  it('제목 가나다순 / 별점순(없음은 끝) / 쪽수순(모름은 끝)', () => {
    expect(ids({ sort: 'title' })).toEqual(['d2', 'd1', 'u1', 'c1', 'p1', 'h1']);
    expect(ids({ sort: 'rating' }).slice(0, 4)).toEqual(['d2', 'c1', 'd1', 'u1']);
    expect(ids({ sort: 'pages' }).at(-1)).toBe('h1');
    expect(ids({ sort: 'pages' })[0]).toBe('u1');
  });

  it('제목·저자 검색은 대소문자와 띄어쓰기를 가리지 않는다', () => {
    expect(ids({ q: '해리포터' })).toEqual(['h1']);
    expect(ids({ q: 'j.k.' })).toEqual(['h1']);
    expect(ids({ q: '헤 세' })).toEqual(['d2', 'd1']);
    expect(ids({ q: '  ' })).toHaveLength(6);
  });

  it('연도 거르기: 연도 / 연도 미상 / 읽는 중 / 중단', () => {
    expect(ids({ year: '2024' })).toEqual(['d1']);
    expect(ids({ year: 'unknown' })).toEqual(['h1']);
    expect(ids({ year: 'reading' })).toEqual(['p1']);
    expect(ids({ year: 'dropped' })).toEqual(['u1']);
  });

  it('분야·별점 거르기', () => {
    expect(ids({ category: '과학' })).toEqual(['c1']);
    expect(ids({ rating: 'gte4.5' })).toEqual(['d2', 'c1']);
    expect(ids({ rating: 'gte4' })).toEqual(['d2', 'c1', 'd1']);
    expect(ids({ rating: 'lte3' })).toEqual(['u1']);
    expect(ids({ rating: 'none' })).toEqual(['p1', 'h1']);
  });

  it('다시 읽은 책: 두 번 이상 완독한 책만, 읽은 순서로 붙여서', () => {
    expect(ids({ reread: true })).toEqual(['d1', 'd2']);
  });

  it('다시 읽은 책 묶음은 고른 정렬에서 그 책이 처음 나온 자리에 놓인다', () => {
    const more = [...readings, reading('c2', 'cosmos', '2026-06-01')];
    const r = listRows(buildShelves(books, more, [], {}, 2026));
    const f = { ...EMPTY_FILTER, reread: true };
    expect(filterRows(r, f).map((x) => x.spine.readingId)).toEqual(['c1', 'c2', 'd1', 'd2']);
  });

  it('조건을 함께 쓰면 모두 맞는 것만', () => {
    expect(ids({ q: '데미안', rating: 'gte4.5' })).toEqual(['d2']);
    expect(ids({ q: '데미안', year: '2025' })).toEqual([]);
  });
});

describe('요약과 거르기 목록', () => {
  it('줄 수, 아는 쪽수 합, 별점 평균(별점 있는 것만)', () => {
    expect(summarizeRows(rows)).toEqual({
      count: 6,
      pages: 248 * 2 + 719 + 500 + 1000,
      rating: Math.round(((5 + 4 + 4.5 + 2) / 4) * 10) / 10,
    });
    expect(summarizeRows([])).toEqual({ count: 0, pages: 0, rating: null });
  });

  it('분야는 가나다순, 연도는 최신부터 (기록 있는 것만)', () => {
    expect(rowCategories(rows)).toEqual(['과학', '소설/시/희곡']);
    expect(rowYears(rows)).toEqual([2026, 2025, 2024]);
  });

  it('정렬만 바꾼 것은 거른 것이 아니다', () => {
    expect(isFiltered(EMPTY_FILTER)).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, sort: 'title' })).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, q: ' ' })).toBe(false);
    expect(isFiltered({ ...EMPTY_FILTER, reread: true })).toBe(true);
  });

  it('검색어 정규화', () => {
    expect(normalizeQuery(' Harry  Potter ')).toBe('harrypotter');
  });
});
