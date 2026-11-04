// CSV 가져오기의 순수 함수 (PRD F3, 결정 0012): 인코딩 판별, 열 매핑 추천, 값 읽기, 중복 판정
import Papa from 'papaparse';
import type { ReadingStatus } from './bookForm';
import { toIsbn13 } from './isbn';

export type CsvEncoding = 'utf-8' | 'euc-kr';

/**
 * 파일 바이트 → 글자. 인코딩을 고르지 않으면 UTF-8로 엄격하게 읽어 보고, 깨지면 CP949(euc-kr)로 읽습니다.
 * TextDecoder('euc-kr')는 CP949 확장 글자도 읽습니다(WHATWG Encoding 표준).
 */
export function decodeCsv(
  bytes: ArrayBuffer | Uint8Array,
  encoding?: CsvEncoding,
): { text: string; encoding: CsvEncoding } {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const strip = (s: string) => s.replace(/^\uFEFF/, '');
  if (encoding) return { text: strip(new TextDecoder(encoding).decode(data)), encoding };
  try {
    return {
      text: strip(new TextDecoder('utf-8', { fatal: true }).decode(data)),
      encoding: 'utf-8',
    };
  } catch {
    return { text: strip(new TextDecoder('euc-kr').decode(data)), encoding: 'euc-kr' };
  }
}

/** 글자 → 머리글 + 행. 빈 줄은 건너뜁니다. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  const [headers = [], ...rows] = result.data;
  return { headers: headers.map((h) => h.trim()), rows };
}

export const FIELDS = [
  'title',
  'author',
  'isbn',
  'publisher',
  'pages',
  'finishedAt',
  'rating',
  'note',
  'category',
  'status',
] as const;
export type Field = (typeof FIELDS)[number];
export type Mapping = Record<Field, number | null>;

/** 열 이름으로 앱 항목을 추천할 때 쓰는 낱말(소문자·공백 없이 비교). Goodreads 내보내기 열 포함 */
const ALIASES: Record<Field, string[]> = {
  title: ['제목', '책제목', '도서명', '서명', '책이름', 'title', 'booktitle'],
  author: ['저자', '지은이', '작가', '글쓴이', 'author', 'authors'],
  isbn: ['isbn13', 'isbn', 'isbn-13', 'isbn번호'],
  publisher: ['출판사', '펴낸곳', '발행처', 'publisher'],
  pages: ['쪽수', '페이지', '페이지수', '쪽', 'pages', 'numberofpages', 'pagecount'],
  finishedAt: [
    '완독일',
    '읽은날',
    '읽은날짜',
    '다읽은날',
    '완독날짜',
    '날짜',
    'dateread',
    'finished',
    'finishedat',
    'readdate',
  ],
  rating: ['별점', '평점', '점수', 'rating', 'myrating', 'stars'],
  note: [
    '메모',
    '한줄평',
    '한줄메모',
    '감상',
    '리뷰',
    '서평',
    'note',
    'notes',
    'review',
    'myreview',
    'comment',
  ],
  category: ['분야', '분류', '장르', '카테고리', 'category', 'genre'],
  status: ['상태', '독서상태', 'status', 'exclusiveshelf', 'shelf'],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s_()[\]]/g, '');

/** 머리글에서 항목마다 가장 잘 맞는 열을 고릅니다(정확히 같은 이름 → 포함). 한 열은 한 항목에만 */
export function suggestMapping(headers: readonly string[]): Mapping {
  const mapping = Object.fromEntries(FIELDS.map((f) => [f, null])) as Mapping;
  const used = new Set<number>();
  const names = headers.map(norm);
  for (const exact of [true, false]) {
    for (const field of FIELDS) {
      if (mapping[field] !== null) continue;
      const i = names.findIndex(
        (n, idx) =>
          !used.has(idx) &&
          n !== '' &&
          ALIASES[field].some((a) => (exact ? n === a : n.includes(a) && a.length >= 2)),
      );
      if (i >= 0) {
        mapping[field] = i;
        used.add(i);
      }
    }
  }
  return mapping;
}

