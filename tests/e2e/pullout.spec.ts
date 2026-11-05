import { expect, test, type Page } from '@playwright/test';
import { loginAs, type FakeDb } from './helpers.ts';

// Phase 6: 꺼내 보기와 상세 패널
const year = new Date().getFullYear();
const T = '2026-01-01T00:00:00Z';

type Row = Record<string, unknown>;

function bookRow(id: string, title: string, over: Row = {}): Row {
  return {
    id,
    user_id: 'u',
    title,
    author: '지은이',
    publisher: null,
    pub_date: null,
    isbn13: null,
    pages: 300,
    pages_estimated: false,
    category: '인문',
    category_raw: null,
    size: null,
    spine: { palette: { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' } },
    cover_path: null,
    texture_path: null,
    source: 'manual',
    created_at: T,
    updated_at: T,
    ...over,
  };
}

function readingRow(id: string, bookId: string, finished: string | null, over: Row = {}): Row {
  return {
    id,
    user_id: 'u',
    book_id: bookId,
    status: 'finished',
    started_at: null,
    finished_at: finished,
    date_approx: false,
    year: finished ? Number(finished.slice(0, 4)) : null,
    rating: 4,
    note: null,
    shelf_position: null,
    created_at: T,
    updated_at: T,
    ...over,
  };
}

function seed(): Partial<FakeDb> {
  return {
    books: [
      bookRow('a', '첫째 책', { pages: 320 }),
      bookRow('b', '둘째 책', { pages: 180, category: '과학' }),
      bookRow('c', '지난해 책'),
    ],
    readings: [
      readingRow('ra', 'a', `${year}-03-10`, { rating: 4.5, note: '마음에 남은 문장' }),
      readingRow('rb', 'b', `${year}-05-02`, { rating: 3 }),
      readingRow('rc', 'c', `${year - 1}-08-01`),
      // 첫째 책은 지난해에도 읽음(다시 읽기)
      readingRow('ra0', 'a', `${year - 1}-02-01`, { rating: 4 }),
    ],
  };
}

const panel = (page: Page) => page.getByRole('complementary', { name: '선택한 책과 올해 요약' });
const bookBtn = (page: Page, title: string) =>
  page.locator(`#y${year}`).getByRole('button', { name: new RegExp(`^${title},`) });

test('책을 누르면 꺼내지고 상세 패널이 그 책으로 바뀐다. 다른 책·Esc로 되돌린다', async ({
  page,
}) => {
  await loginAs(page, '#/', seed());
  const first = bookBtn(page, '첫째 책');
  const second = bookBtn(page, '둘째 책');
  await expect(first).toHaveAttribute('aria-pressed', 'false');

  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  const p = panel(page);
  await expect(p.getByRole('heading', { name: '첫째 책' })).toBeVisible();
  await expect(p.getByRole('img', { name: '별점 4.5점' })).toBeVisible();
  await expect(p.getByText('320쪽')).toBeVisible();
  await expect(p.getByText(`${year}.3`, { exact: true })).toBeVisible();
  await expect(p.getByText('마음에 남은 문장')).toBeVisible();
  // 다시 읽은 기록 목록
  await expect(p.getByText('독서 기록 2번')).toBeVisible();
  await expect(p.getByRole('button', { name: new RegExp(`^${year - 1}.2 완독`) })).toBeVisible();

  await second.click();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(p.getByRole('heading', { name: '둘째 책' })).toBeVisible();
  await expect(p.getByText('아직 남긴 한 줄이 없어요', { exact: false })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(second).toHaveAttribute('aria-pressed', 'false');
  await expect(p.getByText('책을 꽂고 책등을 누르면', { exact: false })).toBeVisible();
});

test('키보드만으로 책을 고르고 꺼내 본다 (←→, Enter, Space)', async ({ page }) => {
  await loginAs(page, '#/', seed());
  const first = bookBtn(page, '첫째 책');
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(' ');
  await expect(bookBtn(page, '둘째 책')).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
});

test('다시 읽은 기록을 고르면 그 기록으로 바뀐다', async ({ page }) => {
  await loginAs(page, '#/', seed());
  await bookBtn(page, '첫째 책').click();
  const p = panel(page);
  await p.getByRole('button', { name: new RegExp(`^${year - 1}.2 완독`) }).click();
  await expect(p.getByRole('button', { name: new RegExp(`^${year - 1}.2 완독`) })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(p.getByRole('img', { name: '별점 4점' })).toBeVisible();
  await expect(
    page
      .locator(`#y${year - 1}`)
      .getByRole('button', { name: /^첫째 책,/ })
      .first(),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('그해의 책으로 정하고 뺄 수 있다', async ({ page }) => {
  const db = await loginAs(page, '#/', seed());
  await bookBtn(page, '둘째 책').click();
  const p = panel(page);
  await p.getByRole('button', { name: '그해의 책으로' }).click();
  await expect(p.getByText('그해의 책 1위', { exact: true })).toBeVisible();
  await expect(page.locator(`#y${year}`).getByText('그해의 책 · 둘째 책')).toBeVisible();
  expect(db.years).toHaveLength(1);
  expect(db.years[0]).toMatchObject({ year, book_of_year: ['b'] });

  await p.getByRole('button', { name: '그해의 책에서 빼기' }).click();
  await expect(p.getByRole('button', { name: '그해의 책으로' })).toBeVisible();
  expect(db.years).toHaveLength(1);
  expect(db.years[0]?.book_of_year).toEqual([]);
});

test('상세 패널의 기록 수정으로 고치기 창을 연다', async ({ page }) => {
  await loginAs(page, '#/', seed());
  await bookBtn(page, '둘째 책').click();
  await panel(page).getByRole('button', { name: '기록 수정' }).click();
  const dialog = page.getByRole('dialog', { name: '기록 고치기' });
  await expect(dialog.getByRole('textbox', { name: '제목', exact: true })).toHaveValue('둘째 책');
  // 대화 상자를 Esc로 닫아도 꺼낸 책은 그대로
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(bookBtn(page, '둘째 책')).toHaveAttribute('aria-pressed', 'true');
});

test('올해의 나이테와 별점순·쪽수순 정렬', async ({ page }) => {
  await loginAs(page, '#/', seed());
  await expect(
    panel(page).getByRole('img', { name: new RegExp(`${year - 1}년부터 ${year}년까지`) }),
  ).toBeVisible();
  const titles = () => page.locator(`#y${year} button.book .spine .t`).allTextContents();
  await page.getByRole('button', { name: '별점순' }).click();
  await expect.poll(titles).toEqual(['첫째 책', '둘째 책']);
  await page.getByRole('button', { name: '쪽수순' }).click();
  await expect.poll(titles).toEqual(['첫째 책', '둘째 책']);
  await page.getByRole('button', { name: '완독일순' }).click();
  await expect.poll(titles).toEqual(['첫째 책', '둘째 책']);
});

test('움직임 줄이기: 애니메이션 없이 꺼낸 3D 모습과 비켜 선 옆 책을 바로 보여 준다', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loginAs(page, '#/', seed());
  const first = bookBtn(page, '첫째 책');
  await first.click();
  // 전환 없이 바로 최종 자세(3D 회전)
  const style = await first.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { transform: cs.transform, duration: cs.transitionDuration };
  });
  expect(style.transform.startsWith('matrix3d(')).toBe(true);
  expect(style.duration.split(',').every((d) => d.trim() === '0s')).toBe(true);
  // 오른쪽 책은 비켜 섬
  await expect(bookBtn(page, '둘째 책')).not.toHaveCSS('translate', 'none');
});

test('꺼내면 오른쪽 책들이 비켜 서고, 되돌리면 제자리', async ({ page }) => {
  await loginAs(page, '#/', seed());
  const second = bookBtn(page, '둘째 책');
  await expect(second).toHaveCSS('translate', 'none');
  await bookBtn(page, '첫째 책').click();
  await expect(second).not.toHaveCSS('translate', 'none');
  await page.keyboard.press('Escape');
  await expect(second).toHaveCSS('translate', 'none');
});

test('설정의 움직임 줄이기를 켜면 이 기기에 기억한다', async ({ page }) => {
  await loginAs(page, '#/settings', seed());
  const box = page.getByRole('checkbox', { name: '움직임 줄이기' });
  await box.check();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  expect(await page.evaluate(() => localStorage.getItem('bookchronicle-motion'))).toBe('reduce');
  await box.uncheck();
  await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'reduce');
});

test.describe('900~1199px', () => {
  test.use({ viewport: { width: 1000, height: 800 } });
  test('책을 누르면 상세 서랍이 열리고, Esc로 닫힌다', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', '폭을 직접 정함');
    await loginAs(page, '#/', seed());
    const p = panel(page);
    await expect(p).toBeHidden();
    await bookBtn(page, '첫째 책').click();
    await expect(p).toBeVisible();
    await expect(p.getByRole('heading', { name: '첫째 책' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(p).toBeHidden();
  });
});

test('그해의 책이 세 권 다 찼으면 더 고르지 않고 안내한다', async ({ page }) => {
  const db = await loginAs(page, '#/', {
    ...seed(),
    years: [{ user_id: 'u', year, book_of_year: ['x', 'y', 'z'], one_liner: null, updated_at: T }],
  });
  await bookBtn(page, '둘째 책').click();
  const p = panel(page);
  await p.getByRole('button', { name: '그해의 책으로' }).click();
  await expect(p.getByRole('status')).toContainText('세 권까지');
  expect(db.years[0]?.book_of_year).toEqual(['x', 'y', 'z']);
});
