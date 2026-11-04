// CSV 가져오기: 보충 조회와 가져오기 계획 (PRD F3·5.9, 결정 0012)
// 네트워크·저장은 바깥에서 넘겨받아(api) 단위 테스트할 수 있게 둡니다.
import type { BookInfo } from './bookApi';
import { cleanAuthor, cleanTitle, mapCategory } from './bookMap';
import { findDuplicate, matchCandidates, titleKey, type CsvRow } from './csv';
import type { BookRow } from './shelves';

/**
 * 행 상태 (PRD F3): ok 정상(보충하지 않음) / enriched 정보 보충됨 /
 * candidates 후보 여러 개(직접 선택) / notfound 찾지 못함 / error 조회 실패
 */
export type SupplementState = 'ok' | 'enriched' | 'candidates' | 'notfound' | 'error';
export type Supplement = { state: SupplementState; info: BookInfo | null; candidates: BookInfo[] };

export type BookLookup = {
  search: (q: string) => Promise<BookInfo[]>;
  lookup: (isbn13: string) => Promise<BookInfo | null>;
};

export const NO_SUPPLEMENT: Supplement = { state: 'ok', info: null, candidates: [] };

/** 검색으로 고른 책에 쪽수·분류가 없으면 ISBN으로 한 번 더 (국립중앙도서관) */
async function complete(info: BookInfo, api: BookLookup): Promise<BookInfo> {
  if (!info.isbn13 || info.pages !== null) return info;
  return (await api.lookup(info.isbn13).catch(() => null)) ?? info;
}

/** 한 행 보충: ISBN이 있으면 ISBN으로, 없거나 못 찾으면 "제목 + 저자"로 (PRD F3) */
export async function supplementRow(row: CsvRow, api: BookLookup): Promise<Supplement> {
  try {
    if (row.isbn13) {
      const info = await api.lookup(row.isbn13);
      if (info) return { state: 'enriched', info, candidates: [] };
    }
    const results = await api.search([row.title, row.author ?? ''].join(' ').trim());
    const matched = matchCandidates(row, results);
    if (matched.length === 1)
      return { state: 'enriched', info: await complete(matched[0]!, api), candidates: [] };
    const candidates = (matched.length > 1 ? matched : results).slice(0, 5);
    if (candidates.length === 0) return { state: 'notfound', info: null, candidates: [] };
    return { state: 'candidates', info: null, candidates };
  } catch {
    return { state: 'error', info: null, candidates: [] };
  }
}

/** 고른 후보를 보충 정보로 (쪽수·분류를 더 가져옴) */
export async function chooseCandidate(info: BookInfo, api: BookLookup): Promise<Supplement> {
  return { state: 'enriched', info: await complete(info, api), candidates: [] };
}

/**
 * 동시에 concurrency건씩, 요청 사이 gapMs 간격으로 처리합니다(PRD 5.9: 2건, 200ms).
 * signal로 멈추면 남은 일은 시작하지 않습니다(이미 시작한 일은 끝까지).
 */
