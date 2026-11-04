// 책 꽂기·수정 대화 상자의 입력값 다루기 (PRD F1). 화면과 분리한 순수 함수
import { ko } from './i18n/ko';
import type { BookRow, ReadingRow } from './shelves';
import type { Pattern } from './spine/patterns';
import { parseSpineData, presetPalette, type Palette } from './spine/spineData';

export type ReadingStatus = 'finished' | 'reading' | 'dropped';

/** 입력창 값 그대로(문자열) */
export type BookFormValues = {
  title: string;
  author: string;
  publisher: string;
  pages: string;
  category: string;
  status: ReadingStatus;
  finishedAt: string;
  rating: string;
  note: string;
  palette: Palette;
  pattern: Pattern | null;
};

/** 검사를 마친 값 */
export type BookFormData = {
  title: string;
  author: string | null;
  publisher: string | null;
  pages: number | null;
  category: string | null;
  status: ReadingStatus;
  finishedAt: string | null;
  rating: number | null;
  note: string | null;
  palette: Palette;
  pattern: Pattern | null;
};

export type BookFormErrors = Partial<Record<'title' | 'pages' | 'finishedAt' | 'rating', string>>;

export const RATING_OPTIONS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0] as const;

export function emptyForm(bookId: string): BookFormValues {
  return {
    title: '',
    author: '',
    publisher: '',
    pages: '',
    category: '',
    status: 'finished',
    finishedAt: '',
    rating: '',
    note: '',
    palette: presetPalette(bookId),
    pattern: null,
  };
}

/** 고칠 때: DB 행 → 입력창 값. reading이 없으면(다시 읽기) 기록 칸은 비움 */
export function formFromRows(book: BookRow, reading: ReadingRow | null): BookFormValues {
  const spine = parseSpineData(book.spine, book.id);
  return {
    title: book.title,
    author: book.author ?? '',
    publisher: book.publisher ?? '',
    pages: book.pages ? String(book.pages) : '',
    category: book.category ?? '',
    status: isStatus(reading?.status) ? reading.status : 'finished',
    finishedAt: reading?.finished_at ?? '',
    rating:
      reading?.rating === null || reading?.rating === undefined
        ? ''
        : String(Number(reading.rating)),
    note: reading?.note ?? '',
    palette: spine.palette,
    pattern: spine.pattern,
  };
}

function isStatus(v: unknown): v is ReadingStatus {
  return v === 'finished' || v === 'reading' || v === 'dropped';
}

function text(v: string): string | null {
  const t = v.trim();
  return t === '' ? null : t;
}

function validDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return (
    y >= 1900 &&
    y <= 2200 &&
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
  );
}

export function validateForm(
  v: BookFormValues,
): { ok: true; data: BookFormData } | { ok: false; errors: BookFormErrors } {
  const errors: BookFormErrors = {};
  const title = v.title.trim();
  if (title === '') errors.title = ko.form.errorTitle;
  else if (title.length > 500) errors.title = ko.form.errorTitleLong;

  let pages: number | null = null;
  const pagesText = v.pages.trim().replace(/,/g, '');
  if (pagesText !== '') {
    const n = Number(pagesText);
    if (!Number.isInteger(n) || n < 1 || n > 100000) errors.pages = ko.form.errorPages;
    else pages = n;
  }

  // 완독일은 완독한 기록에만 둡니다. 비워 두면 "연도 미상" 칸에 꽂힙니다.
  let finishedAt: string | null = null;
  if (v.status === 'finished' && v.finishedAt.trim() !== '') {
    if (validDate(v.finishedAt.trim())) finishedAt = v.finishedAt.trim();
    else errors.finishedAt = ko.form.errorDate;
  }

  let rating: number | null = null;
  if (v.rating !== '') {
    const r = Number(v.rating);
    if ((RATING_OPTIONS as readonly number[]).includes(r)) rating = r;
    else errors.rating = ko.form.errorRating;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      title,
      author: text(v.author),
      publisher: text(v.publisher),
      pages,
      category: text(v.category),
      status: v.status,
      finishedAt,
      rating,
      note: text(v.note),
      palette: v.palette,
      pattern: v.pattern,
    },
  };
}
