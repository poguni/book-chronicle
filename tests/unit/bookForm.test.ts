import { describe, expect, it } from 'vitest';
import { emptyForm, formFromRows, validateForm, type BookFormValues } from '../../src/lib/bookForm';
import type { BookRow, ReadingRow } from '../../src/lib/shelves';
import { presetPalette } from '../../src/lib/spine/spineData';

function form(over: Partial<BookFormValues> = {}): BookFormValues {
  return { ...emptyForm('book-1'), title: '작별하지 않는다', ...over };
}

describe('emptyForm', () => {
  it('완독 상태와 책 ID로 고른 기본 색으로 시작한다', () => {
    const f = emptyForm('book-1');
    expect(f.status).toBe('finished');
    expect(f.palette).toEqual(presetPalette('book-1'));
    expect(f.pattern).toBeNull();
  });
});

describe('validateForm', () => {
  it('빈 칸은 null로, 글자는 앞뒤 공백을 지운다', () => {
    const r = validateForm(
      form({ title: '  데미안 ', author: ' ', pages: '1,024', rating: '4.5' }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      title: '데미안',
      author: null,
      publisher: null,
      pages: 1024,
      category: null,
      finishedAt: null,
      rating: 4.5,
      note: null,
    });
  });

  it('제목이 없으면 알려 준다', () => {
    const r = validateForm(form({ title: '   ' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeTruthy();
  });

  it('쪽수는 1 이상의 정수만', () => {
    for (const pages of ['0', '-3', '12.5', '삼백']) {
      const r = validateForm(form({ pages }));
      expect(r.ok, pages).toBe(false);
    }
  });

  it('완독일은 있는 날짜만', () => {
    expect(validateForm(form({ finishedAt: '2026-02-30' })).ok).toBe(false);
    expect(validateForm(form({ finishedAt: '1899-12-31' })).ok).toBe(false);
    const r = validateForm(form({ finishedAt: '2026-02-28' }));
    expect(r.ok && r.data.finishedAt).toBe('2026-02-28');
  });

  it('읽는 중·중단이면 완독일을 버린다', () => {
    const r = validateForm(form({ status: 'reading', finishedAt: '2026-01-01' }));
    expect(r.ok && r.data.finishedAt).toBeNull();
  });

  it('별점은 0.5 단위 0~5, 비우면 별점 없음(0과 다름)', () => {
    expect(validateForm(form({ rating: '4.3' })).ok).toBe(false);
    const none = validateForm(form({ rating: '' }));
    expect(none.ok && none.data.rating).toBeNull();
    const zero = validateForm(form({ rating: '0' }));
    expect(zero.ok && zero.data.rating).toBe(0);
  });
});

describe('formFromRows', () => {
  const book = {
    id: 'b1',
    title: '코스모스',
    author: '칼 세이건',
    publisher: null,
    pages: 719,
    category: '과학',
    spine: {
      palette: { base: '#1F2340', band: '#C9A45C', accent: '#C9A45C' },
      pattern: 'hardcover',
    },
  } as unknown as BookRow;
  const reading = {
    id: 'r1',
    book_id: 'b1',
    status: 'finished',
    finished_at: '2026-06-01',
    rating: 4.5,
    note: '별을 보는 눈',
  } as unknown as ReadingRow;

  it('DB 행을 입력창 값으로 바꾼다', () => {
    expect(formFromRows(book, reading)).toEqual({
      title: '코스모스',
      author: '칼 세이건',
      publisher: '',
      pages: '719',
      category: '과학',
      status: 'finished',
      finishedAt: '2026-06-01',
      rating: '4.5',
      note: '별을 보는 눈',
      palette: { base: '#1F2340', band: '#C9A45C', accent: '#C9A45C' },
      pattern: 'hardcover',
    });
  });

  it('기록이 없으면 기록 칸은 비운다', () => {
    const f = formFromRows(book, null);
    expect(f).toMatchObject({ status: 'finished', finishedAt: '', rating: '', note: '' });
  });
});
