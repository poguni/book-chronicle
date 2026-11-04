import { describe, expect, it } from 'vitest';
import {
  BackupError,
  backupDue,
  exportCsv,
  makeBackup,
  parseBackup,
  planRestore,
  SCHEMA_VERSION,
} from '../../src/lib/backup';
import { decodeCsv, parseCsv, readRows, suggestMapping } from '../../src/lib/csv';
import type { BookRow, ReadingRow, YearRow } from '../../src/lib/shelves';

const T = '2026-01-01T00:00:00Z';
const ME = 'me';

function book(id: string, over: Partial<BookRow> = {}): BookRow {
  return {
    id,
    user_id: ME,
    isbn13: null,
    title: `책 ${id}`,
    author: '지은이',
    publisher: null,
    pub_date: null,
    pages: 300,
    pages_estimated: false,
    category_raw: null,
    category: '인문',
    size: null,
    spine: { palette: { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' } },
    cover_path: `${ME}/covers/${id}.jpg`,
    texture_path: null,
    source: 'manual',
    created_at: T,
    updated_at: T,
    ...over,
  };
}

function reading(id: string, bookId: string, over: Partial<ReadingRow> = {}): ReadingRow {
  return {
    id,
    user_id: ME,
    book_id: bookId,
    status: 'finished',
    started_at: null,
    finished_at: '2025-03-14',
    date_approx: false,
    year: 2025,
    rating: 4.5,
    note: '메모, "따옴표"',
    shelf_position: 2,
    created_at: T,
    updated_at: T,
    ...over,
  };
}

const years: YearRow[] = [
  { user_id: ME, year: 2025, book_of_year: ['a'], one_liner: '좋은 해', updated_at: T },
];

const data = {
  books: [book('a', { isbn13: '9788954682152' }), book('b')],
  readings: [
    reading('ra', 'a'),
    reading('rb', 'b', { finished_at: '2024-07-15', date_approx: true }),
  ],
  years,
  settings: null,
};

let seq = 0;
const newId = () => `new-${++seq}`;

describe('백업 파일', () => {
  it('만들고 다시 읽는다', () => {
    const b = makeBackup(data, { a: 'data:image/jpeg;base64,AAA' }, new Date(T));
    const back = parseBackup(JSON.stringify(b));
    expect(back.schemaVersion).toBe(SCHEMA_VERSION);
    expect(back.books).toHaveLength(2);
    expect(back.covers?.a).toMatch(/^data:image\/jpeg/);
  });

  it('다른 파일·더 새 판은 알려 준다', () => {
    const code = (text: string) => {
      try {
        parseBackup(text);
        return null;
      } catch (e) {
        return (e as BackupError).code;
      }
    };
    expect(code('{')).toBe('not_json');
    expect(code('{"app":"other"}')).toBe('not_backup');
    expect(code(JSON.stringify({ ...makeBackup(data, null), schemaVersion: 99 }))).toBe('too_new');
  });
});

describe('복원 계획', () => {
  const backup = makeBackup(data, { b: 'data:image/jpeg;base64,BBB' });

  it('같은 계정 덮어쓰기: ID 그대로, 비우고 다시 넣기, 설정 반영', () => {
    const plan = planRestore(
      {
        ...backup,
        settings: {
          user_id: ME,
          theme: 'paper',
          spine_style: 'generated',
          category_map: {},
          pattern_map: {},
          last_backup_at: null,
          updated_at: T,
        },
      },
      ME,
      'overwrite',
      { books: [], readings: [], years: [] },
      newId,
    );
    expect(plan.clearFirst).toBe(true);
    expect(plan.remapped).toBe(false);
    expect(plan.books.map((b) => b.id)).toEqual(['a', 'b']);
    // 그림이 없는 a는 경로를 두고, 그림이 있는 b는 올린 뒤 경로를 적음
    expect(plan.books[0]!.cover_path).toBe('me/covers/a.jpg');
    expect(plan.books[1]!.cover_path).toBeNull();
    expect(plan.covers).toEqual([{ bookId: 'b', dataUrl: 'data:image/jpeg;base64,BBB' }]);
    expect(plan.readings[0]).not.toHaveProperty('year');
    expect(plan.readings[0]).toMatchObject({ id: 'ra', shelf_position: 2 });
    expect(plan.years[0]).toMatchObject({ year: 2025, book_of_year: ['a'], one_liner: '좋은 해' });
    expect(plan.settings).toMatchObject({ theme: 'paper' });
  });

  it('다른 계정으로 복원: user_id를 바꾸고 ID를 새로 만들며, 읽을 수 없는 표지 경로는 비운다', () => {
    const plan = planRestore(
      backup,
      'other',
      'overwrite',
      { books: [], readings: [], years: [] },
      newId,
    );
    expect(plan.remapped).toBe(true);
    const ids = plan.books.map((b) => b.id);
    expect(ids).not.toContain('a');
    expect(plan.books.every((b) => b.user_id === 'other')).toBe(true);
    expect(plan.books[0]!.cover_path).toBeNull();
    expect(plan.readings.map((r) => r.book_id)).toEqual(ids);
    expect(plan.years[0]!.book_of_year).toEqual([ids[0]]);
  });

  it('합치기: 이미 있는 책(ID·ISBN)은 두고 없는 기록만 더한다. 이미 있는 해의 회고와 설정은 그대로', () => {
    const current = {
      books: [book('x', { isbn13: '9788954682152', user_id: ME })],
      readings: [reading('rx', 'x')],
      years,
    };
    const plan = planRestore(backup, ME, 'merge', current, newId);
    expect(plan.clearFirst).toBe(false);
    expect(plan.books.map((b) => b.id)).toEqual(['b']);
    expect(plan.skippedBooks).toBe(1);
    // a의 기록(2025-03-14 완독)은 x에 이미 같은 기록이 있어 건너뜀
    expect(plan.readings.map((r) => r.book_id)).toEqual(['b']);
    expect(plan.skippedReadings).toBe(1);
    expect(plan.years).toEqual([]);
    expect(plan.settings).toBeNull();
  });
});

describe('CSV 내보내기', () => {
  it('UTF-8 BOM, 기록마다 한 줄, 내보낸 파일을 그대로 다시 가져올 수 있다', () => {
    const csv = exportCsv(data.books, data.readings);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const { text } = decodeCsv(new TextEncoder().encode(csv));
    const { headers, rows } = parseCsv(text);
    expect(headers[0]).toBe('제목');
    const back = readRows(rows, suggestMapping(headers)).rows;
    expect(back).toHaveLength(2);
    // 완독일순: 2024-07(일 미상)이 먼저
    expect(back[0]).toMatchObject({ title: '책 b', finishedAt: '2024-07-15', dateApprox: true });
    expect(back[1]).toMatchObject({
      title: '책 a',
      isbn13: '9788954682152',
      pages: 300,
      rating: 4.5,
      note: '메모, "따옴표"',
      category: '인문',
      status: 'finished',
    });
  });
});

describe('백업 권하기 (30일)', () => {
  const now = new Date('2026-03-01T00:00:00Z');
  it('책이 없으면 권하지 않음', () => {
    expect(backupDue(null, [], now)).toBe(false);
  });
  it('받은 적이 없으면 첫 책을 꽂은 날부터 30일', () => {
    expect(backupDue(null, [{ created_at: '2026-02-20T00:00:00Z' }], now)).toBe(false);
    expect(backupDue(null, [{ created_at: '2026-01-01T00:00:00Z' }], now)).toBe(true);
  });
  it('마지막 백업 뒤 30일', () => {
    const books = [{ created_at: '2025-01-01T00:00:00Z' }];
    expect(backupDue('2026-02-10T00:00:00Z', books, now)).toBe(false);
    expect(backupDue('2026-01-10T00:00:00Z', books, now)).toBe(true);
  });
});
