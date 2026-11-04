import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  decodeCsv,
  findDuplicate,
  isGoodreads,
  matchCandidates,
  parseCsv,
  parseDate,
  parsePages,
  parseRating,
  parseStatus,
  readRows,
  suggestMapping,
} from '../../src/lib/csv';

describe('인코딩', () => {
  // 확장 글자(똠 등)는 Node의 디코더가 못 읽어 브라우저 E2E(importBackup.spec.ts)에서 확인합니다.
  it('CP949(엑셀 한글) 파일을 알아보고 읽는다', () => {
    const bytes = readFileSync(new URL('../fixtures/cp949.csv', import.meta.url));
    const { text, encoding } = decodeCsv(bytes);
    expect(encoding).toBe('euc-kr');
    expect(text).toContain('작별하지 않는다');
    expect(text).toContain('방각하,김사량');
  });

  it('UTF-8은 그대로, 맨 앞 BOM은 뗀다', () => {
    const bytes = new TextEncoder().encode('\uFEFF제목,저자\n데미안,헤세');
    const { text, encoding } = decodeCsv(bytes);
    expect(encoding).toBe('utf-8');
    expect(text.startsWith('제목')).toBe(true);
  });

  it('인코딩을 직접 고를 수 있다', () => {
    const bytes = readFileSync(new URL('../fixtures/cp949.csv', import.meta.url));
    expect(decodeCsv(bytes, 'utf-8').text).not.toContain('작별');
  });
});

describe('CSV 읽기', () => {
  it('따옴표 안 쉼표·줄바꿈, 빈 줄', () => {
    const { headers, rows } = parseCsv('제목,메모\n"총, 균, 쇠","두 줄\n메모"\n\n데미안,\n');
    expect(headers).toEqual(['제목', '메모']);
    expect(rows).toEqual([
      ['총, 균, 쇠', '두 줄\n메모'],
      ['데미안', ''],
    ]);
  });
});