/** Goodreads 내보내기 파일인지 (별점 0 = 별점 없음, to-read 행은 건너뜀) */
export function isGoodreads(headers: readonly string[]): boolean {
  const names = new Set(headers.map(norm));
  return names.has('bookid') && names.has('myrating') && names.has('exclusiveshelf');
}

const pad = (n: number) => String(n).padStart(2, '0');
function validDate(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * 날짜 읽기 (PRD F3): 2025-03-14, 2025.3.14, 2025/03/14, 20250314, 2025년 3월 14일,
 * 일이 없으면(2025-03, 2025.3, 2025년 3월) 15일로 두고 approx(일 미상) 표시.
 */
export function parseDate(input: string): { date: string; approx: boolean } | null {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) m = /^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?\.?$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return validDate(y, mo, d) ? { date: `${y}-${pad(mo)}-${pad(d)}`, approx: false } : null;
  }
  m = /^(\d{4})\s*[-./년]\s*(\d{1,2})\s*월?\.?$/.exec(s);
  if (m) {
    const [y, mo] = [Number(m[1]), Number(m[2])];
    return validDate(y, mo, 15) ? { date: `${y}-${pad(mo)}-15`, approx: true } : null;
  }
  return null;
}

/**
 * 별점 읽기: 4, 4.5, "4/5", "★★★★☆", 10점 만점(5 초과 10 이하)은 반으로.
 * 0.5 단위로 반올림. Goodreads는 0이 "별점 없음"입니다.
 */
export function parseRating(input: string, zeroIsNone = false): number | null {
  const s = input.trim();
  if (!s) return null;
  const stars = (s.match(/★/g) ?? []).length;
  if (stars > 0) return Math.min(5, stars + (/½/.test(s) ? 0.5 : 0));
  const m = /^(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?\s*(?:점)?$/.exec(s);
  if (!m) return null;
  let n = Number(m[1]);
  const scale = m[2] ? Number(m[2]) : n > 5 && n <= 10 ? 10 : 5;
  if (scale <= 0) return null;
  n = (n / scale) * 5;
  if (n < 0 || n > 5) return null;
  if (zeroIsNone && n === 0) return null;
  return Math.round(n * 2) / 2;
}

/** 쪽수: "332", "332쪽", "332 p.", "1,024" */
export function parsePages(input: string): number | null {
  const m = /(\d[\d,]*)/.exec(input);
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/g, ''));
  return Number.isInteger(n) && n > 0 && n < 100000 ? n : null;
}

/** 상태: 비어 있으면 완독. 'skip'은 아직 안 읽은 책(Goodreads to-read 등) */
export function parseStatus(input: string): ReadingStatus | 'skip' {
  const s = norm(input);
  if (!s) return 'finished';
  if (/^(to-?read|읽고싶|읽을|위시)/.test(s)) return 'skip';
  if (/(currently|reading|읽는중|읽고있)/.test(s)) return 'reading';
  if (/(dropped|중단|포기|did-?not-?finish|dnf)/.test(s)) return 'dropped';
  return 'finished';
}

/** CSV 한 행을 읽은 결과 */
export type CsvRow = {
  /** 파일의 줄 번호(머리글 = 1) */
  line: number;
  title: string;
  author: string | null;
  isbn13: string | null;
  publisher: string | null;
  pages: number | null;
  finishedAt: string | null;
  dateApprox: boolean;
  rating: number | null;
  note: string | null;
  category: string | null;
  status: ReadingStatus;
  /** 읽지 못한 값 (사용자에게 보여 줌) */
  problems: string[];
};

/** Goodreads ISBN 칸은 ="9788954682152" 꼴 */
function cleanCell(v: string | undefined): string {
  return (v ?? '')
    .trim()
    .replace(/^="?(.*?)"?$/, '$1')
    .trim();
}

