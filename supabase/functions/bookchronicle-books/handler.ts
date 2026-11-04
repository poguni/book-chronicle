// 도서 정보 프록시의 핵심 로직 (결정 0008). Deno 전용 API를 쓰지 않아 Node(Vitest)에서도 검사합니다.
// 로그인 확인·캐시·네트워크는 밖에서 넣어 줍니다(index.ts).
//
// 출처: 카카오 책 검색(제목·저자·ISBN 검색, 표지) + 국립중앙도서관 ISBN 서지정보(쪽수·KDC 분류)
// (알라딘 Open API는 2026-10-30에 종료되었습니다.)
//
// 지키는 것
// - API 키는 이 함수 안에서만 씁니다. 응답·오류·로그에 키나 키가 든 요청 주소를 넣지 않습니다.
// - 로그인한 앱 주인(BOOKCHRONICLE_OWNER_ID)만 처리합니다. 회원 가입이 열려 있어도 호출 한도를 지킵니다.
// - 표지는 정해 둔 이미지 호스트만 중계합니다.

export const ALLOWED_ORIGINS = [
  'https://poguni.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

/** 표지를 받아 올 수 있는 호스트 (카카오·Daum 이미지, 국립중앙도서관) */
export const COVER_HOSTS = [
  'search1.kakaocdn.net',
  't1.daumcdn.net',
  'seoji.nl.go.kr',
  'www.nl.go.kr',
];

const KAKAO_API = 'https://dapi.kakao.com/v3/search/book';
const NLK_API = 'https://www.nl.go.kr/seoji/SearchApi.do';
const TIMEOUT_MS = 8000;
const MAX_COVER_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 2;

export type Deps = {
  kakaoKey: string;
  /** 국립중앙도서관 인증키. 아직 없으면 빈 문자열(쪽수·분류 없이 동작) */
  nlkKey: string;
  ownerId: string;
  /** 액세스 토큰의 사용자 ID. 토큰이 틀리거나 만료되면 null */
  getUserId: (token: string) => Promise<string | null>;
  /** 24시간 안에 저장한 값. 없으면 null */
  cacheGet: (key: string) => Promise<unknown>;
  cacheSet: (key: string, value: unknown) => Promise<void>;
  fetch: typeof fetch;
};

/** 앱이 받는 책 정보 */
export type BookInfo = {
  isbn13: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  pubDate: string | null;
  cover: string | null;
  /** KDC 분류번호(예: "813.7"). 모르면 null */
  kdc: string | null;
  pages: number | null;
};

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/** 카카오 isbn: "8996991341 9788996991342" → 13자리 */
export function pickIsbn13(isbn: unknown): string | null {
  const parts = (str(isbn) ?? '').split(/\s+/);
  return parts.find((p) => /^\d{13}$/.test(p)) ?? null;
}

/** 카카오 썸네일 주소 안의 원본 이미지(fname)를 꺼냅니다. 더 큰 표지입니다. */
export function largeKakaoCover(thumbnail: string | null): string | null {
  if (!thumbnail) return null;
  try {
    const fname = new URL(thumbnail).searchParams.get('fname');
    if (fname) return fname.replace(/^http:/, 'https:');
  } catch {
    // 아래 원래 주소로
  }
  return thumbnail;
}

/** 카카오 문서 한 건 → 앱 형식 */
export function fromKakao(raw: unknown): BookInfo | null {
  const d = asRecord(raw);
  const title = str(d.title);
  if (!title) return null;
  const authors = Array.isArray(d.authors) ? d.authors.map(str).filter(Boolean) : [];
  const date = str(d.datetime)?.slice(0, 10) ?? null;
  return {
    isbn13: pickIsbn13(d.isbn),
    title,
    author: authors.length > 0 ? authors.join(', ') : null,
    publisher: str(d.publisher),
    pubDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    cover: largeKakaoCover(str(d.thumbnail)),
    kdc: null,
    pages: null,
  };
}

/** "332 p.", "xii, 332p", "332쪽" → 332 (가장 큰 숫자를 쪽수로) */
export function parsePages(v: unknown): number | null {
  const nums = (str(v) ?? '').match(/\d+/g)?.map(Number) ?? [];
  const n = Math.max(0, ...nums);
  return n > 0 && n < 100000 ? n : null;
}

/** 국립중앙도서관 응답에서 책 목록 꺼내기. 바깥 구조가 문서에 없어 docs 또는 첫 배열을 씁니다. */
export function nlkDocs(body: unknown): Record<string, unknown>[] {
  const o = asRecord(body);
  const list = Array.isArray(o.docs) ? o.docs : Object.values(o).find(Array.isArray);
  return (list ?? []).map(asRecord);
}

/** 국립중앙도서관 문서 한 건 → 쪽수·분류·표지 */
export function fromNlk(doc: Record<string, unknown>): Pick<BookInfo, 'pages' | 'kdc' | 'cover'> & {
  title: string | null;
  author: string | null;
  publisher: string | null;
} {
  const kdc = str(doc.KDC)?.match(/^\d{3}(\.\d+)?/)?.[0] ?? null;
  const cover = str(doc.TITLE_URL);
  return {
    pages: parsePages(doc.PAGE),
    kdc,
    cover: cover && /^https?:\/\//.test(cover) ? cover : null,
    title: str(doc.TITLE),
    author: str(doc.AUTHOR),
    publisher: str(doc.PUBLISHER),
  };
}

async function getJson(deps: Deps, url: URL, headers: Record<string, string>, source: string) {
  let res: Response;
  try {
    res = await deps.fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    // 주소에 키가 들어갈 수 있으므로 원래 오류는 내보내지 않습니다.
    throw new HttpError(504, `${source}_unreachable`);
  }
  if (res.status === 401 || res.status === 403) throw new HttpError(502, `${source}_key`);
  if (res.status === 429) throw new HttpError(502, `${source}_limit`);
  if (!res.ok) throw new HttpError(502, `${source}_error`);
  try {
    return (await res.json()) as unknown;
  } catch {
    throw new HttpError(502, `${source}_bad_response`);
  }
}

async function kakaoSearch(deps: Deps, query: string, target?: 'isbn'): Promise<BookInfo[]> {
  if (!deps.kakaoKey) throw new HttpError(502, 'kakao_key');
  const url = new URL(KAKAO_API);
  url.searchParams.set('query', query);
  url.searchParams.set('size', '20');
  if (target) url.searchParams.set('target', target);
  const body = asRecord(
    await getJson(deps, url, { Authorization: `KakaoAK ${deps.kakaoKey}` }, 'kakao'),
  );
  const docs = Array.isArray(body.documents) ? body.documents : [];
  return docs.map(fromKakao).filter((b): b is BookInfo => b !== null);
}

async function nlkByIsbn(deps: Deps, isbn: string) {
  if (!deps.nlkKey) return null;
  const url = new URL(NLK_API);
  url.searchParams.set('cert_key', deps.nlkKey);
  url.searchParams.set('result_style', 'json');
  url.searchParams.set('page_no', '1');
  url.searchParams.set('page_size', '10');
  url.searchParams.set('isbn', isbn);
  try {
    const docs = nlkDocs(await getJson(deps, url, {}, 'nlk'));
    const doc = docs.find((d) => str(d.EA_ISBN) === isbn) ?? docs[0];
    return doc ? fromNlk(doc) : null;
  } catch {
    // 국립중앙도서관이 안 되어도 카카오 정보만으로 돌려줍니다.
    return null;
  }
}

async function cached<T>(deps: Deps, key: string, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await deps.cacheGet(key);
    if (hit !== null && hit !== undefined) return hit as T;
  } catch {
    // 캐시는 없어도 동작합니다.
  }
  const value = await load();
  await deps.cacheSet(key, value).catch(() => {});
  return value;
}

