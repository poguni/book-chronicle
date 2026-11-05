import type { Page } from '@playwright/test';
import { crc32, deflateSync } from 'node:zlib';

// E2E용 가짜 도서 정보 함수와 가짜 Storage. 진짜 키 없이 검색·표지 흐름을 확인합니다.

/** 위 70%는 top 색, 아래는 bottom 색인 w×h PNG */
export function twoTonePng(top: number[], bottom: number[], w = 40, h = 60): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    const [r, g, b] = y < h * 0.7 ? top : bottom;
    for (let x = 0; x < w; x++) row.set([r!, g!, b!], 1 + x * 3);
    rows.push(row);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8비트 RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const SAMPLE_BOOKS = [
  {
    isbn13: '9788954682152',
    title: '작별하지 않는다',
    author: '한강',
    publisher: '문학동네',
    pubDate: '2021-09-09',
    cover: 'https://t1.daumcdn.net/lbook/image/1',
    kdc: null,
    pages: null,
  },
  {
    isbn13: '9791169210027',
    title: '파이썬 라이브러리를 활용한 데이터 분석',
    author: '웨스 맥키니',
    publisher: '한빛미디어',
    pubDate: '2023-03-01',
    cover: 'https://t1.daumcdn.net/lbook/image/2',
    kdc: null,
    pages: null,
  },
];

export type FakeBooks = {
  calls: Record<string, unknown>[];
  /** 미리 깨우기(OPTIONS) 요청 수 */
  warmups: number;
  uploads: { path: string; jpeg: boolean }[];
};

export async function fakeBooks(
  page: Page,
  opts: { status?: number; error?: string; files?: Record<string, Buffer> } = {},
): Promise<FakeBooks> {
  const state: FakeBooks = { calls: [], warmups: 0, uploads: [] };
  const cover = twoTonePng([31, 35, 64], [233, 225, 207]);
  const stored = new Map<string, Buffer>(Object.entries(opts.files ?? {}));

  await page.route('**/functions/v1/bookchronicle-books', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      state.warmups++;
      return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    const body = req.postDataJSON() as Record<string, unknown>;
    state.calls.push(body);
    if (opts.status) {
      return route.fulfill({
        status: opts.status,
        contentType: 'application/json',
        body: JSON.stringify({ error: opts.error ?? 'aladin_error' }),
      });
    }
    if (body.action === 'search') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ items: SAMPLE_BOOKS }),
      });
    }
    if (body.action === 'lookup') {
      const found = SAMPLE_BOOKS.find((b) => b.isbn13 === body.isbn);
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          item: found
            ? { ...found, pages: 332, kdc: found.isbn13 === '9788954682152' ? '813.7' : '005.133' }
            : null,
        }),
      });
    }
    return route.fulfill({ contentType: 'image/png', body: cover });
  });

  // 검색 결과 썸네일(Daum 이미지)도 가짜로
  await page.route('https://t1.daumcdn.net/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: cover }),
  );

  await page.route('**/storage/v1/object/**', async (route) => {
    const req = route.request();
    const path = decodeURIComponent(
      new URL(req.url()).pathname.replace(
        /^.*\/storage\/v1\/object\/(authenticated\/)?bookchronicle-covers\//,
        '',
      ),
    );
    if (req.method() === 'POST' || req.method() === 'PUT') {
      const buf = req.postDataBuffer() ?? Buffer.alloc(0);
      stored.set(path, buf);
      // supabase-js는 Blob을 multipart로 올리므로 본문에 JPEG 시작 바이트(FF D8 FF)가 있는지 봅니다.
      state.uploads.push({ path, jpeg: buf.includes(Buffer.from([0xff, 0xd8, 0xff])) });
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ Key: `bookchronicle-covers/${path}`, Id: 'x' }),
      });
    }
    if (req.method() === 'GET') {
      const buf = stored.get(path);
      return buf
        ? route.fulfill({ contentType: 'image/jpeg', body: buf })
        : route.fulfill({ status: 404, body: '' });
    }
    if (req.method() === 'DELETE')
      return route.fulfill({ contentType: 'application/json', body: '[]' });
    return route.fallback();
  });

  return state;
}
