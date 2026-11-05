import { describe, expect, it } from 'vitest';
import {
  buildShelves,
  findSpine,
  sortReadings,
  sortSpines,
  type BookRow,
  type ReadingRow,
  type YearRow,
} from '../../src/lib/shelves';
import {
  averageRating,
  monthCounts,
  ringCount,
  topCategory,
  yearBands,
  yearRings,
  yearSummary,
} from '../../src/lib/stats';

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

function palette(base: string) {
  return { palette: { base, band: '#000000', accent: '#000000' } };
}

const noYears: YearRow[] = [];

describe('buildShelves', () => {
  it('올해는 비어 있어도 있고, 최신 연도가 위, 지난 빈 해는 없다', () => {
    const shelves = buildShelves(
      [book('a'), book('b')],
      [reading('r1', 'a', '2024-03-01'), reading('r2', 'b', '2022-05-01')],
      noYears,
      {},
      2026,
    );
    expect(shelves.map((s) => s.year)).toEqual([2026, 2024, 2022]);
    expect(shelves[0]?.count).toBe(0);
  });

  it('완독일순으로 꽂고, 권수·쪽수를 센다', () => {
    const shelves = buildShelves(
      [book('a', { pages: 100 }), book('b', { pages: 250 }), book('c', { pages: null })],
      [
        reading('r1', 'a', '2026-09-01'),
        reading('r2', 'b', '2026-02-01'),
        reading('r3', 'c', '2026-05-01'),
      ],
      noYears,
      {},
      2026,
    );
    const y = shelves[0]!;
    expect(y.spines.map((s) => s.bookId)).toEqual(['b', 'c', 'a']);
    expect(y.count).toBe(3);
    expect(y.pages).toBe(350); // 쪽수를 모르는 책은 더하지 않음
    expect(y.spines[1]?.estimated).toBe(true);
  });

  it('다시 읽은 책은 해마다, 같은 해 두 번이면 두 권', () => {
    const shelves = buildShelves(
      [book('a')],
      [
        reading('r1', 'a', '2025-01-01'),
        reading('r2', 'a', '2026-01-01'),
        reading('r3', 'a', '2026-08-01'),
      ],
      noYears,
      {},
      2026,
    );
    expect(shelves.find((s) => s.year === 2026)?.count).toBe(2);
    expect(shelves.find((s) => s.year === 2025)?.count).toBe(1);
  });

  it('읽는 중은 맨 위, 중단한 책은 맨 아래, 완독일 없는 완독은 그 사이 연도 미상', () => {
    const shelves = buildShelves(
      [book('a'), book('b'), book('c'), book('d')],
      [
        reading('r1', 'a', null, { status: 'reading' }),
        reading('r2', 'b', '2026-01-02', { status: 'dropped' }),
        reading('r3', 'c', null),
        reading('r4', 'd', '2023-01-01'),
      ],
      noYears,
      {},
      2026,
    );
    expect(shelves.map((s) => [s.kind, s.year])).toEqual([
      ['reading', null],
      ['year', 2026],
      ['year', 2023],
      ['unknown', null],
      ['dropped', null],
    ]);
    expect(shelves[0]?.spines.map((s) => [s.bookId, s.status])).toEqual([['a', 'reading']]);
    expect(shelves.at(-1)?.spines.map((s) => s.bookId)).toEqual(['b']);
    // 중단한 기록은 완독일이 있어도 올해 책장·통계에 들어가지 않는다
    expect(shelves[1]?.count).toBe(0);
    expect(yearSummary(shelves, 2026).books).toBe(0);
    expect(yearBands(shelves).map((b) => b.year)).toEqual([2026, 2023]);
  });

  it('읽는 중·중단한 책이 없으면 그 선반도 없다', () => {
    const shelves = buildShelves(
      [book('a')],
      [reading('r1', 'a', '2026-01-01')],
      noYears,
      {},
      2026,
    );
    expect(shelves.map((s) => s.kind)).toEqual(['year']);
  });

  it('그해의 책에 표시하고 제목을 머리글에 쓴다', () => {
    const shelves = buildShelves(
      [book('a'), book('b')],
      [reading('r1', 'a', '2026-01-01'), reading('r2', 'b', '2026-02-01')],
      [
        {
          user_id: 'u',
          year: 2026,
          book_of_year: ['b'],
          one_liner: null,
          reading_goal: null,
          updated_at: T,
        },
      ],
      {},
      2026,
    );
    expect(shelves[0]?.bookOfYearTitle).toBe('책 b');
    expect(shelves[0]?.spines.map((s) => s.isBookOfYear)).toEqual([false, true]);
  });

  it('사용자 패턴 매핑을 따른다', () => {
    const shelves = buildShelves(
      [book('a')],
      [reading('r1', 'a', '2026-01-01')],
      noYears,
      { '소설/시/희곡': 'hardcover' },
      2026,
    );
    expect(shelves[0]?.spines[0]?.pattern).toBe('hardcover');
  });
});

