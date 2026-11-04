import type { Page } from '@playwright/test';

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

/** 로그인 요청과 settings 요청을 가짜로 받아 주고 로그인까지 마칩니다. */
export async function loginAs(page: Page, hash = '#/') {
  await page.route(AUTH_TOKEN, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeSession()),
    }),
  );
  await page.route('**/rest/v1/settings**', (route) => route.fulfill({ status: 201, body: '' }));
  await page.goto(`./${hash}`);
  await fillLogin(page);
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** 900px 미만에서는 메뉴가 접혀 있으니 펼칩니다. */
export async function openMenuIfCollapsed(page: Page) {
  const menu = page.getByRole('button', { name: '메뉴 열기' });
  if (await menu.isVisible()) await menu.click();
}
