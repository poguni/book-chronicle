import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fakeBooks } from './fakeBooks.ts';
import { loginAs, openMenuIfCollapsed } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// 처음부터 끝까지 (IMPLEMENTATION_PLAN Phase 9):
// 로그인 → 책 검색·등록 → 꺼내 보기 → 연도 비교 → 회고 카드 → 백업
const y = new Date().getFullYear();

async function go(page: Page, name: string) {
  await openMenuIfCollapsed(page);
  await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
}

test('로그인부터 백업까지 한 번에', async ({ page }) => {
  const db = await loginAs(page, '#/', yearsSeed({ [y - 1]: 4 }));
  const api = await fakeBooks(page);

  // 책 검색·등록
  await page.getByRole('main').getByRole('button', { name: '책 한 권 꽂기' }).click();
  const dialog = page.getByRole('dialog', { name: '책 한 권 꽂기' });
  await dialog.getByRole('searchbox', { name: '책 찾기' }).fill('작별');
  await dialog.getByRole('button', { name: /작별하지 않는다/ }).click();
  await expect(dialog.getByLabel('쪽수', { exact: true })).toHaveValue('332');
  await dialog.getByLabel('완독일', { exact: true }).fill(`${y}-02-01`);
  await dialog.getByRole('button', { name: `${y}년 책장에 꽂기` }).click();
  await expect(dialog).toBeHidden();
  expect(api.uploads.some((u) => u.path.includes('/covers/'))).toBe(true);

  // 꺼내 보기 → 상세 패널 → 그해의 책
  const book = page.getByRole('button', { name: /^작별하지 않는다, 한강, 332쪽/ });
  await book.click();
  await expect(book).toHaveAttribute('aria-pressed', 'true');
  const panel = page.getByRole('complementary', { name: '선택한 책과 올해 요약' });
  await expect(panel.getByRole('heading', { name: '작별하지 않는다' })).toBeVisible();
  await panel.getByRole('button', { name: '그해의 책으로' }).click();
  await expect(panel.getByText('그해의 책', { exact: true })).toBeVisible();

  // 연도 비교
  await go(page, '연도 비교');
  const books = page.getByRole('main').locator('.metric').filter({ hasText: '권수' }).first();
  await expect(books).toContainText('1권');
  await expect(books).toContainText('4권');

  // 회고 카드
  await go(page, '연말 회고');
  await expect(
    page.getByRole('main').getByRole('heading', { name: `${y}년 연말 회고` }),
  ).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('button', { name: /작별하지 않는다/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  const [png] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('main').getByRole('button', { name: 'PNG로 저장' }).click(),
  ]);
  expect([...readFileSync(await png.path()).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);

  // 백업
  await go(page, '가져오기·백업');
  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSON 백업 받기' }).click(),
  ]);
  const backup = JSON.parse(readFileSync(await json.path(), 'utf-8')) as { books: unknown[] };
  expect(backup.books).toHaveLength(5);
  expect(db.settings[0]?.last_backup_at).toEqual(expect.any(String));
});
