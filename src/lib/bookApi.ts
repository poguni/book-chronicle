// 도서 정보 Edge Function 부르기 (결정 0008): 시간 제한 8초, 실패하면 한 번 더.
// 브라우저에는 카카오·국립중앙도서관 키가 없습니다. 로그인 토큰과 공개 키만 보냅니다.
import type { BookInfo } from '../../supabase/functions/bookchronicle-books/handler.ts';
import { supabase } from './supabase';

export type { BookInfo };

const FUNCTION = 'bookchronicle-books';
const TIMEOUT_MS = 8000;

/** unavailable: 연결·검색 서비스 문제(다시 시도 가능) / denied: 로그인·권한 문제 */
export class BookApiError extends Error {
  constructor(
    public kind: 'unavailable' | 'denied',
    public code: string,
  ) {
    super(code);
  }
}

async function call(body: Record<string, unknown>): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new BookApiError('denied', 'login_required');

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTION}`;
  let last: BookApiError = new BookApiError('unavailable', 'unknown');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return res;
      const code = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'http';
      // 로그인·권한·요청 문제는 다시 해도 같으므로 바로 멈춥니다.
      if (res.status === 401 || res.status === 403) throw new BookApiError('denied', code);
      if (res.status === 400) throw new BookApiError('unavailable', code);
      last = new BookApiError('unavailable', code);
    } catch (e) {
      if (e instanceof BookApiError && (e.kind === 'denied' || e.code.startsWith('bad_'))) throw e;
      last = e instanceof BookApiError ? e : new BookApiError('unavailable', 'network');
    }
  }
  throw last;
}

const WARM_INTERVAL_MS = 5 * 60_000;
let lastWarm = -Infinity;

/**
 * 검색 함수 미리 깨우기 (PRD 5.9 P1): 책 찾기 칸에 입력을 시작하면 콜드 스타트를 줄이려고
 * OPTIONS 요청을 한 번 보냅니다. 함수가 로그인 확인·외부 API 호출 없이 바로 204로 답합니다.
 * 5분 안에는 다시 보내지 않고, 실패는 무시합니다.
 */
export function warmUp(now = Date.now()): boolean {
  if (now - lastWarm < WARM_INTERVAL_MS) return false;
  lastWarm = now;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTION}`;
  void fetch(url, { method: 'OPTIONS' }).catch(() => {});
  return true;
}

/** 제목·저자 검색 (최대 20건, 카카오) */
export async function searchBooks(q: string): Promise<BookInfo[]> {
  const res = await call({ action: 'search', q });
  return ((await res.json()) as { items: BookInfo[] }).items;
}

/** ISBN-13으로 한 권 (카카오 + 국립중앙도서관의 쪽수·분류) */
export async function lookupBook(isbn13: string): Promise<BookInfo | null> {
  const res = await call({ action: 'lookup', isbn: isbn13 });
  return ((await res.json()) as { item: BookInfo | null }).item;
}

/** 표지 이미지 (함수가 중계) */
export async function fetchCover(coverUrl: string): Promise<Blob> {
  const res = await call({ action: 'cover', url: coverUrl });
  return res.blob();
}
