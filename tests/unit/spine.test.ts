import { describe, expect, it } from 'vitest';
import { contrast, hueKey, INK_DARK, INK_LIGHT, inkFor } from '../../src/lib/spine/color';
import {
  categoryAveragePages,
  effectivePages,
  hashId,
  packRows,
  spineHeight,
  spineWidthPx,
} from '../../src/lib/spine/geometry';
import { parsePatternMap, patternFor } from '../../src/lib/spine/patterns';
import { parseSpineData, presetPalette, PRESET_PALETTES } from '../../src/lib/spine/spineData';

describe('patternFor', () => {
  it('분야별 기본 패턴', () => {
    expect(patternFor(null, '역사')).toBe('hardcover');
    expect(patternFor(null, '경제경영')).toBe('hardcover');
    expect(patternFor(null, '소설/시/희곡')).toBe('paperback');
    expect(patternFor(null, '에세이')).toBe('label');
  });

  it('매핑에 없는 분야와 분야 없음은 라벨형', () => {
    expect(patternFor(null, '요리/살림')).toBe('label');
    expect(patternFor(null, null)).toBe('label');
  });

  it('외서 표시는 떼고 찾는다', () => {
    expect(patternFor(null, '외서 소설/시/희곡')).toBe('paperback');
  });

  it('책마다 지정한 패턴 > 사용자 매핑 > 기본 매핑', () => {
    expect(patternFor(null, '역사', { 역사: 'label' })).toBe('label');
    expect(patternFor('paperback', '역사', { 역사: 'label' })).toBe('paperback');
  });

  it('settings.pattern_map에서 이상한 값은 버린다', () => {
    expect(parsePatternMap({ 역사: 'label', 과학: 'shiny', 소설: 3 })).toEqual({ 역사: 'label' });
    expect(parsePatternMap(null)).toEqual({});
    expect(parsePatternMap(['label'])).toEqual({});
  });
});

describe('글자색', () => {
  it('밝은 바탕에는 어두운 글자, 어두운 바탕에는 밝은 글자', () => {
    expect(inkFor('#E8E1D3')).toBe(INK_DARK);
    expect(inkFor('#1F2340')).toBe(INK_LIGHT);
    expect(inkFor('#F0C05A')).toBe(INK_DARK);
  });

  it('고른 글자색은 바탕과 명암비가 더 높은 쪽이다', () => {
    for (const p of PRESET_PALETTES) {
      const ink = inkFor(p.base);
      const other = ink === INK_DARK ? INK_LIGHT : INK_DARK;
      expect(contrast(p.base, ink)).toBeGreaterThanOrEqual(contrast(p.base, other));
    }
  });

  it('명암비 계산', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('색상순 키: 빨강 < 초록 < 파랑, 무채색은 맨 뒤', () => {
    expect(hueKey('#C0392B')).toBeLessThan(hueKey('#3F8F6B'));
    expect(hueKey('#3F8F6B')).toBeLessThan(hueKey('#2F4F6F'));
    expect(hueKey('#5A5F66')).toBeGreaterThanOrEqual(400);
  });
});

describe('책등 크기', () => {
  it('높이는 132~173이고 같은 책은 늘 같다', () => {
    for (const id of ['a', 'b', '0f8c3b5e-1111-4000-8000-000000000000', '책']) {
      const h = spineHeight(id);
      expect(h).toBeGreaterThanOrEqual(132);
      expect(h).toBeLessThanOrEqual(173);
      expect(spineHeight(id)).toBe(h);
    }
    expect(hashId('abc')).toBe(hashId('abc'));
  });

  it('두께 = clamp(8px, 쪽수 × 0.019cqw, 9cqw)', () => {
    // 책장 폭 760px: 1cqw = 7.6px
    expect(spineWidthPx(300, 760)).toBeCloseTo(300 * 0.019 * 7.6, 5);
    expect(spineWidthPx(20, 760)).toBe(8);
    expect(spineWidthPx(2000, 760)).toBeCloseTo(9 * 7.6, 5);
  });

  it('쪽수를 모르면 분야 평균, 그것도 없으면 280쪽 추정', () => {
    const books = [
      { category: '소설', pages: 200, pages_estimated: false },
      { category: '소설', pages: 400, pages_estimated: false },
      { category: '소설', pages: 900, pages_estimated: true }, // 추정값은 평균에서 뺌
      { category: '역사', pages: null, pages_estimated: false },
    ];
    const avg = categoryAveragePages(books);
    expect(avg.get('소설')).toBe(300);
    expect(effectivePages({ category: '소설', pages: null, pages_estimated: false }, avg)).toEqual({
      pages: 300,
      estimated: true,
    });
    expect(effectivePages({ category: '역사', pages: null, pages_estimated: false }, avg)).toEqual({
      pages: 280,
      estimated: true,
    });
    expect(effectivePages({ category: null, pages: 123, pages_estimated: false }, avg)).toEqual({
      pages: 123,
      estimated: false,
    });
  });
});

describe('packRows', () => {
  it('폭을 넘으면 다음 줄로 넘긴다 (책 사이 2px)', () => {
    expect(packRows([40, 40, 40], 100)).toEqual([[0, 1], [2]]);
    expect(packRows([40, 40, 40], 124)).toEqual([[0, 1, 2]]);
  });

  it('한 권이 폭보다 넓어도 한 줄에 혼자 둔다', () => {
    expect(packRows([150, 10], 100)).toEqual([[0], [1]]);
  });

  it('폭을 모르면 한 줄, 책이 없으면 빈 줄 하나', () => {
    expect(packRows([40, 40], 0)).toEqual([[0, 1]]);
    expect(packRows([], 500)).toEqual([[]]);
  });
});

describe('parseSpineData', () => {
  it('저장된 값을 읽는다', () => {
    const s = parseSpineData(
      {
        palette: { base: '#112233', band: '#445566', accent: '#778899' },
        candidates: ['#112233', 'nope'],
        pattern: 'hardcover',
        manual: true,
      },
      'x',
    );
    expect(s).toEqual({
      palette: { base: '#112233', band: '#445566', accent: '#778899' },
      candidates: ['#112233'],
      pattern: 'hardcover',
      manual: true,
    });
  });

  it('이상한 값은 책 ID로 고른 기본 색으로 채운다', () => {
    const s = parseSpineData({ palette: { base: 'red' }, pattern: 'zigzag' }, 'book-1');
    expect(s.palette).toEqual(presetPalette('book-1'));
    expect(s.pattern).toBeNull();
    expect(parseSpineData(null, 'book-1').palette).toEqual(presetPalette('book-1'));
  });
});
