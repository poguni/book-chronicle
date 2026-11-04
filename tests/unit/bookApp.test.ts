import { describe, expect, it } from 'vitest';
import { cleanAuthor, cleanTitle, mapCategory } from '../../src/lib/bookMap';
import { isbn10to13, toIsbn13 } from '../../src/lib/isbn';
import { extractPalette, kMeans, usablePixels } from '../../src/lib/spine/palette';
import { CATEGORIES } from '../../src/lib/spine/patterns';

describe('ISBN', () => {
  it('ISBN-10을 ISBN-13으로 바꾼다', () => {
    expect(isbn10to13('8954682154')).toBe('9788954682152');
    expect(isbn10to13('0-306-40615-2')).toBe('9780306406157');
    expect(isbn10to13('080442957X')).toBe('9780804429573');
  });

  it('검사 숫자가 틀리면 null', () => {
    expect(isbn10to13('8954682155')).toBeNull();
    expect(toIsbn13('9788954682153')).toBeNull();
  });

  it('하이픈·띄어쓰기를 무시하고 ISBN-13은 그대로', () => {
    expect(toIsbn13('978-89-546-8215-2')).toBe('9788954682152');
    expect(toIsbn13(' 9788954682152 ')).toBe('9788954682152');
    expect(toIsbn13('89 546 8215 4')).toBe('9788954682152');
  });

  it('ISBN이 아니면 null', () => {
    expect(toIsbn13('작별하지 않는다')).toBeNull();
    expect(toIsbn13('12345')).toBeNull();
    expect(toIsbn13('1234567890123')).toBeNull();
  });
});

describe('제목·저자 정리', () => {
  it('부제는 뗀다', () => {
    expect(cleanTitle('사피엔스 - 유인원에서 사이보그까지, 인간 역사의 대담하고 위대한 질문')).toBe(
      '사피엔스',
    );
    expect(cleanTitle('1984')).toBe('1984');
    expect(cleanTitle('A-B 테스트')).toBe('A-B 테스트');
  });

  it('지은이만 남기고, 표시가 없으면 첫 사람', () => {
    expect(cleanAuthor('유발 하라리 (지은이), 조현욱 (옮긴이), 이태수 (감수)')).toBe('유발 하라리');
    expect(cleanAuthor('김영하 (지은이), 정세랑 (지은이)')).toBe('김영하, 정세랑');
    expect(cleanAuthor('한강 (지은이)')).toBe('한강');
    expect(cleanAuthor('편집부 (엮은이), 홍길동 (옮긴이)')).toBe('편집부');
    expect(cleanAuthor('Wes McKinney')).toBe('Wes McKinney');
    // 카카오는 역할 없이 이름만 줌
    expect(cleanAuthor('기시미 이치로, 고가 후미타케')).toBe('기시미 이치로, 고가 후미타케');
    expect(cleanAuthor(null)).toBeNull();
  });
});

