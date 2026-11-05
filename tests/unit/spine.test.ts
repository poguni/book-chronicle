import { describe, expect, it } from 'vitest';
import { contrast, hueKey, INK_DARK, INK_LIGHT, inkFor } from '../../src/lib/spine/color';
import {
  categoryAveragePages,
  effectivePages,
  fitTitle,
  hashId,
  packRows,
  pulloutShifts,
  spineHeight,
  spineHk,
  spineWidthPx,
  textEm,
  TITLE_FONT_MIN,
} from '../../src/lib/spine/geometry';
import {
  CATEGORIES,
  DEFAULT_PATTERN_MAP,
  parsePatternMap,
  patternFor,
} from '../../src/lib/spine/patterns';
import { parseSpineData, presetPalette, PRESET_PALETTES } from '../../src/lib/spine/spineData';

describe('patternFor', () => {
  it('분야별 기본 패턴', () => {
    expect(patternFor(null, '통계학')).toBe('hardcover');
    expect(patternFor(null, '논문')).toBe('hardcover');
    expect(patternFor(null, '파이썬')).toBe('paperback');
    expect(patternFor(null, '만화')).toBe('paperback');
    expect(patternFor(null, '일본어')).toBe('label');
    expect(patternFor(null, '사진 & 카메라')).toBe('label');
  });

  it('24개 분야 모두 기본 패턴이 있다', () => {
    expect(CATEGORIES).toHaveLength(24);
    for (const c of CATEGORIES) expect(DEFAULT_PATTERN_MAP[c], c).toBeDefined();
  });

  it('목록에 없는 분야(직접 입력)와 분야 없음은 라벨형', () => {
    expect(patternFor(null, '소설')).toBe('label');
    expect(patternFor(null, null)).toBe('label');
  });

  it('외서 표시는 떼고 찾는다', () => {
    expect(patternFor(null, '외서 수학')).toBe('hardcover');
  });

  it('책마다 지정한 패턴 > 사용자 매핑 > 기본 매핑', () => {
    expect(patternFor(null, '수학', { 수학: 'label' })).toBe('label');
    expect(patternFor('paperback', '수학', { 수학: 'label' })).toBe('paperback');
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

  it('두께 = clamp(12px, max(쪽수 × 0.012cqw, 쪽수 × 0.07px), max(6cqw, 36px))', () => {
    // 책장 폭 760px: 1cqw = 7.6px
    expect(spineWidthPx(300, 760)).toBeCloseTo(300 * 0.012 * 7.6, 5);
    expect(spineWidthPx(20, 760)).toBe(12);
    expect(spineWidthPx(2000, 760)).toBeCloseTo(6 * 7.6, 5);
    // 좁은 책장(휴대폰): 쪽당 0.07px 하한, 최대 36px
    expect(spineWidthPx(300, 330)).toBeCloseTo(21, 5);
    expect(spineWidthPx(2000, 330)).toBe(36);
  });

  it('한 해 15권(평균 300쪽)이 데스크톱 책장의 3분의 2 안에 한 줄로 꽂힌다', () => {
    const widths = Array.from({ length: 15 }, () => spineWidthPx(300, 700));
    expect(packRows(widths, 700)).toHaveLength(1);
    const used = widths.reduce((a, b) => a + b, 0) + 14 * 2;
    expect(used).toBeLessThan(700 * (2 / 3));
  });

  it('높이 배율은 CSS --spine-hk와 같은 식', () => {
    expect(spineHk(390)).toBe(0.72);
    expect(spineHk(1200)).toBeCloseTo(0.84, 5);
    expect(spineHk(1920)).toBe(0.98);
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

describe('fitTitle', () => {
  it('세로쓰기 길이: 한글 1.2em, 영문·숫자 0.6em, 띄어쓰기 0.3em', () => {
    expect(textEm('데미안')).toBeCloseTo(3.6, 5);
    expect(textEm('1984')).toBeCloseTo(2.4, 5);
    expect(textEm('총 균 쇠')).toBeCloseTo(4.2, 5);
  });

  it('짧은 제목은 가장 큰 12px 한 줄, 저자도 함께', () => {
    const fit = fitTitle('데미안', '헤세', 'paperback', 24, 150);
    expect(fit).toMatchObject({ font: 12, cols: 1, author: true });
  });

  it('긴 제목은 글자를 줄이거나 여러 줄로 나눠 모두 넣는다', () => {
    const title = '파이썬 라이브러리를 활용한 데이터 분석';
    const fit = fitTitle(title, '웨스 맥키니', 'paperback', 24, 150);
    expect(fit.font).toBeGreaterThanOrEqual(TITLE_FONT_MIN);
    // 줄 수 × 줄 높이 안에 제목 길이가 들어감
    expect(fit.cols * fit.maxHeight).toBeGreaterThanOrEqual(textEm(title) * fit.font);
    // 줄들이 책등 폭 안에 들어감
    expect(fit.cols * fit.font * 1.15).toBeLessThanOrEqual(24 - 3);
  });

  it('저자까지 넣으면 제목이 9px보다 작아질 때는 저자를 뺀다', () => {
    const fit = fitTitle('통계학 입문: 데이터로 세상 읽기', '아무개 지음', 'paperback', 16, 130);
    expect(fit.author).toBe(false);
  });

  it('하드커버는 저자를 넣지 않고, 라벨형은 상자 안쪽 여백을 높이에 더한다', () => {
    expect(fitTitle('데미안', '헤세', 'hardcover', 24, 150).author).toBe(false);
    const label = fitTitle('데미안', null, 'label', 30, 150);
    const paper = fitTitle('데미안', null, 'paperback', 30, 150);
    expect(label.maxHeight).toBeGreaterThan(0);
    expect(paper.maxHeight).toBeGreaterThan(0);
  });

  it('가장 작은 글자로도 넘치면 7px로 둔다', () => {
    const fit = fitTitle('아주 긴 제목'.repeat(10), null, 'label', 12, 100);
    expect(fit.font).toBe(TITLE_FONT_MIN);
    expect(fit.cols).toBe(1);
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

describe('꺼내 보기: 옆 책 밀기', () => {
  // 폭 20px 책 다섯 권, 표지 면 100px
  const widths = [20, 20, 20, 20, 20];
  const row = [0, 1, 2, 3, 4];
  const push =
    Math.max(
      0,
      20 * Math.cos((62 * Math.PI) / 180) + 100 * Math.sin((62 * Math.PI) / 180) * 1.05 - 20,
    ) + 6;

  it('자리가 넉넉하면 오른쪽 책만 표지 폭만큼 민다', () => {
    const s = pulloutShifts(widths, row, 1, 600, 100);
    expect(s[0]).toBeUndefined();
    expect(s[1]).toBeUndefined();
    expect(s[2]).toBeCloseTo(push, 0);
    expect(s[4]).toBe(s[2]);
  });

  it('줄 끝에 자리가 모자라면 꺼낸 책과 왼쪽 책을 당겨 표지가 잘리지 않게 한다', () => {
    const used = 5 * 20 + 4 * 2;
    const s = pulloutShifts(widths, row, 4, used + 20, 100);
    const deficit = used + push - (used + 20);
    expect(s[4]).toBeCloseTo(-deficit, 0);
    expect(s[0]).toBeCloseTo(-deficit, 0);
  });

  it('고른 책이 다른 줄이면 아무것도 밀지 않는다', () => {
    expect(pulloutShifts(widths, [0, 1], 3, 600, 100)).toEqual({});
  });
});
