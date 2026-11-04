import { describe, expect, it } from 'vitest';
import type { BookInfo } from '../../src/lib/bookApi';
import type { CsvRow } from '../../src/lib/csv';
import {
  mergeBook,
  NO_SUPPLEMENT,
  planImport,
  runPool,
  supplementRow,
  type BookLookup,
} from '../../src/lib/importer';

function row(line: number, over: Partial<CsvRow> = {}): CsvRow {
  return {
    line,
    title: '작별하지 않는다',
    author: '한강',
    isbn13: null,
    publisher: null,
    pages: null,
    finishedAt: '2025-03-14',
    dateApprox: false,
    rating: 4,
    note: null,
    category: null,
    status: 'finished',
    problems: [],
    ...over,
  };
}

function info(over: Partial<BookInfo> = {}): BookInfo {
  return {
    isbn13: '9788954682152',
    title: '작별하지 않는다',
    author: '한강',
    publisher: '문학동네',
    pubDate: '2021-09-09',
    cover: 'https://t1.daumcdn.net/lbook/image/1',
    kdc: null,
    pages: null,
    ...over,
  };
}

function api(
  results: BookInfo[],
  byIsbn: Record<string, BookInfo> = {},
): BookLookup & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    search: async (q) => {
      calls.push(`search:${q}`);
      return results;
    },
    lookup: async (isbn) => {
      calls.push(`lookup:${isbn}`);
      return byIsbn[isbn] ?? null;
    },
  };
}

describe('보충 조회', () => {
  it('ISBN이 있으면 ISBN으로', async () => {
    const a = api([], { '9788954682152': info({ pages: 332, kdc: '813.7' }) });
    const s = await supplementRow(row(2, { isbn13: '9788954682152' }), a);
    expect(s.state).toBe('enriched');
    expect(s.info?.pages).toBe(332);
    expect(a.calls).toEqual(['lookup:9788954682152']);
  });

  it('ISBN이 없으면 제목+저자로 찾고, 하나만 맞으면 ISBN으로 쪽수까지', async () => {
    const a = api([info(), info({ title: '작별하지 않는다 읽기', isbn13: '1' })], {
      '9788954682152': info({ pages: 332 }),
    });
    const s = await supplementRow(row(2), a);
    expect(a.calls).toEqual(['search:작별하지 않는다 한강', 'lookup:9788954682152']);
    expect(s).toMatchObject({ state: 'enriched', info: { pages: 332 } });
  });

  it('여러 개 맞으면 후보, 하나도 없으면 찾지 못함, 오류는 error', async () => {
    const two = await supplementRow(
      row(2),
      api([info(), info({ isbn13: '2', publisher: '다른 곳' })]),
    );
    expect(two.state).toBe('candidates');
    expect(two.candidates).toHaveLength(2);
    expect((await supplementRow(row(2), api([]))).state).toBe('notfound');
    const broken: BookLookup = {
      search: () => Promise.reject(new Error('x')),
      lookup: () => Promise.reject(new Error('x')),
    };
    expect((await supplementRow(row(2), broken)).state).toBe('error');
  });

  it('CSV 값이 먼저, 빈 칸만 보충 정보로 채운다', () => {
    const merged = mergeBook(row(2, { pages: 300, category: '소설' }), {
      state: 'enriched',
      info: info({ pages: 332, kdc: '813.7' }),
      candidates: [],
    });
    expect(merged).toMatchObject({
      pages: 300,
      category: '소설',
      publisher: '문학동네',
      isbn13: '9788954682152',
      categoryRaw: 'KDC 813.7',
    });
    expect(
      mergeBook(row(2), { state: 'enriched', info: info({ kdc: '813.7' }), candidates: [] })
        .category,
    ).toBe('문학');
  });
});

describe('동시 처리 (2건씩, 멈추기)', () => {
  it('동시에 2건까지만 돌고, 모두 끝낸다', async () => {
    let running = 0;
    let max = 0;
    const done = await runPool(
      [1, 2, 3, 4, 5],
      async () => {
        running++;
        max = Math.max(max, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
      },
      { concurrency: 2, gapMs: 0 },
    );
    expect(done).toBe(5);
    expect(max).toBe(2);
  });

  it('멈추면 남은 일은 시작하지 않는다', async () => {
    const ctrl = new AbortController();
    const seen: number[] = [];
    await runPool(
      [1, 2, 3, 4, 5, 6],
      async (n) => {
        seen.push(n);
        if (n === 2) ctrl.abort();
      },
      { concurrency: 1, gapMs: 0, signal: ctrl.signal },
    );
    expect(seen).toEqual([1, 2]);
  });
});

describe('가져오기 계획', () => {
  const books = [{ id: 'old', isbn13: '9788954682152', title: '작별하지 않는다', author: '한강' }];
  const input = (r: CsvRow, over = {}) => ({
    row: r,
    supplement: NO_SUPPLEMENT,
    excluded: false,
    duplicateAction: 'skip' as const,
    ...over,
  });

  it('책장에 있는 책은 고른 중복 처리대로', () => {
    const steps = planImport(
      [
        input(row(2)),
        input(row(3), { duplicateAction: 'addReading' }),
        input(row(4), { duplicateAction: 'overwrite' }),
      ],
      books,
    );
    expect(steps.map((s) => s.kind)).toEqual(['skip', 'addReading', 'overwrite']);
  });

  it('같은 파일에서 같은 책이 또 나오면 앞의 새 책에 기록만 더한다', () => {
    const steps = planImport(
      [
        input(row(2, { title: '데미안', author: '헤세' })),
        input(row(3, { title: '데미안', author: '헤세', finishedAt: '2026-01-01' })),
        input(row(4, { title: '싯다르타', author: '헤세' })),
        input(row(5, { title: '빼기로 한 책' }), { excluded: true }),
      ],
      books,
    );
    expect(steps).toMatchObject([
      { kind: 'newBook', tempId: 'new-1' },
      { kind: 'newBookReading', tempId: 'new-1', reading: { finishedAt: '2026-01-01' } },
      { kind: 'newBook', tempId: 'new-2' },
      { kind: 'skip', line: 5 },
    ]);
  });
});
