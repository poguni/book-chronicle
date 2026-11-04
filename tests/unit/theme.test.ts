import { describe, expect, it } from 'vitest';
import { parseSpineStyle, parseThemePref, resolveTheme } from '../../src/lib/theme';

describe('resolveTheme', () => {
  it('system이면 운영체제 밝기를 따른다', () => {
    expect(resolveTheme('system', true)).toBe('study');
    expect(resolveTheme('system', false)).toBe('paper');
  });

  it('고정한 테마는 운영체제와 상관없다', () => {
    expect(resolveTheme('study', false)).toBe('study');
    expect(resolveTheme('paper', true)).toBe('paper');
  });
});

describe('parseThemePref / parseSpineStyle', () => {
  it('알맞은 값은 그대로 읽는다', () => {
    expect(parseThemePref('study')).toBe('study');
    expect(parseThemePref('paper')).toBe('paper');
    expect(parseThemePref('system')).toBe('system');
    expect(parseSpineStyle('texture')).toBe('texture');
    expect(parseSpineStyle('generated')).toBe('generated');
  });

  it('없거나 이상한 값은 기본값', () => {
    expect(parseThemePref(null)).toBe('system');
    expect(parseThemePref('dark')).toBe('system');
    expect(parseSpineStyle(undefined)).toBe('generated');
    expect(parseSpineStyle('cover')).toBe('generated');
  });
});
