import { describe, expect, it } from 'vitest';
import { isbnFromBarcode } from '../../src/lib/barcode';
import { matchesHighlight, parseHighlight } from '../../src/lib/shelves';

describe('바코드 → ISBN (P1)', () => {
  it('978·979로 시작하고 검사 숫자가 맞는 EAN-13만', () => {
    expect(isbnFromBarcode('9788954682152')).toBe('9788954682152');
    expect(isbnFromBarcode('978-89-546-8215-2')).toBe('9788954682152');
    expect(isbnFromBarcode('9788954682153')).toBeNull(); // 검사 숫자 틀림
    expect(isbnFromBarcode('8801234567893')).toBeNull(); // 책이 아닌 상품
    expect(isbnFromBarcode('97889546821')).toBeNull();
  });
});

describe('강조 보기 (P1)', () => {
  it('값 읽기', () => {
    expect(parseHighlight('')).toEqual({ kind: 'none' });
    expect(parseHighlight('rating')).toEqual({ kind: 'rating' });
    expect(parseHighlight('cat:주식 & 경제')).toEqual({
      kind: 'category',
      category: '주식 & 경제',
    });
    expect(parseHighlight('cat:')).toEqual({ kind: 'none' });
  });

  it('별점 4.5 이상, 또는 그 분야만 강조. 강조 없음이면 모두', () => {
    const r = parseHighlight('rating');
    expect(matchesHighlight({ rating: 4.5, category: null }, r)).toBe(true);
    expect(matchesHighlight({ rating: 4, category: null }, r)).toBe(false);
    expect(matchesHighlight({ rating: null, category: null }, r)).toBe(false);
    const c = parseHighlight('cat:인문');
    expect(matchesHighlight({ rating: null, category: '인문' }, c)).toBe(true);
    expect(matchesHighlight({ rating: 5, category: '과학' }, c)).toBe(false);
    expect(matchesHighlight({ rating: null, category: null }, { kind: 'none' })).toBe(true);
  });
});
