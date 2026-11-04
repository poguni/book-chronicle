import { describe, expect, it } from 'vitest';
import { ratingFromPosition, starFill, stepRating } from '../../src/lib/rating';

describe('ratingFromPosition', () => {
  // 별 5개 = 폭 200px, 별 하나 40px
  it('별 왼쪽 절반은 0.5점, 오른쪽 절반은 1점', () => {
    expect(ratingFromPosition(5, 200)).toBe(0.5);
    expect(ratingFromPosition(19, 200)).toBe(0.5);
    expect(ratingFromPosition(21, 200)).toBe(1);
    expect(ratingFromPosition(170, 200)).toBe(4.5);
    expect(ratingFromPosition(199, 200)).toBe(5);
  });

  it('범위를 벗어나면 0.5~5점으로', () => {
    expect(ratingFromPosition(-10, 200)).toBe(0.5);
    expect(ratingFromPosition(0, 200)).toBe(0.5);
    expect(ratingFromPosition(260, 200)).toBe(5);
  });
});

describe('stepRating', () => {
  it('0.5점씩 오르내리고 0~5에 머문다', () => {
    expect(stepRating(4, 0.5)).toBe(4.5);
    expect(stepRating(5, 0.5)).toBe(5);
    expect(stepRating(0.5, -0.5)).toBe(0);
    expect(stepRating(0, -0.5)).toBe(0);
  });

  it('별점 없음에서 올리면 0.5점, 내리면 그대로 없음', () => {
    expect(stepRating(null, 0.5)).toBe(0.5);
    expect(stepRating(null, -0.5)).toBeNull();
  });
});

describe('starFill', () => {
  it('3.5점은 별 셋 채움, 넷째 반, 다섯째 빔', () => {
    expect([1, 2, 3, 4, 5].map((n) => starFill(3.5, n))).toEqual([
      'full',
      'full',
      'full',
      'half',
      'empty',
    ]);
  });

  it('별점 없음과 0점은 모두 빈 별', () => {
    expect(starFill(null, 1)).toBe('empty');
    expect(starFill(0, 1)).toBe('empty');
  });
});