describe('mapCategory', () => {
  it('제목 낱말이 먼저: 좁은 주제', () => {
    expect(mapCategory('파이썬 라이브러리를 활용한 데이터 분석', '005.133')).toBe('파이썬');
    expect(mapCategory('바이브 코딩 입문', '005.1')).toBe('바이브 코딩');
    expect(mapCategory('데이터 분석 첫걸음', '005.7')).toBe('데이터 분석');
    expect(mapCategory('교육평가의 이해', '370.1')).toBe('교육평가');
    expect(mapCategory('교육심리학', '370.15')).toBe('교육심리');
    expect(mapCategory('R로 배우는 통계', null)).toBe('통계학');
  });

  it('KDC 분류번호로 24개 분야', () => {
    expect(mapCategory('책', '005.1')).toBe('IT & 컴퓨터');
    expect(mapCategory('책', '310')).toBe('통계학');
    expect(mapCategory('책', '327.85')).toBe('주식 & 경제');
    expect(mapCategory('책', '331')).toBe('사회과학');
    expect(mapCategory('책', '413.1')).toBe('통계학');
    expect(mapCategory('책', '410')).toBe('수학');
    expect(mapCategory('책', '430')).toBe('화학');
    expect(mapCategory('책', '472')).toBe('생명과학');
    expect(mapCategory('책', '420')).toBe('과학');
    expect(mapCategory('책', '660')).toBe('사진 & 카메라');
    expect(mapCategory('책', '691')).toBe('취미');
    expect(mapCategory('책', '737')).toBe('일본어');
    expect(mapCategory('책', '742')).toBe('영어');
    expect(mapCategory('책', '720')).toBe('언어');
    expect(mapCategory('책', '981')).toBe('여행');
    expect(mapCategory('책', '911')).toBe('인문');
    expect(mapCategory('책', '160')).toBe('인문');
    expect(mapCategory('책', '051')).toBe('학술지');
  });

  it('맞는 분야가 없으면 KDC 주류 이름, 분류가 없으면 null', () => {
    expect(mapCategory('작별하지 않는다', '813.7')).toBe('문학');
    expect(mapCategory('그림 그리기', '650')).toBe('예술');
    expect(mapCategory('작별하지 않는다', null)).toBeNull();
    expect(mapCategory(null, 'abc')).toBeNull();
  });

  it('24개 분야로 옮긴 값은 목록에 있다', () => {
    const r = mapCategory('책', '410');
    expect((CATEGORIES as readonly string[]).includes(r!)).toBe(true);
  });
});

/** w×h 그림을 칸별 색으로 채운 RGBA */
function image(w: number, h: number, colorAt: (x: number, y: number) => number[]): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = colorAt(x, y);
      data.set([r!, g!, b!, 255], (y * w + x) * 4);
    }
  return data;
}

describe('표지 팔레트', () => {
  it('흰 테두리와 검정·흰 픽셀은 빼고 고른다', () => {
    const img = image(10, 10, (x, y) =>
      x < 2 || y < 2 || x > 7 || y > 7 ? [250, 250, 250] : [40, 90, 160],
    );
    const px = usablePixels(img, 10, 10);
    expect(px.every((p) => p[2] === 160)).toBe(true);
  });

  it('넓은 바탕 + 밝은 띠 + 작고 선명한 강조색', () => {
    // 64×64: 위쪽 70%는 남색, 그 아래 25%는 크림색, 가운데 작은 빨강
    const img = image(64, 64, (x, y) => {
      if (y >= 30 && y < 34 && x >= 28 && x < 36) return [220, 40, 40];
      return y < 45 ? [31, 35, 64] : [233, 225, 207];
    });
    const result = extractPalette(img, 64, 64)!;
    expect(result.palette.base).toBe('#1F2340');
    expect(result.palette.band).toBe('#E9E1CF');
    expect(result.palette.accent).toBe('#DC2828');
    expect(result.candidates.length).toBeGreaterThanOrEqual(3);
    expect(result.candidates.length).toBeLessThanOrEqual(5);
  });

  it('같은 그림은 늘 같은 결과', () => {
    const img = image(16, 16, (x, y) => [x * 15, y * 15, 120]);
    expect(extractPalette(img, 16, 16)).toEqual(extractPalette(img, 16, 16));
  });

  it('한 가지 색뿐이어도 세 색을 만든다', () => {
    const result = extractPalette(
      image(8, 8, () => [120, 60, 40]),
      8,
      8,
    )!;
    expect(result.palette.base).toBe('#783C28');
    expect(result.palette.band).not.toBe(result.palette.base);
    expect(result.palette.accent).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('거의 흰 표지는 무채색 그대로', () => {
    const result = extractPalette(
      image(8, 8, () => [252, 252, 252]),
      8,
      8,
    )!;
    expect(result.palette.base).toBe('#FCFCFC');
  });

  it('픽셀이 없으면 null, k-평균은 빈 묶음을 버린다', () => {
    expect(extractPalette(new Uint8Array(0), 0, 0)).toBeNull();
    expect(kMeans([[1, 2, 3]])).toEqual([{ color: [1, 2, 3], count: 1 }]);
  });
});
