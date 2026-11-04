// 테마·책등 스타일 값 다루기 (DESIGN 13장 '테마 전환')
// <html data-theme="study|paper">, <html data-spine="generated|texture">로 바꿉니다.

export type Theme = 'study' | 'paper';
/** settings.theme 값. system이면 운영체제의 밝기 설정을 따릅니다. */
export type ThemePref = 'system' | Theme;
export type SpineStyle = 'generated' | 'texture';

/** 운영체제가 어두운 화면이면 서재, 밝은 화면이면 종이 */
export function resolveTheme(pref: ThemePref, prefersDark: boolean): Theme {
  if (pref === 'system') return prefersDark ? 'study' : 'paper';
  return pref;
}

/** 저장된 값이 없거나 이상하면 기본값 system */
export function parseThemePref(value: string | null | undefined): ThemePref {
  return value === 'study' || value === 'paper' ? value : 'system';
}

/** 저장된 값이 없거나 이상하면 기본값 generated */
export function parseSpineStyle(value: string | null | undefined): SpineStyle {
  return value === 'texture' ? 'texture' : 'generated';
}

export function applyToDocument(theme: Theme, spine: SpineStyle, root = document.documentElement) {
  root.dataset.theme = theme;
  root.dataset.spine = spine;
}
