import type { BookFormData } from './bookForm';
import { deleteBook, insertBook, listBooks, updateBook } from './data/books';
import { deleteReading, insertReading, listReadings, updateReading } from './data/readings';
import { getSettings } from './data/settings';
import { listYears } from './data/years';
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

  /** 새 책 + 첫 독서 기록. 책 ID는 미리 만들어 기본 색 세트를 고르는 데 씁니다. */
  addBook(bookId: string, data: BookFormData, paletteTouched: boolean): Promise<boolean> {
    return this.#save(async () => {
      await insertBook({
        id: bookId,
        ...bookFields(data),
        source: 'manual',
        spine: toJson({
          palette: data.palette,
          candidates: [],
          pattern: data.pattern,
          manual: paletteTouched,
        }),
      });
      try {
        await insertReading({ book_id: bookId, ...readingFields(data) });
      } catch (e) {
        // 기록 없이 책만 남지 않게 되돌립니다.
        await deleteBook({ id: bookId, cover_path: null, texture_path: null }).catch(() => {});
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
