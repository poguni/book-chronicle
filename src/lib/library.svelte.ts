import type { BookFormData } from './bookForm';
import { covers } from './covers.svelte';
import type { Json } from './database.types';
import { COVER_BUCKET, deleteBook, insertBook, listBooks, updateBook } from './data/books';
import { uploadCover } from './data/covers';
import { deleteReading, insertReading, listReadings, updateReading } from './data/readings';
import { getSettings } from './data/settings';
import { listYears, setBookOfYear } from './data/years';
import {
  buildShelves,
  type BookRow,
  type ReadingRow,
  type ShelfYear,
  type YearRow,
} from './shelves';
import { parsePatternMap, type Pattern } from './spine/patterns';
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

class Library {
  books = $state.raw<BookRow[]>([]);
  readings = $state.raw<ReadingRow[]>([]);
  years = $state.raw<YearRow[]>([]);
  patternMap = $state.raw<Record<string, Pattern>>({});
  /** 마지막으로 JSON 백업을 받은 시각 (30일 알림, PRD F9) */
  lastBackupAt = $state<string | null>(null);
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
    if (this.state !== 'ready') this.state = 'loading';
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
    this.state = 'idle';
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
          spine: toJson({
            palette: data.palette,
            candidates: extras?.candidates ?? [],
            pattern: data.pattern,
            manual: paletteTouched,
          }),
        });
      } catch (e) {
        // 책을 못 넣었으면 방금 올린 표지도 지웁니다.
        if (coverPath)
          await supabase.storage
            .from(COVER_BUCKET)
            .remove([coverPath])
            .catch(() => {});
        throw e;
      }
      if (coverPath && extras?.coverJpeg) covers.remember(coverPath, extras.coverJpeg);
      try {
        await insertReading({ book_id: bookId, ...readingFields(data) });
      } catch (e) {
        // 기록 없이 책만 남지 않게 되돌립니다.
        await deleteBook({ id: bookId, cover_path: coverPath, texture_path: null }).catch(() => {});
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
   * 그해의 책으로 정하거나(이미 그 책이면) 해제합니다. 그해의 책은 한 해에 1권(PRD F6, P0).
   */
  toggleBookOfYear(year: number, bookId: string): Promise<boolean> {
    const current = this.years.find((y) => y.year === year)?.book_of_year ?? [];
    const next = current[0] === bookId ? [] : [bookId];
    return this.#save(() => setBookOfYear(year, next));
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
