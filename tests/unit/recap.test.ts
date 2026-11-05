import { describe, expect, it } from 'vitest';
import { moveRank, toggleRank } from '../../src/lib/bookOfYear';
import { dateInYear, movedDate } from '../../src/lib/moveYear';
import {
  CARD_SIZES,
  cardCategories,
  cardColors,
  cardLayout,
  dominantColor,
  wrapLines,
} from '../../src/lib/recapCard';
import { buildShelves, type BookRow, type ReadingRow } from '../../src/lib/shelves';
import {
  bookOfYearCandidate,
  categoryShares,
  change,
  decemberNoticeDue,
  goalProgress,
  monthlySeries,
  OTHER_CATEGORY,
  yearsWithBooks,
  yearStats,
  yearTrend,
} from '../../src/lib/stats';
import { yearStyle } from '../../src/lib/yearStyle';

const T = '2026-01-01T00:00:00Z';
function book(id: string, over: Partial<BookRow> = {}): BookRow {
  return {
    id,
    user_id: 'u',
    isbn13: null,
    title: `책 ${id}`,
    author: null,
    publisher: null,
    pub_date: null,
    pages: 300,
    pages_estimated: false,
    category_raw: null,
    category: '소설',
    size: null,
    spine: { palette: { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' } },
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
  finished: string,
  rating: number | null = null,
): ReadingRow {
  return {
    id,
    user_id: 'u',
    book_id: bookId,
    status: 'finished',
    started_at: null,
    finished_at: finished,
    date_approx: false,
    year: Number(finished.slice(0, 4)),
    rating,
    note: null,
    shelf_position: null,
    created_at: T,
    updated_at: T,
  };
}

const shelves = buildShelves(
  [
    book('a', { pages: 100, category: '소설' }),
    book('b', { pages: 500, category: '역사' }),
    book('c', { pages: null, category: null }),
    book('d', { pages: 200, category: '소설' }),
    book('e', { pages: 300, category: '과학' }),
  ],
  [
    reading('1', 'a', '2026-01-10', 4),
    reading('2', 'b', '2026-01-20', 5),
    reading('3', 'c', '2026-03-01'),
    reading('4', 'd', '2025-02-01', 5),
    reading('5', 'e', '2025-02-02', 3),
  ],
  [],
  {},
  2026,
);

describe('연도 비교 통계 (PRD F5)', () => {
  it('책이 있는 연도, 최신이 앞(올해는 늘)', () => {
    expect(yearsWithBooks(shelves, 2026)).toEqual([2026, 2025]);
    expect(yearsWithBooks(shelves, 2027)).toEqual([2027, 2026, 2025]);
  });

  it('권수·총/평균 쪽수(아는 책만)·평균 별점·가장 두꺼운 책·최다 분야', () => {
    expect(yearStats(shelves, 2026)).toEqual({
      year: 2026,
      books: 3,
      totalPages: 600,
      averagePages: 300,
      averageRating: 4.5,
      thickest: { title: '책 b', pages: 500 },
      topCategory: '소설',
    });
    expect(yearStats(shelves, 2024)).toMatchObject({
      books: 0,
      averagePages: null,
      thickest: null,
    });
  });

  it('연도별 추이: 첫해부터 올해까지, 빈 해는 0, 오래된 해가 앞', () => {
    expect(yearTrend(shelves, 2026)).toEqual([
      { year: 2025, books: 2, pages: 500 },
      { year: 2026, books: 3, pages: 600 },
    ]);
    expect(yearTrend(shelves, 2028).map((t) => [t.year, t.books])).toEqual([
      [2025, 2],
      [2026, 3],
      [2027, 0],
      [2028, 0],
    ]);
  });

  it('증감: 차이와 %', () => {
    expect(change(14, 11)).toEqual({ delta: 3, percent: 27 });
    expect(change(4.2, 4.5)).toEqual({ delta: -0.3, percent: -7 });
    expect(change(3, 0)).toEqual({ delta: 3, percent: null });
    expect(change(null, 3)).toBeNull();
  });

  it('월별 권수·쪽수, 누적', () => {
    const spines = shelves.find((s) => s.year === 2026)!.spines;
    expect(monthlySeries(spines, 'books', false).slice(0, 4)).toEqual([2, 0, 1, 0]);
    expect(monthlySeries(spines, 'pages', false)[0]).toBe(600);
    const cum = monthlySeries(spines, 'books', true);
    expect(cum[2]).toBe(3);
    expect(cum[11]).toBe(3);
  });

  it('분야 비중: 전체 연도 기준 상위 N + 기타(분야 없음 포함), 고른 연도만 행', () => {
    const { categories, rows } = categoryShares(shelves, [2026, 2025], 2);
    expect(categories).toEqual(['소설', '과학', OTHER_CATEGORY]);
    expect(rows).toEqual([
      { year: 2026, counts: [1, 0, 2], total: 3 },
      { year: 2025, counts: [1, 1, 0], total: 2 },
    ]);
    // 고른 연도를 바꿔도 분야 순서(색)는 그대로
    expect(categoryShares(shelves, [2025], 2).categories.slice(0, 2)).toEqual(['소설', '과학']);
  });

  it('그해의 책 후보: 별점이 가장 높은 책(같으면 나중에 읽은 책)', () => {
    expect(bookOfYearCandidate(shelves, 2026)?.bookId).toBe('b');
    expect(bookOfYearCandidate(shelves, 2024)).toBeNull();
  });

  it('연도 색·선 모양은 연도를 따라가고, 고른 연도에 따라 바뀌지 않음', () => {
    const all = [2026, 2025, 2024];
    expect(yearStyle(all, 2026)).toEqual({ slot: 1, dash: [], point: 'circle' });
    expect(yearStyle(all, 2025).slot).toBe(2);
    expect(yearStyle(all, 2025).dash).not.toEqual([]);
  });
});

describe('회고 카드 (PRD F7)', () => {
  const all = { shelf: true, numbers: true, bookOfYear: true, oneLiner: true };

  it.each(Object.keys(CARD_SIZES) as (keyof typeof CARD_SIZES)[])(
    '%s: 모든 항목이 카드 안에 겹치지 않게 들어간다',
    (size) => {
      const l = cardLayout(size, all, { bookOfYear: true, oneLiner: true });
      expect(l.sections.map((s) => s.key)).toEqual([
        'header',
        'shelf',
        'numbers',
        'boy',
        'oneLiner',
      ]);
      for (let i = 1; i < l.sections.length; i++) {
        const prev = l.sections[i - 1]!;
        expect(l.sections[i]!.y).toBeGreaterThanOrEqual(prev.y + prev.h + 15);
      }
      const last = l.sections.at(-1)!;
      expect(last.y + last.h).toBeLessThanOrEqual(l.footerY);
      expect(l.sections[0]!.y).toBeGreaterThan(0);
    },
  );

  it('고르지 않은 항목과 내용이 없는 항목은 뺀다', () => {
    const l = cardLayout('square', { ...all, shelf: false }, { bookOfYear: false, oneLiner: true });
    expect(l.sections.map((s) => s.key)).toEqual(['header', 'numbers', 'oneLiner']);
  });

  it('줄바꿈: 띄어쓰기 우선, 긴 낱말은 글자 단위, 넘치면 …', () => {
    const m = (s: string) => s.length * 10;
    expect(wrapLines('천천히 그러나 꾸준히', 80, m, 3)).toEqual(['천천히 그러나', '꾸준히']);
    expect(wrapLines('가나다라마바사아자차', 40, m, 3)).toEqual(['가나다라', '마바사아', '자차']);
    expect(wrapLines('하나 둘 셋 넷 다섯 여섯', 30, m, 2)).toEqual(['하나', '둘…']);
  });

  it('책등 색 테마: 가장 많이 쓰인 바탕색(쪽수 가중), 글자는 대비가 큰 색', () => {
    const spines = [
      { pages: 100, height: 150, palette: { base: '#8E3B2F', band: '#fff', accent: '#000' } },
      { pages: 400, height: 150, palette: { base: '#1F2340', band: '#fff', accent: '#000' } },
    ];
    expect(dominantColor(spines)).toBe('#1F2340');
    const c = cardColors('spine', spines);
    expect(c.bg).toBe('#1F2340');
    expect(c.text).not.toBe(c.bg);
  });
});

describe('12월 안내 (PRD F6)', () => {
  const p = { booksThisYear: 3, bookOfYearChosen: false, seen: false };
  it('12월에, 책이 있고, 아직 고르지 않았고, 처음일 때만', () => {
    expect(decemberNoticeDue(new Date(2026, 11, 1), p)).toBe(true);
    expect(decemberNoticeDue(new Date(2026, 10, 30), p)).toBe(false);
    expect(decemberNoticeDue(new Date(2026, 11, 5), { ...p, booksThisYear: 0 })).toBe(false);
    expect(decemberNoticeDue(new Date(2026, 11, 5), { ...p, bookOfYearChosen: true })).toBe(false);
    expect(decemberNoticeDue(new Date(2026, 11, 5), { ...p, seen: true })).toBe(false);
  });
});

describe('그해의 책 순위 (PRD F6 P1)', () => {
  it('고른 순서가 순위, 빼면 아래가 올라옴, 세 권이 차면 그대로', () => {
    expect(toggleRank([], 'a')).toEqual({ list: ['a'], full: false });
    expect(toggleRank(['a', 'b', 'c'], 'b')).toEqual({ list: ['a', 'c'], full: false });
    expect(toggleRank(['a', 'b', 'c'], 'd')).toEqual({ list: ['a', 'b', 'c'], full: true });
  });

  it('순위 올리기·내리기, 끝에서는 그대로', () => {
    expect(moveRank(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
    expect(moveRank(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
    expect(moveRank(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(moveRank(['a', 'b'], 'z', 1)).toEqual(['a', 'b']);
  });

  it('책등에 순위가 붙고, 책장 머리는 1위', () => {
    const s = buildShelves(
      [book('a'), book('b')],
      [reading('1', 'a', '2026-01-10'), reading('2', 'b', '2026-02-10')],
      [
        {
          user_id: 'u',
          year: 2026,
          book_of_year: ['b', 'a'],
          one_liner: null,
          reading_goal: null,
          updated_at: T,
        },
      ],
      {},
      2026,
    );
    const y = s.find((x) => x.year === 2026)!;
    expect(y.spines.map((sp) => [sp.bookId, sp.bookOfYearRank])).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
    expect(y.bookOfYearTitle).toBe('책 b');
  });

  it('후보는 이미 고른 책을 뺀다', () => {
    expect(bookOfYearCandidate(shelves, 2026, ['b'])?.bookId).toBe('a');
    expect(bookOfYearCandidate(shelves, 2026, ['a', 'b'])).toBeNull();
  });
});

describe('회고 카드 분야형', () => {
  it('많은 순 상위 N + 나머지·분야 없음은 기타', () => {
    const cats = ['소설', '소설', '과학', '역사', '역사', '역사', null, '수학'];
    expect(cardCategories(cats, '기타', 2)).toEqual([
      { name: '역사', count: 3 },
      { name: '소설', count: 2 },
      { name: '기타', count: 3 },
    ]);
    expect(cardCategories(['과학'], '기타')).toEqual([{ name: '과학', count: 1 }]);
    // 같은 권수면 먼저 나온 분야가 앞(카드의 '가장 많이 읽은 분야'와 어긋나지 않게)
    expect(cardCategories(['인문', '경제', '경제', '인문', '과학'], '기타', 1)).toEqual([
      { name: '인문', count: 2 },
      { name: '기타', count: 3 },
    ]);
    expect(cardCategories([], '기타')).toEqual([]);
  });
});

describe('목표 권수 진행률', () => {
  it('목표가 없으면 null, 넘으면 막대는 가득·%는 그대로', () => {
    expect(goalProgress(3, null)).toBeNull();
    expect(goalProgress(12, 15)).toEqual({
      books: 12,
      goal: 15,
      ratio: 0.8,
      percent: 80,
      left: 3,
      done: false,
    });
    expect(goalProgress(18, 15)).toMatchObject({ ratio: 1, percent: 120, left: 0, done: true });
    expect(goalProgress(1, 3)?.percent).toBe(33);
  });
});

describe('다른 해로 옮길 때 완독일', () => {
  const today = new Date(2026, 10, 5);
  it('월·일은 그대로, 연도만 바꾼다. 그해에 없는 2월 29일은 28일', () => {
    expect(movedDate('2025-03-14', 2023, today)).toBe('2023-03-14');
    expect(movedDate('2024-02-29', 2025, today)).toBe('2025-02-28');
    expect(movedDate('2023-02-28', 2024, today)).toBe('2024-02-28');
  });
  it('완독일이 없으면(연도 미상) 오늘의 월·일', () => {
    expect(movedDate(null, 2022, today)).toBe('2022-11-05');
  });
  it('그해 안의 실제 날짜인지', () => {
    expect(dateInYear('2024-02-29', 2024)).toBe(true);
    expect(dateInYear('2025-02-29', 2025)).toBe(false);
    expect(dateInYear('2025-03-14', 2024)).toBe(false);
    expect(dateInYear('', 2024)).toBe(false);
  });
});