describe('날짜 형식 (PRD F3)', () => {
  it.each([
    ['2025-03-14', '2025-03-14', false],
    ['2025.3.14', '2025-03-14', false],
    ['2025. 3. 14.', '2025-03-14', false],
    ['2025/03/14', '2025-03-14', false],
    ['20250314', '2025-03-14', false],
    ['2025년 3월 14일', '2025-03-14', false],
    ['2025-03', '2025-03-15', true],
    ['2025.3', '2025-03-15', true],
    ['2025년 3월', '2025-03-15', true],
  ])('%s → %s (일 미상 %s)', (input, date, approx) => {
    expect(parseDate(input)).toEqual({ date, approx });
  });

  it('없는 날짜·모르는 형식은 null', () => {
    expect(parseDate('2025-02-30')).toBeNull();
    expect(parseDate('2025-13-01')).toBeNull();
    expect(parseDate('지난봄')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('별점·쪽수·상태', () => {
  it('별점: 숫자, 분수, 별 글자, 10점 만점, 0.5 단위 반올림', () => {
    expect(parseRating('4.5')).toBe(4.5);
    expect(parseRating('4/5')).toBe(4);
    expect(parseRating('8/10')).toBe(4);
    expect(parseRating('9')).toBe(4.5);
    expect(parseRating('★★★★☆')).toBe(4);
    expect(parseRating('★★★½')).toBe(3.5);
    expect(parseRating('3.7')).toBe(3.5);
    expect(parseRating('0')).toBe(0);
    expect(parseRating('0', true)).toBeNull();
    expect(parseRating('좋음')).toBeNull();
  });

  it('쪽수', () => {
    expect(parsePages('332')).toBe(332);
    expect(parsePages('332쪽')).toBe(332);
    expect(parsePages('1,024 p.')).toBe(1024);
    expect(parsePages('모름')).toBeNull();
  });

  it('상태: 비어 있으면 완독, 아직 안 읽은 책은 건너뜀', () => {
    expect(parseStatus('')).toBe('finished');
    expect(parseStatus('완독')).toBe('finished');
    expect(parseStatus('read')).toBe('finished');
    expect(parseStatus('읽는 중')).toBe('reading');
    expect(parseStatus('currently-reading')).toBe('reading');
    expect(parseStatus('중단')).toBe('dropped');
    expect(parseStatus('to-read')).toBe('skip');
  });
});

describe('열 매핑 추천', () => {
  it('한국어 열 이름', () => {
    const m = suggestMapping([
      '도서명',
      '지은이',
      'ISBN',
      '페이지',
      '다 읽은 날',
      '평점',
      '한줄평',
    ]);
    expect(m).toMatchObject({
      title: 0,
      author: 1,
      isbn: 2,
      pages: 3,
      finishedAt: 4,
      rating: 5,
      note: 6,
      category: null,
    });
  });

  it('Goodreads 내보내기(P1 프리셋)', () => {
    const headers = [
      'Book Id',
      'Title',
      'Author',
      'Author l-f',
      'Additional Authors',
      'ISBN',
      'ISBN13',
      'My Rating',
      'Number of Pages',
      'Date Read',
      'Exclusive Shelf',
      'My Review',
    ];
    expect(isGoodreads(headers)).toBe(true);
    const m = suggestMapping(headers);
    expect(m).toMatchObject({
      title: 1,
      author: 2,
      rating: 7,
      pages: 8,
      finishedAt: 9,
      status: 10,
      note: 11,
    });
    expect([5, 6]).toContain(m.isbn);
    const { rows, skipped } = readRows(
      [
        [
          '1',
          'Demian',
          'Hermann Hesse',
          '',
          '',
          '="0553212974"',
          '="9780553212976"',
          '0',
          '176',
          '2024/05/02',
          'read',
          '',
        ],
        ['2', 'Dune', 'Frank Herbert', '', '', '', '', '0', '', '', 'to-read', ''],
      ],
      m,
      { goodreads: true },
    );
    expect(skipped).toEqual([{ line: 3, reason: 'to_read' }]);
    expect(rows[0]).toMatchObject({
      title: 'Demian',
      isbn13: '9780553212976',
      rating: null,
      pages: 176,
      finishedAt: '2024-05-02',
      status: 'finished',
      problems: [],
    });
  });

  it('제목 없는 행은 빼고, 읽지 못한 값은 problems로 알린다', () => {
    const m = suggestMapping(['제목', '완독일', '별점']);
    const { rows, skipped } = readRows(
      [
        ['', '2025-01-01', '4'],
        ['데미안', '언젠가', '최고'],
      ],
      m,
    );
    expect(skipped).toEqual([{ line: 2, reason: 'no_title' }]);
    expect(rows[0]).toMatchObject({ line: 3, finishedAt: null, rating: null });
    expect(rows[0]!.problems).toEqual(['date', 'rating']);
  });

  it('읽는 중·중단 기록에는 완독일을 넣지 않는다', () => {
    const m = suggestMapping(['제목', '상태', '완독일']);
    const { rows } = readRows([['데미안', '읽는 중', '2025-01-01']], m);
    expect(rows[0]).toMatchObject({ status: 'reading', finishedAt: null });
  });
});

describe('중복과 후보', () => {
  const books = [
    { id: 'a', isbn13: '9788954682152', title: '작별하지 않는다', author: '한강' },
    { id: 'b', isbn13: null, title: '총, 균, 쇠', author: '재레드 다이아몬드' },
  ];

  it('ISBN이 같거나 제목·저자가 같으면(띄어쓰기·문장 부호 무시) 중복', () => {
    expect(
      findDuplicate({ isbn13: '9788954682152', title: '다른 제목', author: null }, books)?.id,
    ).toBe('a');
    expect(
      findDuplicate({ isbn13: null, title: '총 균 쇠', author: '재레드다이아몬드' }, books)?.id,
    ).toBe('b');
    expect(
      findDuplicate({ isbn13: null, title: '총 균 쇠', author: '다른 사람' }, books),
    ).toBeNull();
  });

  it('검색 결과 중 제목(부제 제외)과 저자가 맞는 것만 후보', () => {
    const results = [
      { title: '데미안', author: '헤르만 헤세' },
      { title: '데미안 - 에밀 싱클레어의 청소년 시절 이야기', author: '헤르만 헤세' },
      { title: '데미안', author: '다른 번역' },
      { title: '데미안 읽기', author: '헤르만 헤세' },
    ];
    expect(matchCandidates({ title: '데미안', author: '헤세' }, results)).toHaveLength(2);
    expect(matchCandidates({ title: '데미안', author: null }, results)).toHaveLength(3);
  });
});
