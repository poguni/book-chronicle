import { expect, test } from '@playwright/test';

test('해시 주소로 화면이 바뀐다', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('책장');

  await page.getByRole('link', { name: '연도 비교' }).click();
  await expect(page).toHaveURL(/#\/compare$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('연도 비교');

  await page.goto('./#/recap/2026');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('2026년 연말 회고');
});

test('가로 스크롤이 생기지 않는다', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
