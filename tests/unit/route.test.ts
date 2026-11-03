import { describe, expect, it } from 'vitest';
import { parseHash } from '../../src/lib/route';

describe('parseHash', () => {
  it('빈 주소와 #/는 책장 홈', () => {
    expect(parseHash('')).toEqual({ name: 'shelves' });
    expect(parseHash('#')).toEqual({ name: 'shelves' });
    expect(parseHash('#/')).toEqual({ name: 'shelves' });
  });

  it('메뉴 화면 주소를 읽는다', () => {
    expect(parseHash('#/compare')).toEqual({ name: 'compare' });
    expect(parseHash('#/list')).toEqual({ name: 'list' });
    expect(parseHash('#/import')).toEqual({ name: 'import' });
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
    expect(parseHash('#/login')).toEqual({ name: 'login' });
  });

  it('끝의 빗금은 무시한다', () => {
    expect(parseHash('#/compare/')).toEqual({ name: 'compare' });
  });

  it('연말 회고는 연도가 있거나 없다', () => {
    expect(parseHash('#/recap')).toEqual({ name: 'recap', year: null });
    expect(parseHash('#/recap/2026')).toEqual({ name: 'recap', year: 2026 });
  });

  it('잘못된 연도는 책장 홈으로', () => {
    expect(parseHash('#/recap/26')).toEqual({ name: 'shelves' });
    expect(parseHash('#/recap/abcd')).toEqual({ name: 'shelves' });
    expect(parseHash('#/recap/2026/extra')).toEqual({ name: 'shelves' });
  });

  it('알 수 없는 주소는 책장 홈으로', () => {
    expect(parseHash('#/nope')).toEqual({ name: 'shelves' });
    expect(parseHash('#/compare/extra')).toEqual({ name: 'shelves' });
    // 객체 기본 속성 이름이 화면 이름으로 잘못 읽히지 않아야 함
    expect(parseHash('#/toString')).toEqual({ name: 'shelves' });
    expect(parseHash('#/__proto__')).toEqual({ name: 'shelves' });
  });

  it('시안의 연도 앵커(#y2026) 같은 주소도 책장 홈', () => {
    expect(parseHash('#y2026')).toEqual({ name: 'shelves' });
  });
});
