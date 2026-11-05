import { describe, expect, it } from 'vitest';
import { formatNumber, formatToday, monthBars, ordinalKo } from '../../src/lib/format';
import { josa } from '../../src/lib/i18n/josa';

describe('formatToday', () => {
  it('연월일과 요일을 한국어로 쓴다', () => {
    expect(formatToday(new Date(2026, 10, 4))).toBe('2026년 11월 4일 수요일');
  });
});

describe('formatNumber', () => {
  it('천 단위 쉼표', () => {
    expect(formatNumber(4967)).toBe('4,967');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('ordinalKo', () => {
  it('열까지는 우리말, 그 뒤는 숫자', () => {
    expect(ordinalKo(1)).toBe('첫 번째');
    expect(ordinalKo(4)).toBe('네 번째');
    expect(ordinalKo(10)).toBe('열 번째');
    expect(ordinalKo(11)).toBe('11번째');
  });
});

describe('monthBars', () => {
  const today = new Date(2026, 10, 4); // 11월

  it('올해는 현재 달 now, 지난 달 past, 남은 달 off', () => {
    const bars = monthBars([], 2026, today);
    expect(bars).toHaveLength(12);
    expect(bars[9]?.state).toBe('past');
    expect(bars[10]?.state).toBe('now');
    expect(bars[11]?.state).toBe('off');
  });

  it('지난 연도는 모두 past, 다음 연도는 모두 off', () => {
    expect(monthBars([], 2025, today).every((b) => b.state === 'past')).toBe(true);
    expect(monthBars([], 2027, today).every((b) => b.state === 'off')).toBe(true);
  });

  it('권수가 없으면 0', () => {
    const bars = monthBars([1, 2], 2026, today);
    expect(bars.map((b) => b.count)).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('josa: 받침에 따른 조사', () => {
  it('한글 받침', () => {
    expect(josa('데미안', '을/를')).toBe('을');
    expect(josa('코스모스', '을/를')).toBe('를');
    expect(josa('사피엔스', '은/는')).toBe('는');
    expect(josa('인문', '으로/로')).toBe('으로');
    expect(josa('역사', '으로/로')).toBe('로');
    // ㄹ 받침 뒤에는 '로'
    expect(josa('소설', '으로/로')).toBe('로');
  });

  it('숫자·영문은 읽는 소리로, 괄호·문장 부호는 건너뜀', () => {
    expect(josa('2026년 책 4', '은/는')).toBe('는');
    expect(josa('2026년 책 3', '은/는')).toBe('은');
    expect(josa('#2F4F66', '으로/로')).toBe('으로');
    expect(josa('#C9A45C', '으로/로')).toBe('로');
    expect(josa('1984', '을/를')).toBe('를');
    expect(josa('HTML', '을/를')).toBe('을');
    expect(josa('파친코 (1)', '을/를')).toBe('을');
  });
});
