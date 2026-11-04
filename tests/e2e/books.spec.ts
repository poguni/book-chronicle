import { expect, test, type Page } from '@playwright/test';
import { horizontalOverflow, loginAs, type FakeDb } from './helpers.ts';

const year = new Date().getFullYear();
const T = '2026-01-01T00:00:00Z';

/** 연도마다 n권씩 완독 기록이 있는 가짜 책장 */
function seed(perYear: Record<number, number>, pages = 300): Partial<FakeDb> {
  const books: Record<string, unknown>[] = [];
  const readings: Record<string, unknown>[] = [];
  for (const [y, n] of Object.entries(perYear)) {
    for (let i = 0; i < n; i++) {
      const id = `book-${y}-${i}`;
      books.push({
        id,
        user_id: 'u',
        title: `${y}년의 책 ${i + 1}`,
        author: `저자 ${i + 1}`,
        publisher: null,
        pub_date: null,
        isbn13: null,
        pages: pages + i * 20,
        pages_estimated: false,
        category: i % 2 ? '역사' : '소설/시/희곡',
        category_raw: null,
        size: null,
        spine: { palette: { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' } },
        cover_path: null,
        texture_path: null,
        source: 'manual',
        created_at: T,
        updated_at: T,
      });
      const month = String((i % 12) + 1).padStart(2, '0');
      readings.push({
        id: `reading-${y}-${i}`,
        user_id: 'u',
        book_id: id,
        status: 'finished',
        started_at: null,
        finished_at: `${y}-${month}-10`,
        date_approx: false,
        year: Number(y),
        rating: 4,
        note: null,
        created_at: T,
        updated_at: T,
      });
    }
  }
  return { books, readings };
}

async function openAddDialog(page: Page) {
  await page.getByRole('main').getByRole('button', { name: '책 한 권 꽂기' }).click();
  return page.getByRole('dialog', { name: '책 한 권 꽂기' });
}

test('직접 입력한 책이 올해 책장에 꽂힌다', async ({ page }) => {
  const db = await loginAs(page);
  const dialog = await openAddDialog(page);
  await dialog.getByRole('textbox', { name: '제목', exact: true }).fill('작별하지 않는다');
  await dialog.getByLabel('저자', { exact: true }).fill('한강');
  await dialog.getByLabel('쪽수', { exact: true }).fill('332');
  await dialog.getByLabel('분야', { exact: true }).fill('소설/시/희곡');
  await dialog.getByLabel('완독일', { exact: true }).fill(`${year}-03-15`);
  await dialog.getByLabel('별점', { exact: true }).selectOption('5');
  await dialog.getByRole('button', { name: `${year}년 책장에 꽂기` }).click();

  await expect(dialog).toBeHidden();
  const spine = page.getByRole('button', { name: /^작별하지 않는다, 한강, 332쪽/ });
  await expect(spine).toBeVisible();
  await expect(spine).toHaveAccessibleName(`작별하지 않는다, 한강, 332쪽, ${year}년 3월 완독`);
  await expect(page.getByText('이 해의 첫 책을 꽂아 볼까요?')).toHaveCount(0);

  expect(db.books).toHaveLength(1);
  expect(db.books[0]).toMatchObject({ title: '작별하지 않는다', pages: 332, source: 'manual' });
  expect(db.readings[0]).toMatchObject({
    book_id: db.books[0]?.id,
    status: 'finished',
    finished_at: `${year}-03-15`,
    rating: 5,
  });
  // 연도는 DB가 계산하므로 앱이 보내지 않는다
  expect(db.readings[0]).not.toHaveProperty('year', undefined);
});

test('제목 없이 꽂으려 하면 알려 주고 저장하지 않는다', async ({ page }) => {
  const db = await loginAs(page);
  const dialog = await openAddDialog(page);
  await dialog.getByRole('button', { name: '연도 미상 칸에 꽂기' }).click();
  await expect(dialog.getByText('제목을 적어 주세요')).toBeVisible();
  expect(db.books).toHaveLength(0);
});

test('완독일이 없으면 연도 미상 칸에 꽂힌다', async ({ page }) => {
  await loginAs(page);
  const dialog = await openAddDialog(page);
  await dialog.getByRole('textbox', { name: '제목', exact: true }).fill('날짜를 잊은 책');
  await dialog.getByRole('button', { name: '연도 미상 칸에 꽂기' }).click();
  await expect(page.getByRole('heading', { level: 2, name: '연도 미상' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^날짜를 잊은 책, 쪽수 모름/ })).toBeVisible();
});

test('저장에 실패하면 입력 내용을 그대로 두고 알려 준다', async ({ page }) => {
  const db = await loginAs(page);
  await page.route('**/rest/v1/books**', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"x"}' })
      : route.fallback(),
  );
  const dialog = await openAddDialog(page);
  await dialog.getByRole('textbox', { name: '제목', exact: true }).fill('저장 안 되는 책');
  await dialog.getByRole('button', { name: '연도 미상 칸에 꽂기' }).click();
  await expect(dialog.getByRole('alert')).toContainText('저장하지 못했어요');
  await expect(dialog.getByRole('textbox', { name: '제목', exact: true })).toHaveValue(
    '저장 안 되는 책',
  );
  expect(db.books).toHaveLength(0);
});

test('책등을 눌러 기록을 고치고, 지울 수 있다', async ({ page }) => {
  const db = await loginAs(page, '#/', seed({ [year]: 2 }));
  await page.getByRole('button', { name: new RegExp(`^${year}년의 책 1,`) }).click();
  const dialog = page.getByRole('dialog', { name: '기록 고치기' });
  await expect(dialog.getByRole('textbox', { name: '제목', exact: true })).toHaveValue(
    `${year}년의 책 1`,
  );
  await dialog.getByRole('textbox', { name: '제목', exact: true }).fill('고친 제목');
  await dialog.getByRole('button', { name: '고친 내용 저장' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^고친 제목,/ })).toBeVisible();
  expect(db.books.find((b) => b.id === `book-${year}-0`)?.title).toBe('고친 제목');

  await page.getByRole('button', { name: /^고친 제목,/ }).click();
  await page.getByRole('button', { name: '이 책 지우기' }).click();
  await page.getByRole('button', { name: '네, 지울게요' }).click();
  await expect(page.getByRole('button', { name: /^고친 제목,/ })).toHaveCount(0);
  expect(db.books).toHaveLength(1);
  expect(db.readings).toHaveLength(1);
});

