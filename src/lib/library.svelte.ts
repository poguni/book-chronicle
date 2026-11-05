import type { BookFormData } from './bookForm';
import { covers } from './covers.svelte';
import type { Json } from './database.types';
import {
  COVER_BUCKET,
  deleteBook,
  insertBook,
  listBooks,
  renameCategory,
  updateBook,
} from './data/books';
import { downloadCover, uploadCover, uploadTexture } from './data/covers';
import { runPool } from './importer';
import { makeTexture } from './texture';
import { deleteReading, insertReading, listReadings, updateReading } from './data/readings';
import { getSettings, updateMySettings, type SettingsRow } from './data/settings';
import { moveRank, toggleRank } from './bookOfYear';
import { listYears, setBookOfYear, setOneLiner, setReadingGoal } from './data/years';
import {
  buildShelves,
  type BookRow,
  type ReadingRow,
  type ShelfYear,
  type YearRow,
} from './shelves';
import { parsePatternMap, type Pattern } from './spine/patterns';
import { prefs } from './prefs.svelte';
import { parseSpineStyle, parseThemePref, type SpineStyle, type ThemePref } from './theme';
import { parseSpineData, toJson } from './spine/spineData';
import { status } from './status.svelte';
import { supabase } from './supabase';

/** 도서 검색에서 고른 책일 때 함께 저장하는 값 (사용자가 직접 고치지 않는 값) */
export type BookExtras = {
  isbn13: string | null;
  pubDate: string | null;
  categoryRaw: string | null;
  size: Json | null;
  candidates: string[];
  /** 가로 300px 이하로 줄인 표지 JPEG */
  coverJpeg: Blob | null;
};

// 내 책장 데이터. 컴포넌트는 supabase를 직접 부르지 않고 이 저장소와 src/lib/data/를 거칩니다.
export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function bookFields(data: BookFormData) {
  return {
    title: data.title,
    author: data.author,
    publisher: data.publisher,
    pages: data.pages,
    // 직접 입력한 쪽수는 추정값이 아님
    pages_estimated: false,
    category: data.category,
  };
}

function readingFields(data: BookFormData) {
  return {
    status: data.status,
    finished_at: data.finishedAt,
    rating: data.rating,
    note: data.note,
  };
}

/** 표지로 질감 이미지를 만들어 올립니다. 실패하면 null(책은 생성형 책등으로 보임) */
async function textureFor(bookId: string, cover: Blob): Promise<string | null> {
  try {
    return await uploadTexture(bookId, await makeTexture(cover));
  } catch (e) {
    console.warn('표지 질감을 만들지 못했어요', e);
    return null;
  }
}

class Library {
  books = $state.raw<BookRow[]>([]);
  readings = $state.raw<ReadingRow[]>([]);
  years = $state.raw<YearRow[]>([]);
  patternMap = $state.raw<Record<string, Pattern>>({});
  /** 마지막으로 JSON 백업을 받은 시각 (30일 알림, PRD F9) */
  lastBackupAt = $state<string | null>(null);
  settings = $state.raw<SettingsRow | null>(null);
  /** 표지 질감 일괄 생성 진행 (없으면 null) */
  textureJob = $state<{ done: number; total: number } | null>(null);
  state = $state<LoadState>('idle');
  currentYear = new Date().getFullYear();

  shelves: ShelfYear[] = $derived(
    buildShelves(this.books, this.readings, this.years, this.patternMap, this.currentYear),
  );

  bookById(id: string): BookRow | undefined {
    return this.books.find((b) => b.id === id);
  }

  readingById(id: string): ReadingRow | undefined {
    return this.readings.find((r) => r.id === id);
  }

  readingsOf(bookId: string): ReadingRow[] {
    return this.readings.filter((r) => r.book_id === bookId);
  }

  /** 처음 불러올 때만 '불러오는 중'을 보여 주고, 저장 뒤 다시 불러올 때는 그대로 둡니다. */
  async load(): Promise<void> {
    const first = this.state !== 'ready';
    if (first) this.state = 'loading';
    try {
      const [books, readings, years, settings] = await Promise.all([
        listBooks(),
        listReadings(),
        listYears(),
        getSettings(),
      ]);
      this.books = books;
      this.readings = readings;
      this.years = years;
      this.patternMap = parsePatternMap(settings?.pattern_map);
      this.lastBackupAt = settings?.last_backup_at ?? null;
      this.settings = settings;
      if (first && settings) this.#adoptPrefs(settings);
      this.state = 'ready';
    } catch (e) {
      console.warn('책장을 불러오지 못했어요', e);
      if (this.state !== 'ready') this.state = 'error';
    }
  }

  reset() {
    this.books = [];
    this.readings = [];
    this.years = [];
    this.patternMap = {};
    this.lastBackupAt = null;
    this.settings = null;
    this.state = 'idle';
  }

