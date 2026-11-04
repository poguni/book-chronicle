import { describe, expect, it, vi } from 'vitest';
import {
  fromKakao,
  handle,
  largeKakaoCover,
  nlkDocs,
  parsePages,
  pickIsbn13,
  safeCoverUrl,
  type Deps,
} from '../../supabase/functions/bookchronicle-books/handler.ts';

const OWNER = '00000000-0000-4000-8000-000000000001';
const KAKAO = 'kakao-secret-key';
const NLK = 'nlk-secret-key';

const kakaoDoc = {
  title: '작별하지 않는다',
  authors: ['한강'],
  translators: [],
  publisher: '문학동네',
  datetime: '2021-09-09T00:00:00.000+09:00',
  isbn: '8954682154 9788954682152',
  thumbnail:
    'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F5815034%3Ftimestamp%3D20231111',
};

const nlkDoc = { TITLE: '작별하지 않는다', EA_ISBN: '9788954682152', PAGE: '332 p.', KDC: '813.7' };

function deps(over: Partial<Deps> = {}): Deps & { calls: { url: string; headers: unknown }[] } {
  const calls: { url: string; headers: unknown }[] = [];
  const cache = new Map<string, unknown>();
  return {
    calls,
    kakaoKey: KAKAO,
    nlkKey: NLK,
    ownerId: OWNER,
    getUserId: async (t) => (t === 'owner-token' ? OWNER : t === 'other-token' ? 'someone' : null),
    cacheGet: async (k) => cache.get(k) ?? null,
    cacheSet: async (k, v) => void cache.set(k, v),
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, headers: init?.headers });
      if (url.includes('daumcdn.net')) {
        return new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          headers: { 'content-type': 'image/jpeg' },
        });
      }
      if (url.includes('nl.go.kr')) {
        return new Response(JSON.stringify({ PAGE_NO: '1', TOTAL_COUNT: '1', docs: [nlkDoc] }));
      }
      return new Response(JSON.stringify({ meta: { total_count: 1 }, documents: [kakaoDoc] }));
    }) as unknown as typeof fetch,
    ...over,
  };
}

function post(
  body: unknown,
  token: string | null = 'owner-token',
  origin = 'https://poguni.github.io',
) {
  const headers: Record<string, string> = { 'content-type': 'application/json', origin };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://x.supabase.co/functions/v1/bookchronicle-books', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('로그인과 앱 주인 확인', () => {
  it('토큰이 없거나 틀리면 401', async () => {
    expect((await handle(post({ action: 'search', q: 'a' }, null), deps())).status).toBe(401);
    expect((await handle(post({ action: 'search', q: 'a' }, 'bad'), deps())).status).toBe(401);
  });

  it('다른 가입자는 403이고 바깥 API를 부르지 않는다', async () => {
    const d = deps();
    const res = await handle(post({ action: 'search', q: '한강' }, 'other-token'), d);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'owner_only' });
    expect(d.calls).toHaveLength(0);
  });

  it('앱 주인 ID가 설정되지 않았으면 아무도 못 쓴다', async () => {
    const res = await handle(post({ action: 'search', q: '한강' }), deps({ ownerId: '' }));
    expect(res.status).toBe(403);
  });
});

