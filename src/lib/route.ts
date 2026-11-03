// 해시 주소(#/, #/compare, #/recap/2026)를 화면 정보로 바꾸는 순수 함수.
// GitHub Pages는 서버 주소 처리가 없어서 앱 안 주소는 해시 방식을 씁니다(PRD 5.1).

export type Route =
  | { name: 'shelves' | 'compare' | 'list' | 'import' | 'settings' | 'login' }
  | { name: 'recap'; year: number | null };

const SIMPLE_ROUTES = {
  '': 'shelves',
  compare: 'compare',
  list: 'list',
  import: 'import',
  settings: 'settings',
  login: 'login',
} as const;

const FALLBACK: Route = { name: 'shelves' };

/** 알 수 없는 주소는 책장 홈으로 보냅니다. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const [head = '', ...rest] = path.split('/');

  if (head === 'recap') {
    if (rest.length === 0) return { name: 'recap', year: null };
    const [yearText] = rest;
    if (rest.length === 1 && yearText !== undefined && /^\d{4}$/.test(yearText)) {
      return { name: 'recap', year: Number(yearText) };
    }
    return FALLBACK;
  }

  if (rest.length === 0 && Object.hasOwn(SIMPLE_ROUTES, head)) {
    return { name: SIMPLE_ROUTES[head as keyof typeof SIMPLE_ROUTES] };
  }
  return FALLBACK;
}