  /**
   * 테마·책등 스타일은 Supabase 값이 기준입니다(기기마다 같게, PRD F10). 처음 로그인할 때 한 번 맞춥니다.
   * DB가 아직 기본값(시스템·생성형)인데 이 기기에서 고른 값이 있으면, 이 기기 값을 DB로 올립니다(첫 동기화).
   */
  #adoptPrefs(settings: SettingsRow) {
    const theme = parseThemePref(settings.theme);
    const spine = parseSpineStyle(settings.spine_style);
    const untouched = theme === 'system' && spine === 'generated';
    if (untouched && (prefs.themePref !== 'system' || prefs.spine !== 'generated')) {
      void updateMySettings({ theme: prefs.themePref, spine_style: prefs.spine }).catch(
        (e: unknown) => console.warn('설정을 저장하지 못했어요', e),
      );
      return;
    }
    if (prefs.themePref !== theme) prefs.setTheme(theme);
    if (prefs.spine !== spine) prefs.setSpine(spine);
  }

  /** 테마 고르기: 바로 바꾸고 Supabase에도 저장 */
  chooseTheme(theme: ThemePref): Promise<boolean> {
    prefs.setTheme(theme);
    return this.#save(() => updateMySettings({ theme }));
  }

  /** 책등 스타일 고르기. 표지 질감을 고르면 질감이 없는 책의 질감을 만듭니다(PRD 6.5). */
  async chooseSpine(spine: SpineStyle): Promise<boolean> {
    prefs.setSpine(spine);
    const ok = await this.#save(() => updateMySettings({ spine_style: spine }));
    if (spine === 'texture') void this.ensureTextures();
    return ok;
  }

  /** 표지는 있는데 질감 이미지가 없는 책의 질감을 한꺼번에 만듭니다(2권씩). */
  async ensureTextures(): Promise<number> {
    if (this.textureJob) return 0;
    const todo = this.books.filter((b) => b.cover_path && !b.texture_path);
    if (todo.length === 0) return 0;
    this.textureJob = { done: 0, total: todo.length };
    let made = 0;
    await runPool(
      todo,
      async (b) => {
        try {
          const path = await textureFor(b.id, await downloadCover(b.cover_path!));
          if (path) {
            await updateBook(b.id, { texture_path: path });
            made++;
          }
        } catch (e) {
          console.warn('표지 질감을 만들지 못했어요', e);
        }
      },
      {
        concurrency: 2,
        gapMs: 0,
        onProgress: (done) => (this.textureJob = { done, total: todo.length }),
      },
    );
    this.textureJob = null;
    await this.load();
    return made;
  }

  /** 분야별 책등 무늬 (기본값과 다른 것만 저장) */
  savePatternMap(map: Record<string, Pattern>): Promise<boolean> {
    return this.#save(() => updateMySettings({ pattern_map: map }));
  }

  /** 분야 이름 바꾸기·합치기 */
  renameCategory(from: string, to: string): Promise<boolean> {
    return this.#save(() => renameCategory(from, to));
  }

  /** 저장 작업을 계정 영역의 저장 상태 점과 잇습니다. 실패하면 false */
  async #save(work: () => Promise<void>): Promise<boolean> {
    status.save = 'saving';
    try {
      await work();
      status.save = 'saved';
    } catch (e) {
      console.warn('저장하지 못했어요', e);
      status.save = 'error';
      return false;
    }
    await this.load();
    return true;
  }

  bookByIsbn(isbn13: string): BookRow | undefined {
    return this.books.find((b) => b.isbn13 === isbn13);
  }

  /**
   * 새 책 + 첫 독서 기록. 책 ID는 미리 만들어 기본 색 세트를 고르는 데 씁니다.
   * 검색에서 고른 책이면 표지를 먼저 올리고 책에 경로를 적습니다.
   */
  addBook(
    bookId: string,
    data: BookFormData,
    paletteTouched: boolean,
    extras: BookExtras | null = null,
  ): Promise<boolean> {
    return this.#save(async () => {
      const coverPath = extras?.coverJpeg ? await uploadCover(bookId, extras.coverJpeg) : null;
      const texturePath = extras?.coverJpeg ? await textureFor(bookId, extras.coverJpeg) : null;
      try {
        await insertBook({
          id: bookId,
          ...bookFields(data),
          source: extras ? 'kakao' : 'manual',
          isbn13: extras?.isbn13 ?? null,
          pub_date: extras?.pubDate ?? null,
          category_raw: extras?.categoryRaw ?? null,
          size: extras?.size ?? null,
          cover_path: coverPath,
          texture_path: texturePath,
          spine: toJson({
            palette: data.palette,
            candidates: extras?.candidates ?? [],
            pattern: data.pattern,
            manual: paletteTouched,
          }),
        });
      } catch (e) {
        // 책을 못 넣었으면 방금 올린 표지도 지웁니다.
        const uploaded = [coverPath, texturePath].filter((p): p is string => Boolean(p));
        if (uploaded.length > 0)
          await supabase.storage
            .from(COVER_BUCKET)
            .remove(uploaded)
            .catch(() => {});
        throw e;
      }
      if (coverPath && extras?.coverJpeg) covers.remember(coverPath, extras.coverJpeg);
      try {
        await insertReading({ book_id: bookId, ...readingFields(data) });
      } catch (e) {
        // 기록 없이 책만 남지 않게 되돌립니다.
        await deleteBook({ id: bookId, cover_path: coverPath, texture_path: texturePath }).catch(
          () => {},
        );
        throw e;
      }
    });
  }

  /** 책 정보와 기록 하나를 고칩니다. readingId가 null이면 기록을 새로 더합니다(다시 읽기). */
  saveEntry(
    bookId: string,
    readingId: string | null,
    data: BookFormData,
    paletteTouched: boolean,
  ): Promise<boolean> {
    const book = this.bookById(bookId);
    return this.#save(async () => {
      const old = book ? parseSpineData(book.spine, book.id) : null;
      await updateBook(bookId, {
        ...bookFields(data),
        spine: toJson({
          palette: data.palette,
          candidates: old?.candidates ?? [],
          pattern: data.pattern,
          manual: (old?.manual ?? false) || paletteTouched,
        }),
      });
      if (readingId) await updateReading(readingId, readingFields(data));
      else await insertReading({ book_id: bookId, ...readingFields(data) });
    });
  }

  /**
   * 한 책장 안 책 순서를 저장합니다(끌어 옮기기, 결정 0009). readingIds는 새 순서대로의 기록 ID.
   * 화면이 바로 바뀌도록 먼저 고쳐 두고, 순서가 바뀐 기록만 저장합니다. 실패하면 다시 불러와 되돌립니다.
   */
  async reorder(readingIds: readonly string[]): Promise<boolean> {
    const next = new Map(readingIds.map((id, i) => [id, i]));
    const changed = this.readings.filter(
      (r) => next.has(r.id) && r.shelf_position !== next.get(r.id),
    );
    if (changed.length === 0) return true;
    this.readings = this.readings.map((r) =>
      next.has(r.id) ? { ...r, shelf_position: next.get(r.id)! } : r,
    );
    const ok = await this.#save(async () => {
      await Promise.all(
        changed.map((r) => updateReading(r.id, { shelf_position: next.get(r.id)! })),
      );
    });
    if (!ok) await this.load();
    return ok;
  }

  /**
   * 다른 해 책장으로 옮기기(결정 0016): 완독일을 바꾸고, 새 책장에서는 순서를 정하지 않은
   * 책으로(내 순서의 맨 뒤 쪽) 둡니다. 연도는 DB가 완독일에서 계산합니다.
   */
  moveToDate(readingId: string, date: string): Promise<boolean> {
    return this.#save(() => updateReading(readingId, { finished_at: date, shelf_position: null }));
  }

  /** 그해의 책 목록(고른 순서 = 순위) */
  booksOfYear(year: number): string[] {
    return this.years.find((y) => y.year === year)?.book_of_year ?? [];
  }

  /**
   * 그해의 책으로 정하거나(이미 있으면) 뺍니다. 한 해에 3권까지, 고른 순서가 순위(PRD F6 P1).
   * 세 권이 다 찼으면 저장하지 않고 'full'
   */
  async toggleBookOfYear(year: number, bookId: string): Promise<boolean | 'full'> {
    const { list, full } = toggleRank(this.booksOfYear(year), bookId);
    if (full) return 'full';
    return this.#save(() => setBookOfYear(year, list));
  }

  /** 그해의 책 순위 올리기(-1)·내리기(+1) */
  moveBookOfYear(year: number, bookId: string, dir: -1 | 1): Promise<boolean> {
    const list = moveRank(this.booksOfYear(year), bookId, dir);
    return this.#save(() => setBookOfYear(year, list));
  }

  /** 그해 목표 권수(없으면 null) */
  goalOf(year: number): number | null {
    return this.years.find((y) => y.year === year)?.reading_goal ?? null;
  }

  /** 목표 권수 저장(1~1000으로 맞춤, null이면 지움) */
  saveReadingGoal(year: number, goal: number | null): Promise<boolean> {
    const clean = goal === null ? null : Math.min(1000, Math.max(1, Math.round(goal)));
    return this.#save(() => setReadingGoal(year, clean));
  }

  /** 한 줄 회고 저장(앞뒤 공백 정리, 비우면 null, 80자까지) */
  saveOneLiner(year: number, text: string): Promise<boolean> {
    const clean = text.trim().slice(0, 80);
    return this.#save(() => setOneLiner(year, clean || null));
  }

  /** 기록이 하나뿐이면 책까지 지우고, 여러 개면 그 기록만 지웁니다. */
  removeEntry(bookId: string, readingId: string): Promise<boolean> {
    const book = this.bookById(bookId);
    const onlyOne = this.readingsOf(bookId).length <= 1;
    return this.#save(async () => {
      if (onlyOne && book) await deleteBook(book);
      else await deleteReading(readingId);
    });
  }
}

export const library = new Library();