/** 매핑대로 행을 읽습니다. 제목이 없거나 아직 안 읽은 책(skip)은 빼고, 뺀 수를 함께 돌려줍니다. */
export function readRows(
  rows: readonly string[][],
  mapping: Mapping,
  opts: { goodreads?: boolean } = {},
): { rows: CsvRow[]; skipped: { line: number; reason: 'no_title' | 'to_read' }[] } {
  const out: CsvRow[] = [];
  const skipped: { line: number; reason: 'no_title' | 'to_read' }[] = [];
  rows.forEach((cells, i) => {
    const line = i + 2;
    const get = (f: Field) => (mapping[f] === null ? '' : cleanCell(cells[mapping[f]!]));
    const title = get('title');
    if (!title) {
      skipped.push({ line, reason: 'no_title' });
      return;
    }
    const status = parseStatus(get('status'));
    if (status === 'skip') {
      skipped.push({ line, reason: 'to_read' });
      return;
    }
    const problems: string[] = [];
    const rawDate = get('finishedAt');
    const date = rawDate ? parseDate(rawDate) : null;
    if (rawDate && !date) problems.push('date');
    const rawRating = get('rating');
    const rating = rawRating ? parseRating(rawRating, opts.goodreads) : null;
    if (rawRating && rating === null && !(opts.goodreads && rawRating === '0'))
      problems.push('rating');
    const rawPages = get('pages');
    const pages = rawPages ? parsePages(rawPages) : null;
    if (rawPages && pages === null) problems.push('pages');
    const rawIsbn = get('isbn');
    const isbn13 = rawIsbn ? toIsbn13(rawIsbn) : null;
    if (rawIsbn && !isbn13) problems.push('isbn');
    out.push({
      line,
      title,
      author: get('author') || null,
      isbn13,
      publisher: get('publisher') || null,
      pages,
      finishedAt: status === 'finished' ? (date?.date ?? null) : null,
      dateApprox: status === 'finished' && (date?.approx ?? false),
      rating,
      note: get('note') || null,
      category: get('category') || null,
      status,
      problems,
    });
  });
  return { rows: out, skipped };
}

/** 중복 판정용 열쇠: 띄어쓰기·문장 부호·대소문자를 무시한 제목 + 저자 */
export function titleKey(title: string, author: string | null): string {
  const clean = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  return `${clean(title)}|${clean(author ?? '')}`;
}

/** 책장에 이미 있는 책 찾기: ISBN이 같거나, 제목·저자가 같으면 중복 후보 (PRD F3) */
export function findDuplicate<
  B extends { id: string; isbn13: string | null; title: string; author: string | null },
>(
  row: { isbn13: string | null; title: string; author: string | null },
  books: readonly B[],
): B | null {
  if (row.isbn13) {
    const hit = books.find((b) => b.isbn13 === row.isbn13);
    if (hit) return hit;
  }
  const key = titleKey(row.title, row.author);
  return books.find((b) => titleKey(b.title, b.author) === key) ?? null;
}

/** 검색 결과 중 이 행과 같은 책으로 볼 만한 것: 제목(부제 뺀)이 같고, 저자가 있으면 저자도 겹침 */
export function matchCandidates<C extends { title: string; author: string | null }>(
  row: { title: string; author: string | null },
  results: readonly C[],
): C[] {
  const t = (s: string) =>
    s
      .split(/\s+[-:]\s+|\s*\(/)[0]!
      .toLowerCase()
      .replace(/[\s\p{P}\p{S}]/gu, '');
  const a = (s: string | null) => (s ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  const want = t(row.title);
  const wantAuthor = a(row.author);
  return results.filter((r) => {
    if (t(r.title) !== want) return false;
    if (!wantAuthor) return true;
    const got = a(r.author);
    return got.includes(wantAuthor) || wantAuthor.includes(got);
  });
}
