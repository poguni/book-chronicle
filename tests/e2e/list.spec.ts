import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, loginAs, openMenuIfCollapsed } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// 전체 목록 (PRD F8, 결정 0020)
const year = new Date().getFullYear();
const T = '2025-01-01T00:00:00Z';

/** 올해 3권 + 작년 2권, 작년 책 1을 올해 다시 읽음, 읽는 중 1권 */
function seed() {
  const s = yearsSeed({ [year]: 3, [year - 1]: 2 });
  const books = [
    ...s.books,
    {
      ...s.books[0],
      id: 'b-reading',
      title: '읽고 있는 책',
      author: '김작가',
      pages: null,
      category: '에세이',
    },
  ];
  const readings = [
    ...s.readings,
    {
      // yearsSeed는 작년 책이 앞: readings[0]이 작년 책 1
      ...s.readings[0],
      id: 'r-again',
      finished_at: `${year}-12-20`,
      year,
      rating: 5,
      created_at: T,
    },
    {
      ...s.readings[2],
      id: 'r-reading',
      book_id: 'b-reading',
      status: 'reading',
      finished_at: null,
      year: null,
      rating: null,
    },
  ];
  return { books, readings };
}

async function openList(page: Page, seedData = seed()) {
  const db = await loginAs(page, '#/list', seedData);
  await expect(page.getByRole('heading', { level: 1, name: '전체 목록' })).toBeVisible();
  return db;
}

const rows = (page: Page) => page.getByRole('list', { name: '책 목록' }).getByRole('button');

test('모든 기록을 최근에 읽은 순으로 보여 주고, 찾기·거르기·초기화가 된다', async ({ page }) => {
  await openList(page);
  await expect(rows(page)).toHaveCount(7);
  // 최근 완독(작년 책 1을 올해 12월에 다시 읽음)이 맨 위, 완독일 없는 읽는 중은 맨 끝
  await expect(rows(page).first()).toHaveAccessibleName(new RegExp(`^${year - 1}년 책 1,.*2회째`));
  await expect(rows(page).last()).toHaveAccessibleName(/^읽고 있는 책,.*읽는 중/);
  await expect(page.getByText(/^7권 · [\d,]+쪽 · 평균 별점/)).toBeVisible();

  await page.getByRole('searchbox', { name: '내 책장에서 찾기' }).fill('김 작가');
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('searchbox', { name: '내 책장에서 찾기' }).fill('');

  await page.getByRole('combobox', { name: '연도' }).selectOption(String(year - 1));
  await expect(rows(page)).toHaveCount(2);
  await page.getByRole('combobox', { name: '별점' }).selectOption('gte4');
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('combobox', { name: '별점' }).selectOption('none');
  await expect(page.getByText('조건에 맞는 책이 없어요.')).toBeVisible();

  await page.getByRole('main').getByRole('button', { name: '조건 지우기' }).first().click();
  await expect(rows(page)).toHaveCount(7);
  await expect(page.getByRole('button', { name: '조건 지우기' })).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test('다시 읽은 책만 보면 같은 책 기록이 읽은 순서로 붙어 나온다', async ({ page }) => {
  await openList(page);
  await page.getByRole('button', { name: '다시 읽은 책만' }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(0)).toHaveAccessibleName(/1회째/);
  await expect(rows(page).nth(1)).toHaveAccessibleName(/2회째/);
});

test('줄을 누르면 상세 패널이 그 책으로 바뀌고, 고친 내용이 목록에 바로 보인다', async ({
  page,
}) => {
  const db = await openList(page);
  const row = rows(page).filter({ hasText: `${year}년 책 2` });
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  const detail = page.getByRole('complementary', { name: '선택한 책과 올해 요약' });
  await expect(detail.getByRole('heading', { name: `${year}년 책 2` })).toBeVisible();

  await detail.getByRole('button', { name: '기록 고치기' }).click();
  const dialog = page.getByRole('dialog', { name: '기록 고치기' });
  await dialog.getByRole('textbox', { name: '제목', exact: true }).fill('목록에서 고친 제목');
  await dialog.getByRole('button', { name: '고친 내용 저장' }).click();
  await expect(dialog).toBeHidden();
  await expect(rows(page).filter({ hasText: '목록에서 고친 제목' })).toHaveCount(1);
  expect(db.books.find((b) => b.id === `b-${year}-1`)?.title).toBe('목록에서 고친 제목');
});

test('키보드 ↑↓로 줄을 옮겨 다니고 Enter로 고른다', async ({ page }) => {
  await openList(page);
  await rows(page).first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(rows(page).nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(rows(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rows(page).first()).toHaveAttribute('aria-pressed', 'true');
});

test('다른 메뉴에 다녀와도 검색어와 거르기가 그대로 있다', async ({ page }) => {
  await openList(page);
  await page.getByRole('searchbox', { name: '내 책장에서 찾기' }).fill('읽고');
  await page.getByRole('combobox', { name: '정렬' }).selectOption('title');
  await openMenuIfCollapsed(page);
  await page.locator('aside.side').getByRole('link', { name: '연도 비교' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('연도 비교');
  await openMenuIfCollapsed(page);
  await page.locator('aside.side').getByRole('link', { name: '전체 목록' }).click();
  await expect(page.getByRole('searchbox', { name: '내 책장에서 찾기' })).toHaveValue('읽고');
  await expect(page.getByRole('combobox', { name: '정렬' })).toHaveValue('title');
  await expect(rows(page)).toHaveCount(1);
});

test('책이 없으면 첫 책을 꽂자고 안내한다', async ({ page }) => {
  await openList(page, { books: [], readings: [] });
  await expect(page.getByText('아직 꽂은 책이 없어요. 첫 책을 꽂아 볼까요?')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: '책 한 권 꽂기' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
