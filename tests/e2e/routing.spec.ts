import { expect, test } from '@playwright/test';
import {
  AUTH_TOKEN,
  fakeSession,
  fillLogin,
  horizontalOverflow,
  openMenuIfCollapsed,
} from './helpers.ts';

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

  await openMenuIfCollapsed(page);
  await page.getByRole('link', { name: '연도 비교' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('연도 비교');

  // 로그아웃하면 다시 로그인 화면
  await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
  await openMenuIfCollapsed(page);
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('책장으로 돌아오신 걸 환영해요');
});

test('로그인 화면에서 가로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
