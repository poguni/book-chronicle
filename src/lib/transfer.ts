// CSV 가져오기 실행, JSON 백업 받기·복원, CSV 내보내기 (PRD F3·F9, 결정 0012)
// 계산은 csv.ts·importer.ts·backup.ts(순수 함수)가 하고, 여기서는 저장·내려받기만 합니다.
import {
  backupFileName,
  csvFileName,
  exportCsv,
  makeBackup,
  planRestore,
  type Backup,
  type BookInsert,
  type ReadingInsert,
  type RestoreMode,
  type RestorePlan,
} from './backup';
import { fetchCover } from './bookApi';
import { processCover } from './coverPalette';
import {
  deleteAllBooks,
  deleteBooksByIds,
  insertBooks,
  listBooks,
  removeFiles,
  updateBook,
} from './data/books';
import { downloadCover, uploadCover } from './data/covers';
import { insertReadings, listReadings, updateReading } from './data/readings';
import { getSettings, updateSettings } from './data/settings';
import { deleteAllYears, listYears, upsertYears } from './data/years';
import { runPool, type ImportStep, type MergedBook, type ReadingPlan } from './importer';
import type { BookRow, ReadingRow } from './shelves';
import { presetPalette, toJson, type Palette } from './spine/spineData';

/** readings.year는 DB가 계산하는 열이라 넣을 때 뺍니다. */
function withoutYear(r: ReadingRow): ReadingInsert {
  const copy: Partial<ReadingRow> = { ...r };
  delete copy.year;
  return copy as ReadingInsert;
}

