// JSON 백업·복원과 CSV 내보내기의 순수 함수 (PRD F9·7.3, 결정 0012)
import Papa from 'papaparse';
import { findDuplicate } from './csv';
import type { Database } from './database.types';
import type { BookRow, ReadingRow, YearRow } from './shelves';

type Tables = Database['bookchronicle']['Tables'];
export type SettingsRow = Tables['settings']['Row'];
export type BookInsert = Tables['books']['Insert'];
export type ReadingInsert = Omit<Tables['readings']['Insert'], 'year'>;
export type YearInsert = Tables['years']['Insert'];
export type SettingsUpdate = Tables['settings']['Update'];

export const BACKUP_APP = 'bookchronicle';
export const SCHEMA_VERSION = 1;

export type Backup = {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  books: BookRow[];
  readings: ReadingRow[];
  years: YearRow[];
  settings: SettingsRow | null;
  /** 책 ID → 표지 data URL (선택) */
  covers?: Record<string, string>;
};

export function makeBackup(
  data: {
    books: BookRow[];
    readings: ReadingRow[];
    years: YearRow[];
    settings: SettingsRow | null;
  },
  covers: Record<string, string> | null,
  now = new Date(),
): Backup {
  return {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    books: data.books,
    readings: data.readings,
    years: data.years,
    settings: data.settings,
    ...(covers ? { covers } : {}),
  };
}

const day = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const backupFileName = (now = new Date()) => `bookchronicle-backup-${day(now)}.json`;
export const csvFileName = (now = new Date()) => `bookchronicle-${day(now)}.csv`;

export class BackupError extends Error {
  constructor(public code: 'not_json' | 'not_backup' | 'too_new') {
    super(code);
  }
}

/**
 * 낮은 schemaVersion을 차례로 올리는 변환 함수. 키 n은 "n → n+1" 변환.
 * 지금은 1판뿐이라 비어 있습니다. 판을 올릴 때 여기에 더합니다(PRD 7.3).
 */
const MIGRATIONS: Record<number, (b: Record<string, unknown>) => Record<string, unknown>> = {};

/** 백업 파일 글자 → 검사·변환한 백업 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('not_json');
  }
  if (!raw || typeof raw !== 'object') throw new BackupError('not_backup');
  let b = raw as Record<string, unknown>;
  if (b.app !== BACKUP_APP || typeof b.schemaVersion !== 'number')
    throw new BackupError('not_backup');
  if (b.schemaVersion > SCHEMA_VERSION) throw new BackupError('too_new');
  for (let v = b.schemaVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (step) b = { ...step(b), schemaVersion: v + 1 };
  }
  if (!Array.isArray(b.books) || !Array.isArray(b.readings) || !Array.isArray(b.years))
    throw new BackupError('not_backup');
  return { ...(b as unknown as Backup), schemaVersion: SCHEMA_VERSION };
}

export type RestoreMode = 'overwrite' | 'merge';

export type RestorePlan = {
  /** 덮어쓰기: 지금 책장을 먼저 비움 */
  clearFirst: boolean;
  books: BookInsert[];
  readings: ReadingInsert[];
  years: YearInsert[];
  settings: SettingsUpdate | null;
  /** 올릴 표지: 새 책 ID → data URL */
  covers: { bookId: string; dataUrl: string }[];
  /** 다른 계정의 백업이라 ID를 새로 만들었는지 */
  remapped: boolean;
  /** 합치기에서 이미 있어 건너뛴 책·기록 수 */
  skippedBooks: number;
  skippedReadings: number;
};

/**
 * 복원 계획 (PRD F9·7.3).
 * - user_id는 지금 로그인한 사용자로 바꿉니다.
 * - 다른 계정의 백업이면 책·기록 ID를 새로 만듭니다(ID는 모든 사용자에 걸쳐 하나뿐이라 겹치면 안 됨).
 * - 덮어쓰기: 지금 책장을 비우고 백업 그대로. 설정도 백업 값으로.
 * - 합치기: 같은 ID, 같은 ISBN, 같은 제목·저자의 책은 지금 것을 두고, 그 책에 없는 기록만 더합니다.
 * - 표지: 백업에 그림이 있으면 새로 올리고, 없으면 같은 계정일 때만 경로를 그대로 둡니다.
 */
