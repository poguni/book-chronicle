import { expect, test, type Page } from '@playwright/test';

// E2E는 진짜 Supabase 없이 돌립니다. playwright.config.ts가 가짜 주소(127.0.0.1:54399)로 빌드하고,
// 여기서 그 주소로 가는 인증·DB 요청을 가짜 응답으로 바꿉니다.
const AUTH_TOKEN = '**/auth/v1/token**';

function fakeSession() {
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

async function fillLogin(page: Page) {
  await page.getByLabel('이메일').fill('owner@example.com');
  await page.getByLabel('비밀번호').fill('password-1234');
  await page.getByRole('button', { name: '로그인' }).click();
}

test('로그인하지 않으면 어느 주소든 로그인 화면이 보이고 주소는 그대로다', async ({ page }) => {
  await page.goto('./#/compare');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('책장으로 돌아오신 걸 환영해요');
  await expect(page).toHaveURL(/#\/compare$/);
  // 회원 가입 링크는 없음
  await expect(page.getByText('회원 가입')).toHaveCount(0);
});

test('로그인에 실패하면 다음 행동을 알려 준다', async ({ page }) => {
  await page.route(AUTH_TOKEN, (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'invalid_credentials',
        error_code: 'invalid_credentials',
        msg: 'Invalid login credentials',
      }),
    }),
  );
  await page.goto('./');
  await fillLogin(page);
  await expect(page.getByRole('alert')).toHaveText('이메일 또는 비밀번호를 확인해 주세요');
});

test('로그인하면 보던 화면으로 돌아가고, settings 행을 만든다', async ({ page }) => {
  await page.route(AUTH_TOKEN, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeSession()),
    }),
  );
  const settingsRequest = page.waitForRequest(
    (req) => req.url().includes('/rest/v1/settings') && req.method() === 'POST',
  );
  await page.route('**/rest/v1/settings**', (route) => route.fulfill({ status: 201, body: '' }));

  await page.goto('./#/recap/2026');
  await fillLogin(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('2026년 연말 회고');
  const req = await settingsRequest;
  // bookchronicle 스키마로 요청하는지 확인
  expect(req.headers()['content-profile']).toBe('bookchronicle');

  await page.getByRole('link', { name: '연도 비교' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('연도 비교');

  // 로그아웃하면 다시 로그인 화면
  await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('책장으로 돌아오신 걸 환영해요');
});

test('로그인 화면에서 가로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
