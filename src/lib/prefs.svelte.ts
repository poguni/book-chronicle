import { applyToDocument, parseSpineStyle, parseThemePref, resolveTheme } from './theme';
import type { SpineStyle, ThemePref } from './theme';

// 보기 설정(테마·책등 스타일). 지금은 이 브라우저(localStorage)에만 기억합니다.
// 로그인 화면도 마지막 테마를 따르게 하기 위해서입니다(결정 0001-11). Supabase 저장은 Phase 9.
const THEME_KEY = 'bookchronicle-theme';
const SPINE_KEY = 'bookchronicle-spine';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없으면(사생활 보호 모드 등) 이번 방문 동안만 적용합니다.
  }
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

class Prefs {
  themePref = $state<ThemePref>(parseThemePref(read(THEME_KEY)));
  spine = $state<SpineStyle>(parseSpineStyle(read(SPINE_KEY)));
  #prefersDark = $state(darkQuery.matches);
  /** 지금 화면에 적용된 테마 */
  theme = $derived(resolveTheme(this.themePref, this.#prefersDark));

  constructor() {
    darkQuery.addEventListener('change', (e) => {
      this.#prefersDark = e.matches;
      this.#apply();
    });
    this.#apply();
  }

  setTheme(pref: ThemePref) {
    this.themePref = pref;
    write(THEME_KEY, pref);
    this.#apply();
  }

  setSpine(spine: SpineStyle) {
    this.spine = spine;
    write(SPINE_KEY, spine);
    this.#apply();
  }

  #apply() {
    applyToDocument(this.theme, this.spine);
  }
}

export const prefs = new Prefs();