export function planRestore(
  backup: Backup,
  userId: string,
  mode: RestoreMode,
  current: {
    books: readonly BookRow[];
    readings: readonly ReadingRow[];
    years: readonly YearRow[];
  },
  newId: () => string = () => crypto.randomUUID(),
): RestorePlan {
  const remapped = backup.books.some((b) => b.user_id !== userId);
  const merge = mode === 'merge';
  const bookIdMap = new Map<string, string>();
  const books: BookInsert[] = [];
  const covers: { bookId: string; dataUrl: string }[] = [];
  let skippedBooks = 0;
  const currentIds = new Set(current.books.map((b) => b.id));
  // 합치기 중 새로 넣는 책도 다음 중복 판정에 넣습니다(백업 안 중복 대비).
  const known = merge ? [...current.books] : [];

  for (const b of backup.books) {
    if (merge) {
      const same = !remapped && currentIds.has(b.id) ? b.id : findDuplicate(b, known)?.id;
      if (same) {
        bookIdMap.set(b.id, same);
        skippedBooks++;
        continue;
      }
    }
    const id = remapped ? newId() : b.id;
    bookIdMap.set(b.id, id);
    const dataUrl = backup.covers?.[b.id];
    if (dataUrl) covers.push({ bookId: id, dataUrl });
    const insert: BookInsert = {
      id,
      user_id: userId,
      isbn13: b.isbn13,
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      pub_date: b.pub_date,
      pages: b.pages,
      pages_estimated: b.pages_estimated,
      category_raw: b.category_raw,
      category: b.category,
      size: b.size,
      spine: b.spine,
      // 올릴 표지는 올린 뒤 경로를 적습니다. 다른 계정의 표지는 읽을 수 없어 비웁니다.
      cover_path: dataUrl || remapped ? null : b.cover_path,
      texture_path: remapped ? null : b.texture_path,
      source: b.source,
      created_at: b.created_at,
      updated_at: b.updated_at,
    };
    books.push(insert);
    known.push({ ...(insert as BookRow) });
  }

  const readings: ReadingInsert[] = [];
  let skippedReadings = 0;
  const currentReadingIds = new Set(current.readings.map((r) => r.id));
  const sig = (bookId: string, r: Pick<ReadingRow, 'status' | 'finished_at'>) =>
    `${bookId}|${r.status}|${r.finished_at ?? ''}`;
  const seen = new Set(merge ? current.readings.map((r) => sig(r.book_id, r)) : []);
  for (const r of backup.readings) {
    const bookId = bookIdMap.get(r.book_id);
    if (!bookId) continue;
    if (merge && ((!remapped && currentReadingIds.has(r.id)) || seen.has(sig(bookId, r)))) {
      skippedReadings++;
      continue;
    }
    seen.add(sig(bookId, r));
    readings.push({
      id: remapped ? newId() : r.id,
      user_id: userId,
      book_id: bookId,
      status: r.status,
      started_at: r.started_at,
      finished_at: r.finished_at,
      date_approx: r.date_approx,
      rating: r.rating,
      note: r.note,
      shelf_position: r.shelf_position ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  }

  const currentYears = new Set(current.years.map((y) => y.year));
  const years: YearInsert[] = backup.years
    .filter((y) => !merge || !currentYears.has(y.year))
    .map((y) => ({
      user_id: userId,
      year: y.year,
      book_of_year: y.book_of_year
        .map((id) => bookIdMap.get(id))
        .filter((id): id is string => Boolean(id)),
      one_liner: y.one_liner,
    }));

  const s = backup.settings;
  const settings: SettingsUpdate | null =
    !merge && s
      ? {
          theme: s.theme,
          spine_style: s.spine_style,
          category_map: s.category_map,
          pattern_map: s.pattern_map,
        }
      : null;

  return {
    clearFirst: !merge,
    books,
    readings,
    years,
    settings,
    covers,
    remapped,
    skippedBooks,
    skippedReadings,
  };
}

const STATUS_LABEL: Record<string, string> = {
  finished: '완독',
  reading: '읽는 중',
  dropped: '중단',
};

/**
 * CSV 내보내기 (PRD F9): 독서 기록 한 줄에 하나, 엑셀이 한글을 알아보도록 UTF-8 BOM.
 * 열 이름은 가져오기의 자동 매핑과 같아서, 내보낸 파일을 그대로 다시 가져올 수 있습니다.
 */
export function exportCsv(books: readonly BookRow[], readings: readonly ReadingRow[]): string {
  const byId = new Map(books.map((b) => [b.id, b]));
  const header = [
    '제목',
    '저자',
    '출판사',
    'ISBN',
    '쪽수',
    '분야',
    '상태',
    '시작일',
    '완독일',
    '별점',
    '메모',
  ];
  const rows = [...readings]
    .sort((a, b) => (a.finished_at ?? '9999').localeCompare(b.finished_at ?? '9999'))
    .flatMap((r) => {
      const b = byId.get(r.book_id);
      if (!b) return [];
      return [
        [
          b.title,
          b.author ?? '',
          b.publisher ?? '',
          b.isbn13 ?? '',
          b.pages && !b.pages_estimated ? String(b.pages) : '',
          b.category ?? '',
          STATUS_LABEL[r.status] ?? r.status,
          r.started_at ?? '',
          // 일 미상 날짜는 연-월만 (가져오면 다시 일 미상으로 읽힘)
          r.finished_at ? (r.date_approx ? r.finished_at.slice(0, 7) : r.finished_at) : '',
          r.rating === null ? '' : String(Number(r.rating)),
          r.note ?? '',
        ],
      ];
    });
  return '\uFEFF' + Papa.unparse([header, ...rows], { newline: '\r\n' });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 백업을 권할 때인지 (PRD F9): 마지막 백업 뒤 30일이 지났을 때.
 * 한 번도 받지 않았으면 가장 오래된 책을 꽂은 날부터 셉니다(갓 시작했을 때는 권하지 않음).
 */
export function backupDue(
  lastBackupAt: string | null,
  books: readonly Pick<BookRow, 'created_at'>[],
  now = new Date(),
): boolean {
  if (books.length === 0) return false;
  const since =
    lastBackupAt ??
    books.reduce((min, b) => (b.created_at < min ? b.created_at : min), books[0]!.created_at);
  return now.getTime() - new Date(since).getTime() > 30 * DAY_MS;
}
