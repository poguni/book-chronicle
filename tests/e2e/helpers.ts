import type { Page, Route } from '@playwright/test';

// E2E는 진짜 Supabase 없이 돌립니다. playwright.config.ts가 가짜 주소(127.0.0.1:54399)로 빌드하고,
// 여기서 그 주소로 가는 인증·DB 요청을 가짜 응답으로 바꿉니다.
export const AUTH_TOKEN = '**/auth/v1/token**';

export function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'owner@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

export async function fillLogin(page: Page) {
  await page.getByLabel('이메일').fill('owner@example.com');
  await page.getByLabel('비밀번호').fill('password-1234');
  await page.getByRole('button', { name: '로그인' }).click();
}

type Row = Record<string, unknown>;
export type FakeDb = { books: Row[]; readings: Row[]; years: Row[]; settings: Row[] };

const USER_ID = '00000000-0000-4000-8000-000000000001';

/** 주소의 id=eq.값 조건 */
function idFilter(url: URL): string | null {
  const v = url.searchParams.get('id');
  return v?.startsWith('eq.') ? v.slice(3) : null;
}

/**
 * bookchronicle 테이블을 흉내 내는 아주 작은 가짜 PostgREST.
 * GET은 전부, POST는 추가, PATCH·DELETE는 id=eq. 조건만 처리합니다. 책을 지우면 기록도 지웁니다.
 */
export async function fakeDb(page: Page, seed: Partial<FakeDb> = {}): Promise<FakeDb> {
  const db: FakeDb = { books: [], readings: [], years: [], settings: [], ...seed };
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)).toISOString();

  const handle = (table: keyof FakeDb) => async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const rows = db[table];
    const id = idFilter(url);
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (req.method() === 'GET') return json(200, rows);
    if (req.method() === 'POST') {
      const body = req.postDataJSON() as Row | Row[];
      for (const r of Array.isArray(body) ? body : [body]) {
        if (table === 'settings' && rows.some((x) => x.user_id === USER_ID)) continue;
        // years는 (user_id, year)로 upsert: 있으면 넘긴 칸만 고침
        const sameYear = table === 'years' ? rows.find((x) => x.year === r.year) : undefined;
        if (sameYear) {
          Object.assign(sameYear, r, { updated_at: now() });
          continue;
        }
        const row: Row = { user_id: USER_ID, created_at: now(), updated_at: now(), ...r };
        if (table === 'readings') {
          row.id ??= `reading-${tick}`;
          row.year =
            typeof row.finished_at === 'string' ? Number(row.finished_at.slice(0, 4)) : null;
          row.date_approx ??= false;
          row.started_at ??= null;
        }
        rows.push(row);
      }
      return route.fulfill({ status: 201, body: '' });
    }
    if (req.method() === 'PATCH') {
      const patch = req.postDataJSON() as Row;
      for (const r of rows) {
        if (r.id !== id) continue;
        Object.assign(r, patch, { updated_at: now() });
        if (table === 'readings')
          r.year = typeof r.finished_at === 'string' ? Number(r.finished_at.slice(0, 4)) : null;
      }
      return route.fulfill({ status: 204, body: '' });
    }
    if (req.method() === 'DELETE') {
      db[table] = rows.filter((r) => r.id !== id);
      if (table === 'books') db.readings = db.readings.filter((r) => r.book_id !== id);
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fallback();
  };

  for (const table of ['books', 'readings', 'years', 'settings'] as const) {
    await page.route(`**/rest/v1/${table}?**`, handle(table));
    await page.route(`**/rest/v1/${table}`, handle(table));
  }
  return db;
}

/** 로그인 요청과 DB 요청을 가짜로 받아 주고 로그인까지 마칩니다. */
export async function loginAs(page: Page, hash = '#/', seed: Partial<FakeDb> = {}) {
  await page.route(AUTH_TOKEN, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeSession()),
    }),
  );
  const db = await fakeDb(page, seed);
  await page.goto(`./${hash}`);
  await fillLogin(page);
  return db;
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** 900px 미만에서는 메뉴가 접혀 있으니 펼칩니다. */
export async function openMenuIfCollapsed(page: Page) {
  // 로그인 직후에는 앱 화면이 아직 없을 수 있으니 사이드바가 생길 때까지 기다립니다.
  await page.locator('aside.side').waitFor();
  const menu = page.getByRole('button', { name: '메뉴 열기' });
  if (await menu.isVisible()) await menu.click();
}
