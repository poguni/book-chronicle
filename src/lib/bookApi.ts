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
