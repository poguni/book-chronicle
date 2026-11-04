import { expect, test, type Page } from '@playwright/test';
import { fakeBooks } from './fakeBooks.ts';
import { loginAs } from './helpers.ts';

const year = new Date().getFullYear();
const OWNER = '00000000-0000-4000-8000-000000000001';

async function openAdd(page: Page) {
  await page.getByRole('main').getByRole('button', { name: '책 한 권 꽂기' }).click();
  return page.getByRole('dialog', { name: '책 한 권 꽂기' });
}

test('제목으로 찾아 고르면 칸이 채워지고, 표지 색으로 책등을 칠하고, 표지를 저장한다', async ({
  page,
}) => {
  const api = await fakeBooks(page);
  const db = await loginAs(page);
  const dialog = await openAdd(page);

  const search = dialog.getByRole('searchbox', { name: '책 찾기' });
  await expect(search).toBeFocused();
  await search.fill('작별');
  await expect(dialog.getByText('2권을 찾았어요')).toBeVisible();
  await expect(
    dialog.getByText('도서 정보: 카카오 책 검색 · 국립중앙도서관 ISBN 서지정보'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: /작별하지 않는다/ }).click();

  // 쪽수·분류는 ISBN 조회(국립중앙도서관)로 보충
  const title = dialog.getByRole('textbox', { name: '제목', exact: true });
  await expect(title).toHaveValue('작별하지 않는다');
  await expect(dialog.getByLabel('저자', { exact: true })).toHaveValue('한강');
  await expect(dialog.getByLabel('출판사', { exact: true })).toHaveValue('문학동네');
  await expect(dialog.getByLabel('쪽수', { exact: true })).toHaveValue('332');
  // 24개 분야에 없는 소설(KDC 813)은 직접 입력에 '문학'으로
  await expect(dialog.getByRole('textbox', { name: '분야 직접 입력' })).toHaveValue('문학');
  // 표지(남색 70% + 크림색)에서 뽑은 색
  await expect(dialog.getByRole('img', { name: '작별하지 않는다 표지' })).toBeVisible();
  await expect(
    dialog.getByRole('group', { name: '표지에서 뽑은 색' }).getByRole('button'),
  ).not.toHaveCount(0);
  await expect(dialog.getByRole('radio', { name: '바탕색' }).locator('.swatch')).toHaveCSS(
    'background-color',
    'rgb(31, 35, 64)',
  );

  await dialog.getByLabel('완독일', { exact: true }).fill(`${year}-02-01`);
  await dialog.getByRole('button', { name: `${year}년 책장에 꽂기` }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^작별하지 않는다, 한강, 332쪽/ })).toBeVisible();

  const book = db.books[0]!;
  expect(book).toMatchObject({
    title: '작별하지 않는다',
    isbn13: '9788954682152',
    source: 'kakao',
    pages: 332,
    pub_date: '2021-09-09',
    category: '문학',
    category_raw: 'KDC 813.7',
    size: null,
    cover_path: `${OWNER}/covers/${String(book.id)}.jpg`,
  });
  expect((book.spine as { palette: { base: string } }).palette.base).toBe('#1F2340');
  expect(api.uploads).toEqual([{ path: `${OWNER}/covers/${String(book.id)}.jpg`, jpeg: true }]);
  expect(api.calls.map((c) => c.action)).toEqual(['search', 'lookup', 'cover']);
});

test('분야는 제목 낱말과 KDC로 24개 중에서 고른다', async ({ page }) => {
  await fakeBooks(page);
  await loginAs(page);
  const dialog = await openAdd(page);
  await dialog.getByRole('searchbox', { name: '책 찾기' }).fill('파이썬');
  await dialog.getByRole('button', { name: /데이터 분석/ }).click();
  await expect(dialog.getByLabel('분야', { exact: true })).toHaveValue('파이썬');
  await expect(dialog.getByLabel('저자', { exact: true })).toHaveValue('웨스 맥키니');
});

test('ISBN을 넣으면 바로 상품 조회한다 (ISBN-10도)', async ({ page }) => {
  const api = await fakeBooks(page);
  await loginAs(page);
  const dialog = await openAdd(page);
  await dialog.getByRole('searchbox', { name: '책 찾기' }).fill('89-546-8215-4');
  await expect(dialog.getByRole('button', { name: /작별하지 않는다/ })).toBeVisible();
  expect(api.calls[0]).toEqual({ action: 'lookup', isbn: '9788954682152' });
});

test('이미 책장에 있는 책을 고르면 다시 읽은 기록으로 바뀐다', async ({ page }) => {
  await fakeBooks(page);
  const T = '2026-01-01T00:00:00Z';
  await loginAs(page, '#/', {
    books: [
      {
        id: 'b1',
        user_id: 'u',
        title: '작별하지 않는다',
        author: '한강',
        publisher: null,
        pub_date: null,
        isbn13: '9788954682152',
        pages: 332,
        pages_estimated: false,
        category: null,
        category_raw: null,
        size: null,
        spine: {},
        cover_path: null,
        texture_path: null,
        source: 'aladin',
        created_at: T,
        updated_at: T,
      },
    ],
    readings: [
      {
        id: 'r1',
        user_id: 'u',
        book_id: 'b1',
        status: 'finished',
        started_at: null,
        finished_at: `${year - 1}-03-01`,
        date_approx: false,
        year: year - 1,
        rating: null,
        note: null,
        created_at: T,
        updated_at: T,
      },
    ],
  });
  const dialog = await openAdd(page);
  await dialog.getByRole('searchbox', { name: '책 찾기' }).fill('작별');
  await dialog.getByRole('button', { name: /작별하지 않는다/ }).click();
  const reread = page.getByRole('dialog', { name: '다시 읽은 기록 더하기' });
  await expect(reread.getByText('이미 책장에 있는 책이에요')).toBeVisible();
});

test('검색이 안 되면 다음 행동을 알려 주고, 직접 입력은 그대로 된다', async ({ page }) => {
  await fakeBooks(page, { status: 502 });
  const db = await loginAs(page);
  const dialog = await openAdd(page);
  await dialog.getByRole('searchbox', { name: '책 찾기' }).fill('작별');
  await expect(dialog.getByText('검색이 잠시 안 돼요. 직접 입력할 수 있어요.')).toBeVisible();
  await dialog.getByRole('textbox', { name: '제목', exact: true }).fill('직접 넣은 책');
  await dialog.getByRole('button', { name: '연도 미상 칸에 꽂기' }).click();
  await expect(dialog).toBeHidden();
  expect(db.books[0]).toMatchObject({ title: '직접 넣은 책', source: 'manual', cover_path: null });
});

test('앱 주인이 아니면 검색을 쓸 수 없다고 알려 준다', async ({ page }) => {
  const api = await fakeBooks(page, { status: 403, error: 'owner_only' });
  await loginAs(page);
  const dialog = await openAdd(page);
  await dialog.getByRole('searchbox', { name: '책 찾기' }).fill('작별');
  await expect(dialog.getByText('이 계정으로는 도서 검색을 쓸 수 없어요')).toBeVisible();
  // 권한 문제는 다시 시도하지 않는다
  expect(api.calls).toHaveLength(1);
});