describe('CORS', () => {
  it('허용한 주소에만 Allow-Origin을 붙이고, 다른 주소는 거절한다', async () => {
    const ok = await handle(post({ action: 'search', q: '한강' }), deps());
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://poguni.github.io');
    const bad = await handle(
      post({ action: 'search', q: '한강' }, 'owner-token', 'https://evil.example'),
      deps(),
    );
    expect(bad.status).toBe(403);
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('OPTIONS 사전 요청에 답한다', async () => {
    const res = await handle(
      new Request('https://x/f', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:5173' },
      }),
      deps(),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});

describe('search (카카오)', () => {
  it('카카오 키를 헤더로 보내고, 결과를 앱 형식으로, 24시간 캐시', async () => {
    const d = deps();
    const res = await handle(post({ action: 'search', q: '작별' }), d);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items[0]).toEqual({
      isbn13: '9788954682152',
      title: '작별하지 않는다',
      author: '한강',
      publisher: '문학동네',
      pubDate: '2021-09-09',
      cover: 'https://t1.daumcdn.net/lbook/image/5815034?timestamp=20231111',
      kdc: null,
      pages: null,
    });
    const url = new URL(d.calls[0]!.url);
    expect(url.origin + url.pathname).toBe('https://dapi.kakao.com/v3/search/book');
    expect(url.searchParams.get('query')).toBe('작별');
    expect(url.searchParams.get('size')).toBe('20');
    expect(url.toString()).not.toContain(KAKAO);
    expect(d.calls[0]!.headers).toEqual({ Authorization: `KakaoAK ${KAKAO}` });

    await handle(post({ action: 'search', q: '작별' }), d);
    expect(d.calls).toHaveLength(1);
  });

  it('카카오 키가 틀리거나 한도를 넘으면 짧은 코드로, 키는 응답에 없다', async () => {
    for (const [status, code] of [
      [401, 'kakao_key'],
      [429, 'kakao_limit'],
    ] as const) {
      const d = deps({
        fetch: (async () => new Response('{}', { status })) as unknown as typeof fetch,
      });
      const res = await handle(post({ action: 'search', q: '한강' }), d);
      expect(res.status).toBe(502);
      const text = await res.text();
      expect(text).toContain(code);
      expect(text).not.toContain(KAKAO);
    }
  });

  it('네트워크 오류 메시지를 내보내지 않는다', async () => {
    const d = deps({
      fetch: (async (u: RequestInfo | URL) => {
        throw new Error(`failed ${String(u)} ${KAKAO}`);
      }) as unknown as typeof fetch,
    });
    const res = await handle(post({ action: 'search', q: '한강' }), d);
    expect(res.status).toBe(504);
    expect(await res.text()).not.toContain(KAKAO);
  });

  it('검색어가 비었거나 너무 길면 400', async () => {
    expect((await handle(post({ action: 'search', q: ' ' }), deps())).status).toBe(400);
    expect((await handle(post({ action: 'search', q: 'x'.repeat(101) }), deps())).status).toBe(400);
    expect((await handle(post({ action: 'nope' }), deps())).status).toBe(400);
  });
});

describe('lookup (카카오 + 국립중앙도서관)', () => {
  it('ISBN 13자리만, 카카오 정보에 쪽수·KDC를 더한다', async () => {
    expect((await handle(post({ action: 'lookup', isbn: '12345' }), deps())).status).toBe(400);
    const d = deps();
    const res = await handle(post({ action: 'lookup', isbn: '9788954682152' }), d);
    const text = await res.text();
    expect(text).not.toContain(NLK);
    const body = JSON.parse(text) as { item: Record<string, unknown> };
    expect(body.item).toMatchObject({
      isbn13: '9788954682152',
      title: '작별하지 않는다',
      pages: 332,
      kdc: '813.7',
    });
    const kakao = new URL(d.calls.find((c) => c.url.includes('kakao'))!.url);
    expect(kakao.searchParams.get('target')).toBe('isbn');
    const nlk = new URL(d.calls.find((c) => c.url.includes('nl.go.kr'))!.url);
    expect(nlk.origin + nlk.pathname).toBe('https://www.nl.go.kr/seoji/SearchApi.do');
    expect(nlk.searchParams.get('isbn')).toBe('9788954682152');
    expect(nlk.searchParams.get('result_style')).toBe('json');
  });

  it('국립중앙도서관 키가 없거나 실패해도 카카오 정보는 돌려준다', async () => {
    const res = await handle(
      post({ action: 'lookup', isbn: '9788954682152' }),
      deps({ nlkKey: '' }),
    );
    const body = (await res.json()) as { item: Record<string, unknown> };
    expect(body.item).toMatchObject({ title: '작별하지 않는다', pages: null, kdc: null });
  });
});

describe('cover', () => {
  it('정한 호스트만 https로 받아 그대로 돌려준다', async () => {
    const d = deps();
    const res = await handle(
      post({ action: 'cover', url: 'http://t1.daumcdn.net/lbook/image/5815034' }),
      d,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
    expect(d.calls[0]!.url).toMatch(/^https:\/\/t1\.daumcdn\.net\//);
  });

  it('허용한 호스트로의 넘겨 보내기만 따라간다', async () => {
    const hops = (to: string) =>
      (async (u: RequestInfo | URL) =>
        String(u).includes('search1')
          ? new Response(null, { status: 302, headers: { location: to } })
          : new Response(new Uint8Array([1]), {
              headers: { 'content-type': 'image/png' },
            })) as unknown as typeof fetch;
    const url = 'https://search1.kakaocdn.net/thumb/x.jpg';
    const ok = await handle(
      post({ action: 'cover', url }),
      deps({ fetch: hops('https://t1.daumcdn.net/a') }),
    );
    expect(ok.status).toBe(200);
    const bad = await handle(
      post({ action: 'cover', url }),
      deps({ fetch: hops('https://evil.example/a') }),
    );
    expect(bad.status).toBe(502);
  });

  it('다른 호스트·이상한 주소는 거절한다', () => {
    expect(safeCoverUrl('https://evil.example/a.jpg')).toBeNull();
    expect(safeCoverUrl('https://t1.daumcdn.net.evil.example/a.jpg')).toBeNull();
    expect(safeCoverUrl('https://user@t1.daumcdn.net/a.jpg')).toBeNull();
    expect(safeCoverUrl('file:///etc/passwd')).toBeNull();
    expect(safeCoverUrl('http://169.254.169.254/latest')).toBeNull();
    expect(safeCoverUrl('https://image.aladin.co.kr/a.jpg')).toBeNull();
  });

  it('이미지가 아니면 502', async () => {
    const d = deps({
      fetch: (async () =>
        new Response('<html>', {
          headers: { 'content-type': 'text/html' },
        })) as unknown as typeof fetch,
    });
    const res = await handle(post({ action: 'cover', url: 'https://t1.daumcdn.net/a' }), d);
    expect(res.status).toBe(502);
  });
});

describe('값 정리', () => {
  it('카카오 ISBN 칸에서 13자리를 고른다', () => {
    expect(pickIsbn13('8954682154 9788954682152')).toBe('9788954682152');
    expect(pickIsbn13(' 9788954682152')).toBe('9788954682152');
    expect(pickIsbn13('8954682154')).toBeNull();
    expect(pickIsbn13('')).toBeNull();
  });

  it('카카오 썸네일에서 원본 표지 주소를 꺼낸다', () => {
    expect(largeKakaoCover(kakaoDoc.thumbnail)).toBe(
      'https://t1.daumcdn.net/lbook/image/5815034?timestamp=20231111',
    );
    expect(largeKakaoCover('https://search1.kakaocdn.net/thumb/x.jpg')).toBe(
      'https://search1.kakaocdn.net/thumb/x.jpg',
    );
    expect(largeKakaoCover(null)).toBeNull();
  });

  it('쪽수 글자에서 숫자를 읽는다', () => {
    expect(parsePages('332 p.')).toBe(332);
    expect(parsePages('xii, 332p')).toBe(332);
    expect(parsePages('240쪽')).toBe(240);
    expect(parsePages('')).toBeNull();
    expect(parsePages(undefined)).toBeNull();
  });

  it('국립중앙도서관 응답의 목록을 찾는다(docs 또는 첫 배열)', () => {
    expect(nlkDocs({ docs: [{ TITLE: 'a' }] })).toEqual([{ TITLE: 'a' }]);
    expect(nlkDocs({ TOTAL_COUNT: '1', result: [{ TITLE: 'b' }] })).toEqual([{ TITLE: 'b' }]);
    expect(nlkDocs({ TOTAL_COUNT: '0' })).toEqual([]);
  });

  it('빈 카카오 문서는 null', () => {
    expect(fromKakao({ title: '' })).toBeNull();
    expect(fromKakao({ title: '책', authors: [], datetime: '' })).toMatchObject({
      author: null,
      pubDate: null,
      isbn13: null,
    });
  });
});