async function search(deps: Deps, body: Record<string, unknown>) {
  const q = str(body.q);
  if (!q || q.length > 100) throw new HttpError(400, 'bad_query');
  const items = await cached(deps, `kakao:search:${q.toLowerCase()}`, () => kakaoSearch(deps, q));
  return { items };
}

async function lookup(deps: Deps, body: Record<string, unknown>) {
  const isbn = str(body.isbn);
  if (!isbn || !/^\d{13}$/.test(isbn)) throw new HttpError(400, 'bad_isbn');
  const item = await cached(deps, `books:lookup:${isbn}`, async () => {
    const [kakao, nlk] = await Promise.all([
      kakaoSearch(deps, isbn, 'isbn').then(
        (items) => items.find((b) => b.isbn13 === isbn) ?? items[0] ?? null,
      ),
      nlkByIsbn(deps, isbn),
    ]);
    if (!kakao && !nlk?.title) return null;
    const base: BookInfo = kakao ?? {
      isbn13: isbn,
      title: nlk!.title!,
      author: nlk!.author,
      publisher: nlk!.publisher,
      pubDate: null,
      cover: null,
      kdc: null,
      pages: null,
    };
    return {
      ...base,
      isbn13: base.isbn13 ?? isbn,
      pages: nlk?.pages ?? null,
      kdc: nlk?.kdc ?? null,
      cover: base.cover ?? nlk?.cover ?? null,
    };
  });
  return { item };
}