export async function runPool<T>(
  items: readonly T[],
  work: (item: T, index: number) => Promise<void>,
  opts: {
    concurrency?: number;
    gapMs?: number;
    signal?: AbortSignal;
    onProgress?: (done: number) => void;
  } = {},
): Promise<number> {
  const { concurrency = 2, gapMs = 200, signal, onProgress } = opts;
  let next = 0;
  let done = 0;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function lane() {
    while (next < items.length && !signal?.aborted) {
      const i = next++;
      await work(items[i]!, i);
      done++;
      onProgress?.(done);
      if (gapMs > 0 && next < items.length) await sleep(gapMs);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return done;
}

/** 중복 처리 (PRD F3): 건너뛰기 / 독서 기록만 추가 / 덮어쓰기(책 정보를 CSV 값으로) */
export type DuplicateAction = 'skip' | 'addReading' | 'overwrite';

/** 가져올 책 정보: CSV 값이 먼저, 빈 칸은 보충 정보로 */
export type MergedBook = {
  title: string;
  author: string | null;
  publisher: string | null;
  isbn13: string | null;
  pubDate: string | null;
  pages: number | null;
  category: string | null;
  categoryRaw: string | null;
  cover: string | null;
};

export function mergeBook(row: CsvRow, s: Supplement): MergedBook {
  const info = s.info;
  return {
    title: row.title,
    author: row.author ?? cleanAuthor(info?.author ?? null),
    publisher: row.publisher ?? info?.publisher ?? null,
    isbn13: row.isbn13 ?? info?.isbn13 ?? null,
    pubDate: info?.pubDate ?? null,
    pages: row.pages ?? info?.pages ?? null,
    category: row.category ?? (info ? mapCategory(cleanTitle(info.title), info.kdc) : null),
    categoryRaw: info?.kdc ? `KDC ${info.kdc}` : null,
    cover: info?.cover ?? null,
  };
}

export type ReadingPlan = {
  status: CsvRow['status'];
  finishedAt: string | null;
  dateApprox: boolean;
  rating: number | null;
  note: string | null;
};

/** 가져오기 계획 한 줄 */
export type ImportStep =
  | { kind: 'newBook'; line: number; tempId: string; book: MergedBook; reading: ReadingPlan }
  /** 같은 파일 안에서 앞서 새로 넣는 책을 다시 읽은 기록 */
  | { kind: 'newBookReading'; line: number; tempId: string; reading: ReadingPlan }
  | { kind: 'addReading'; line: number; bookId: string; reading: ReadingPlan }
  | { kind: 'overwrite'; line: number; bookId: string; book: MergedBook; reading: ReadingPlan }
  | { kind: 'skip'; line: number };

export type ImportInput = {
  row: CsvRow;
  supplement: Supplement;
  /** 미리 보기에서 빼기로 한 행 */
  excluded: boolean;
  duplicateAction: DuplicateAction;
};

const readingOf = (row: CsvRow): ReadingPlan => ({
  status: row.status,
  finishedAt: row.finishedAt,
  dateApprox: row.dateApprox,
  rating: row.rating,
  note: row.note,
});

/**
 * 행마다 무엇을 할지 정합니다. 책장에 이미 있는 책(중복)은 고른 중복 처리대로,
 * 같은 파일 안에서 같은 책(ISBN 또는 제목·저자)이 또 나오면 앞의 새 책에 기록만 더합니다.
 */
export function planImport(
  inputs: readonly ImportInput[],
  books: readonly Pick<BookRow, 'id' | 'isbn13' | 'title' | 'author'>[],
): ImportStep[] {
  const fresh = new Map<string, string>(); // 중복 열쇠 → tempId
  let n = 0;
  return inputs.map(({ row, supplement, excluded, duplicateAction }): ImportStep => {
    if (excluded) return { kind: 'skip', line: row.line };
    const book = mergeBook(row, supplement);
    const reading = readingOf(row);
    const dup = findDuplicate(book, books);
    if (dup) {
      if (duplicateAction === 'skip') return { kind: 'skip', line: row.line };
      if (duplicateAction === 'overwrite')
        return { kind: 'overwrite', line: row.line, bookId: dup.id, book, reading };
      return { kind: 'addReading', line: row.line, bookId: dup.id, reading };
    }
    const keys = [
      book.isbn13 ? `isbn:${book.isbn13}` : null,
      `t:${titleKey(book.title, book.author)}`,
    ];
    const known = keys.map((k) => (k ? fresh.get(k) : undefined)).find(Boolean);
    if (known) return { kind: 'newBookReading', line: row.line, tempId: known, reading };
    const tempId = `new-${++n}`;
    for (const k of keys) if (k) fresh.set(k, tempId);
    return { kind: 'newBook', line: row.line, tempId, book, reading };
  });
}

/** 미리 보기의 중복 표시용: 이 행이 책장의 어느 책과 겹치는지 */
export function duplicateOf(
  row: CsvRow,
  supplement: Supplement,
  books: readonly Pick<BookRow, 'id' | 'isbn13' | 'title' | 'author'>[],
) {
  return findDuplicate(mergeBook(row, supplement), books);
}