/** 파일을 내려받게 합니다. */
export function saveFile(name: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read_error'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

const readingInsert = (bookId: string, r: ReadingPlan): ReadingInsert => ({
  book_id: bookId,
  status: r.status,
  finished_at: r.finishedAt,
  date_approx: r.dateApprox,
  rating: r.rating,
  note: r.note,
});

/** 덮어쓰기: CSV에 값이 있는 칸만 책 정보에 씁니다. */
function bookPatch(b: MergedBook) {
  const patch: Record<string, string | number | boolean> = {};
  if (b.title) patch.title = b.title;
  if (b.author) patch.author = b.author;
  if (b.publisher) patch.publisher = b.publisher;
  if (b.isbn13) patch.isbn13 = b.isbn13;
  if (b.pages) {
    patch.pages = b.pages;
    patch.pages_estimated = false;
  }
  if (b.category) patch.category = b.category;
  return patch;
}

export type ImportProgress = { phase: 'covers' | 'saving'; done: number; total: number };

/**
 * 가져오기 계획을 저장합니다.
 * 1) 새 책의 표지를 받아 색을 뽑고 올림(2건씩) 2) 새 책·기록을 한꺼번에 넣음 3) 중복 책 처리.
 * 새 기록을 넣지 못하면 방금 넣은 책과 표지를 지워 되돌립니다.
 */
export async function runImport(
  steps: readonly ImportStep[],
  current: readonly ReadingRow[],
  opts: { covers: boolean; onProgress?: (p: ImportProgress) => void },
): Promise<{ books: number; readings: number; updated: number; coverFailed: number }> {
  const idOf = new Map<string, string>();
  const news = steps.filter(
    (s): s is Extract<ImportStep, { kind: 'newBook' }> => s.kind === 'newBook',
  );
  for (const s of news) idOf.set(s.tempId, crypto.randomUUID());

  // 1) 표지
  const art = new Map<string, { palette: Palette; candidates: string[]; path: string }>();
  let coverFailed = 0;
  const withCover = opts.covers ? news.filter((s) => s.book.cover) : [];
  opts.onProgress?.({ phase: 'covers', done: 0, total: withCover.length });
  await runPool(
    withCover,
    async (s) => {
      const id = idOf.get(s.tempId)!;
      try {
        const { result, jpeg } = await processCover(await fetchCover(s.book.cover!));
        const path = await uploadCover(id, jpeg);
        art.set(id, {
          palette: result?.palette ?? presetPalette(id),
          candidates: result?.candidates ?? [],
          path,
        });
      } catch (e) {
        console.warn('표지를 가져오지 못했어요', e);
        coverFailed++;
      }
    },
    {
      concurrency: 2,
      gapMs: 200,
      onProgress: (done) => opts.onProgress?.({ phase: 'covers', done, total: withCover.length }),
    },
  );

  // 2) 새 책과 기록
  opts.onProgress?.({ phase: 'saving', done: 0, total: steps.length });
  const books: BookInsert[] = news.map((s) => {
    const id = idOf.get(s.tempId)!;
    const a = art.get(id);
    return {
      id,
      title: s.book.title,
      author: s.book.author,
      publisher: s.book.publisher,
      isbn13: s.book.isbn13,
      pub_date: s.book.pubDate,
      pages: s.book.pages,
      pages_estimated: false,
      category: s.book.category,
      category_raw: s.book.categoryRaw,
      size: null,
      cover_path: a?.path ?? null,
      source: 'csv',
      spine: toJson({
        palette: a?.palette ?? presetPalette(id),
        candidates: a?.candidates ?? [],
        pattern: null,
        manual: false,
      }),
    };
  });
  const readings: ReadingInsert[] = [];
  for (const s of steps) {
    if (s.kind === 'newBook' || s.kind === 'newBookReading')
      readings.push(readingInsert(idOf.get(s.tempId)!, s.reading));
    else if (s.kind === 'addReading') readings.push(readingInsert(s.bookId, s.reading));
  }
  try {
    await insertBooks(books);
  } catch (e) {
    await removeFiles([...art.values()].map((a) => a.path));
    throw e;
  }
  try {
    await insertReadings(readings);
  } catch (e) {
    await deleteBooksByIds(books.map((b) => b.id!)).catch(() => {});
    await removeFiles([...art.values()].map((a) => a.path));
    throw e;
  }

  // 3) 덮어쓰기: 책 정보를 CSV 값으로, 같은 상태·완독일 기록이 있으면 고치고 없으면 더함
  let updated = 0;
  for (const s of steps) {
    if (s.kind !== 'overwrite') continue;
    await updateBook(s.bookId, bookPatch(s.book));
    const same = current.find(
      (r) =>
        r.book_id === s.bookId &&
        r.status === s.reading.status &&
        (r.finished_at ?? null) === s.reading.finishedAt,
    );
    const r = readingInsert(s.bookId, s.reading);
    if (same) await updateReading(same.id, r);
    else await insertReadings([r]);
    updated++;
  }
  opts.onProgress?.({ phase: 'saving', done: steps.length, total: steps.length });
  return { books: books.length, readings: readings.length, updated, coverFailed };
}

/** JSON 백업 받기 (표지 그림은 선택). 받은 시각을 settings.last_backup_at에 적습니다. */
export async function downloadBackup(
  userId: string,
  opts: { covers: boolean; onProgress?: (done: number, total: number) => void },
): Promise<Backup> {
  const [books, readings, years, settings] = await Promise.all([
    listBooks(),
    listReadings(),
    listYears(),
    getSettings(),
  ]);
  let covers: Record<string, string> | null = null;
  if (opts.covers) {
    covers = {};
    const withCover = books.filter((b) => b.cover_path);
    await runPool(
      withCover,
      async (b) => {
        try {
          covers![b.id] = await blobToDataUrl(await downloadCover(b.cover_path!));
        } catch (e) {
          console.warn('표지를 백업에 넣지 못했어요', e);
        }
      },
      {
        concurrency: 4,
        gapMs: 0,
        onProgress: (done) => opts.onProgress?.(done, withCover.length),
      },
    );
  }
  const now = new Date();
  const backup = makeBackup({ books, readings, years, settings }, covers, now);
  saveFile(backupFileName(now), new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  await updateSettings(userId, { last_backup_at: now.toISOString() });
  return backup;
}

/** CSV 내보내기 (엑셀용 UTF-8 BOM) */
export async function downloadCsv(): Promise<void> {
  const [books, readings] = await Promise.all([listBooks(), listReadings()]);
  saveFile(
    csvFileName(),
    new Blob([exportCsv(books, readings)], { type: 'text/csv;charset=utf-8' }),
  );
}

/** 복원 계획 세우기: 지금 책장을 새로 불러와 비교합니다. */
export async function prepareRestore(
  backup: Backup,
  userId: string,
  mode: RestoreMode,
): Promise<{ plan: RestorePlan; current: { books: BookRow[]; readings: ReadingRow[] } }> {
  const [books, readings, years] = await Promise.all([listBooks(), listReadings(), listYears()]);
  return {
    plan: planRestore(backup, userId, mode, { books, readings, years }),
    current: { books, readings },
  };
}

/**
 * 복원 실행. 덮어쓰기는 지금 책장을 비우고 넣는데, 넣다가 실패하면 비우기 전 책장을 다시 넣어 되돌립니다.
 * Storage는 백업에 없는 책의 표지만 지웁니다(같은 계정 백업의 표지 경로는 그대로 씀).
 */
export async function runRestore(
  plan: RestorePlan,
  userId: string,
  current: { books: BookRow[]; readings: ReadingRow[] },
): Promise<void> {
  // 표지 그림을 먼저 올리고 경로를 적어 둡니다.
  const pathOf = new Map<string, string>();
  await runPool(
    plan.covers,
    async (c) => {
      try {
        pathOf.set(c.bookId, await uploadCover(c.bookId, await dataUrlToBlob(c.dataUrl)));
      } catch (e) {
        console.warn('표지를 올리지 못했어요', e);
      }
    },
    { concurrency: 3, gapMs: 0 },
  );
  const books = plan.books.map((b) => ({ ...b, cover_path: pathOf.get(b.id!) ?? b.cover_path }));

  if (plan.clearFirst) {
    const years = await listYears();
    await deleteAllYears();
    await deleteAllBooks();
    try {
      await insertBooks(books);
      await insertReadings(plan.readings);
      await upsertYears(
        plan.years.map(({ year, book_of_year, one_liner }) => ({
          year,
          book_of_year: book_of_year ?? [],
          one_liner: one_liner ?? null,
        })),
      );
    } catch (e) {
      // 되돌리기: 비우기 전 책장을 다시 넣음(같은 계정이라 ID 그대로)
      await deleteAllBooks().catch(() => {});
      await insertBooks(current.books).catch(() => {});
      await insertReadings(current.readings.map(withoutYear)).catch(() => {});
      await upsertYears(
        years.map(({ year, book_of_year, one_liner }) => ({ year, book_of_year, one_liner })),
      ).catch(() => {});
      throw e;
    }
    const kept = new Set(books.flatMap((b) => [b.cover_path, b.texture_path]).filter(Boolean));
    await removeFiles(
      current.books
        .flatMap((b) => [b.cover_path, b.texture_path])
        .filter((p): p is string => Boolean(p) && !kept.has(p)),
    );
  } else {
    await insertBooks(books);
    await insertReadings(plan.readings);
    await upsertYears(
      plan.years.map(({ year, book_of_year, one_liner }) => ({
        year,
        book_of_year: book_of_year ?? [],
        one_liner: one_liner ?? null,
      })),
    );
  }
  if (plan.settings) await updateSettings(userId, plan.settings);
}