describe('sortSpines', () => {
  const shelves = buildShelves(
    [
      book('red', { category: '역사', spine: palette('#C0392B') }),
      book('blue', { category: '과학', spine: palette('#2F4F6F') }),
      book('green', { category: '역사', spine: palette('#3F8F6B') }),
    ],
    [
      reading('1', 'blue', '2026-01-01'),
      reading('2', 'green', '2026-02-01'),
      reading('3', 'red', '2026-03-01'),
    ],
    noYears,
    {},
    2026,
  );
  const spines = shelves[0]!.spines;

  it('색상순', () => {
    expect(sortSpines(spines, 'color').map((s) => s.bookId)).toEqual(['red', 'green', 'blue']);
  });

  it('분야순(같은 분야는 완독일순)', () => {
    expect(sortSpines(spines, 'category').map((s) => s.bookId)).toEqual(['blue', 'green', 'red']);
  });

  it('내 순서: 정한 순서대로, 순서 없는 새 책은 뒤에 완독일순', () => {
    const placed = spines.map((s) =>
      s.bookId === 'red' ? { ...s, position: 0 } : s.bookId === 'green' ? { ...s, position: 1 } : s,
    );
    expect(sortSpines(placed, 'manual').map((s) => s.bookId)).toEqual(['red', 'green', 'blue']);
    // 아무 순서도 없으면 완독일순과 같음
    expect(sortSpines(spines, 'manual').map((s) => s.bookId)).toEqual(['blue', 'green', 'red']);
  });

  it('기록의 shelf_position이 책등 position으로 옮겨진다', () => {
    const [shelf] = buildShelves(
      [book('a')],
      [reading('1', 'a', '2026-01-01', { shelf_position: 3 })],
      noYears,
      {},
      2026,
    );
    expect(shelf!.spines[0]!.position).toBe(3);
  });
});

describe('통계', () => {
  const shelves = buildShelves(
    [book('a', { pages: 100 }), book('b', { pages: 200, category: '역사' }), book('c'), book('d')],
    [
      reading('1', 'a', '2026-01-10', { rating: 4 }),
      reading('2', 'b', '2026-01-20', { rating: 4.5 }),
      reading('3', 'c', '2026-11-01'),
      reading('4', 'd', '2025-06-01', { rating: 3 }),
    ],
    noYears,
    {},
    2026,
  );
  const y2026 = shelves[0]!;

  it('올해 요약: 별점 없는 기록은 평균에서 뺀다', () => {
    expect(yearSummary(shelves, 2026)).toEqual({
      books: 3,
      pages: 600,
      averageRating: 4.3,
      diffFromLastYear: 2,
    });
    expect(averageRating([])).toBeNull();
  });

  it('작년 기록이 없으면 증감은 null', () => {
    expect(yearSummary(shelves, 2025).diffFromLastYear).toBeNull();
  });

  it('월별 권수와 가장 많이 읽은 분야', () => {
    expect(monthCounts(y2026.spines)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]);
    expect(topCategory(y2026.spines)).toBe('소설/시/희곡');
    expect(topCategory([])).toBeNull();
  });

  it('나이테 수와 연도 띠', () => {
    expect(ringCount(shelves, 2026)).toBe(2);
    expect(ringCount([], 2026)).toBe(1);
    const bands = yearBands(shelves);
    expect(bands.map((b) => [b.year, b.count])).toEqual([
      [2026, 3],
      [2025, 1],
    ]);
    expect(bands[0]?.segments[0]).toEqual({ pages: 100, color: '#2F4F6F' });
  });
});

describe('Phase 6: 별점순·쪽수순, 꺼내 보기 찾기, 나이테', () => {
  const shelves = buildShelves(
    [
      book('a', { pages: 100, cover_path: 'u/covers/a.jpg' }),
      book('b', { pages: 500 }),
      book('c', { pages: 300 }),
    ],
    [
      reading('1', 'a', '2026-01-01', { rating: 3 }),
      reading('2', 'b', '2026-02-01', { rating: null }),
      reading('3', 'c', '2026-03-01', { rating: 4.5 }),
      reading('4', 'a', '2025-05-01'),
    ],
    noYears,
    {},
    2026,
  );
  const spines = shelves.find((s) => s.year === 2026)!.spines;

  it('별점순은 높은 것부터, 별점 없음은 끝', () => {
    expect(sortSpines(spines, 'rating').map((s) => s.bookId)).toEqual(['c', 'a', 'b']);
  });

  it('쪽수순은 두꺼운 책부터', () => {
    expect(sortSpines(spines, 'pages').map((s) => s.bookId)).toEqual(['b', 'c', 'a']);
  });

  it('기록 ID로 책등을 찾고, 표지 경로를 담는다', () => {
    expect(findSpine(shelves, '4')?.finishedAt).toBe('2025-05-01');
    expect(findSpine(shelves, '1')?.coverPath).toBe('u/covers/a.jpg');
    expect(findSpine(shelves, 'none')).toBeNull();
  });

  it('한 책의 기록은 완독일순, 완독일 없는 기록은 끝', () => {
    const list = sortReadings([
      reading('x', 'a', null),
      reading('y', 'a', '2026-01-01'),
      reading('z', 'a', '2024-01-01'),
    ]);
    expect(list.map((r) => r.id)).toEqual(['z', 'y', 'x']);
  });

  it('나이테: 바깥 고리가 최근 연도, 원은 안으로 갈수록 작아지고 가운데 점으로 끝남', () => {
    const { discs, years } = yearRings(shelves, 132);
    expect(years).toEqual([2026, 2025]);
    expect(discs[0]!.size).toBe(132);
    expect(discs[0]!.background).toMatch(/^conic-gradient/);
    expect(discs[1]!.background).toBe('var(--ring-gap)');
    for (let i = 1; i < discs.length; i++)
      expect(discs[i]!.size).toBeLessThanOrEqual(discs[i - 1]!.size);
    expect(discs.at(-1)).toEqual({ size: 10, background: 'var(--accent)' });
    // 올해 3권 고리가 작년 1권 고리보다 두꺼움
    const thisYear = discs[0]!.size - discs[1]!.size;
    const lastYear = discs[2]!.size - discs[3]!.size;
    expect(thisYear).toBeGreaterThan(lastYear);
  });

  it('책이 없으면 가운데 점만', () => {
    const empty = buildShelves([], [], noYears, {}, 2026);
    expect(yearRings(empty).discs).toEqual([{ size: 10, background: 'var(--accent)' }]);
  });
});