test('다시 읽은 기록을 더하면 같은 해에 두 권으로 꽂힌다', async ({ page }) => {
  const db = await loginAs(page, '#/', seed({ [year]: 1 }));
  await page.getByRole('button', { name: new RegExp(`^${year}년의 책 1,`) }).click();
  await page.getByRole('button', { name: '다시 읽은 기록 더하기' }).click();
  const dialog = page.getByRole('dialog', { name: '다시 읽은 기록 더하기' });
  await dialog.getByLabel('완독일', { exact: true }).fill(`${year}-12-01`);
  await dialog.getByRole('button', { name: `${year}년 책장에 꽂기` }).click();
  await expect(page.getByRole('button', { name: new RegExp(`^${year}년의 책 1,`) })).toHaveCount(2);
  expect(db.books).toHaveLength(1);
  expect(db.readings).toHaveLength(2);
});

test('30권이 세 해 책장에 꽂히고, 요약·나이테가 맞는다', async ({ page }) => {
  await loginAs(page, '#/', seed({ [year]: 12, [year - 1]: 10, [year - 2]: 8 }));
  for (const [y, n] of [
    [year, 12],
    [year - 1, 10],
    [year - 2, 8],
  ] as const) {
    const shelf = page.locator(`#y${y}`);
    await expect(shelf.getByRole('heading', { level: 2 })).toHaveText(String(y));
    await expect(shelf.locator('button.book')).toHaveCount(n);
  }
  // 올해 요약: 12권, 작년보다 +2권
  await expect(page.getByText('작년보다 +2권')).toBeVisible();
  await expect(page.getByText(/세 번째 나이테를 두르는 중/)).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test('키보드 ←→로 이웃 책등으로 옮겨 간다', async ({ page }) => {
  await loginAs(page, '#/', seed({ [year]: 3 }));
  const first = page.getByRole('button', { name: new RegExp(`^${year}년의 책 1,`) });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: new RegExp(`^${year}년의 책 2,`) })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(first).toBeFocused();
});

test('한 해 책이 선반 폭을 넘으면 다음 줄로 넘어간다', async ({ page }) => {
  // 두꺼운 책 30권: 한 줄에 다 들어가지 않음
  await loginAs(page, '#/', seed({ [year]: 30 }, 900));
  const shelf = page.locator(`#y${year}`);
  await expect(shelf.locator('button.book')).toHaveCount(30);
  expect(await shelf.locator('.plank').count()).toBeGreaterThan(1);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