/** 표지 주소 검사: 정한 호스트만, http는 https로 */
export function safeCoverUrl(value: unknown): URL | null {
  const s = str(value);
  if (!s) return null;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!COVER_HOSTS.includes(url.hostname) || url.username || url.password || url.port) return null;
  url.protocol = 'https:';
  return url;
}

/**
 * 표지 이미지를 중계합니다. 브라우저는 다른 사이트 이미지를 캔버스로 읽을 수 없어서(CORS)
 * 이 함수로 받아 색을 뽑고, 줄여서 자기 Storage 폴더에 올립니다(결정 0007).
 * 넘겨 보내기(redirect)는 허용한 호스트 안에서만 두 번까지 따라갑니다.
 */
async function cover(deps: Deps, body: Record<string, unknown>, origin: string | null) {
  let url = safeCoverUrl(body.url);
  if (!url) throw new HttpError(400, 'bad_cover_url');
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      res = await deps.fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new HttpError(504, 'cover_unreachable');
    }
    if (res.status < 300 || res.status >= 400) break;
    const next = safeCoverUrl(new URL(res.headers.get('location') ?? '', url).toString());
    if (!next || hop === MAX_REDIRECTS) throw new HttpError(502, 'cover_redirect');
    url = next;
  }
  const type = res?.headers.get('content-type') ?? '';
  if (!res || !res.ok || !/^image\/(jpeg|png|gif|webp)/.test(type)) {
    throw new HttpError(502, 'cover_error');
  }
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_COVER_BYTES) throw new HttpError(502, 'cover_too_large');
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_COVER_BYTES) throw new HttpError(502, 'cover_too_large');
  return new Response(bytes, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': type.split(';')[0] ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json(403, { error: 'origin' }, null);
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'method' }, origin);

  try {
    const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
    const userId = token ? await deps.getUserId(token) : null;
    if (!userId) throw new HttpError(401, 'login_required');
    if (!deps.ownerId || userId !== deps.ownerId) throw new HttpError(403, 'owner_only');

    let body: Record<string, unknown>;
    try {
      body = asRecord(await req.json());
    } catch {
      throw new HttpError(400, 'bad_json');
    }
    if (body.action === 'search') return json(200, await search(deps, body), origin);
    if (body.action === 'lookup') return json(200, await lookup(deps, body), origin);
    if (body.action === 'cover') return await cover(deps, body, origin);
    throw new HttpError(400, 'bad_action');
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.code }, origin);
    return json(500, { error: 'internal' }, origin);
  }
}
