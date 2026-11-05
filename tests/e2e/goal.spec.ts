import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// Phase 10 묶음 B: 목표 권수 (결정 0016)
const y = new Date().getFullYear();
const main = (page: Page) => page.getByRole('main');

test('책장 위에서 올해 목표를 정하면 진행률이 보이고, 계정에 저장된다', async ({ page }) => {
  const db = await loginAs(page, '#/', yearsSeed({ [y]: 4, [y - 1]: 3 }));
  await main(page).getByRole('button', { name: '목표 정하기' }).click();
  const input = main(page).getByRole('spinbutton', { name: `${y}년 목표 권수` });
  await input.fill('0');
  await main(page).getByRole('button', { name: '저장', exact: true }).click();
  await expect(main(page).getByRole('alert')).toContainText('1에서 1,000 사이');

  await input.fill('10');
  await main(page).getByRole('button', { name: '저장', exact: true }).click();
  await expect(main(page).getByText('4 / 10권')).toBeVisible();
  await expect(main(page).getByText('6권 남았어요')).toBeVisible();
  await expect(main(page).getByRole('progressbar', { name: `${y}년 목표 진행률` })).toHaveAttribute(
    'aria-valuenow',
    '4',
  );
  expect(db.years.find((r) => r.year === y)).toMatchObject({ reading_goal: 10 });
  // 나이테에도 진행률
  await expect(page.getByRole('img', { name: /목표 10권 중 4권/ })).toBeAttached();
});

test('목표를 이루면 알려 주고, 연도 비교 권수 카드에 목표가 보인다', async ({ page }) => {
  const seed = {
    ...yearsSeed({ [y]: 5, [y - 1]: 3 }),
    years: [
      { user_id: 'u', year: y, book_of_year: [], one_liner: null, reading_goal: 5, updated_at: '' },
      {
        user_id: 'u',
        year: y - 1,
        book_of_year: [],
        one_liner: null,
        reading_goal: 6,
        updated_at: '',
      },
    ],
  };
  await loginAs(page, '#/', seed);
  await expect(main(page).getByText('목표를 이뤘어요!')).toBeVisible();

  await page.goto(`./#/compare`);
  const books = main(page).locator('.metric').filter({ hasText: '권수' }).first();
  await expect(books).toContainText('목표 5권 달성');
  await expect(books).toContainText('목표 6권');
});

test('설정에서 목표를 고치고 지운다', async ({ page }) => {
  const seed = {
    ...yearsSeed({ [y]: 2 }),
    years: [
      {
        user_id: 'u',
        year: y,
        book_of_year: [],
        one_liner: '좋은 해',
        reading_goal: 12,
        updated_at: '',
      },
    ],
  };
  const db = await loginAs(page, '#/settings', seed);
  await expect(main(page).getByText('2 / 12권')).toBeVisible();
  await main(page).getByRole('button', { name: '목표 고치기' }).click();
  await main(page)
    .getByRole('spinbutton', { name: `${y}년 목표 권수` })
    .fill('20');
  await main(page).getByRole('button', { name: '저장', exact: true }).click();
  await expect(main(page).getByText('2 / 20권')).toBeVisible();
  await main(page).getByRole('button', { name: '목표 고치기' }).click();
  await main(page).getByRole('button', { name: '목표 지우기' }).click();
  await expect(main(page).getByRole('button', { name: '목표 정하기' })).toBeVisible();
  // 한 줄 회고는 그대로
  expect(db.years[0]).toMatchObject({ reading_goal: null, one_liner: '좋은 해' });
});

// ── 다른 해 책장으로 끌어 옮기기 (결정 0016)
async function dragTo(page: Page, from: string, toYear: number) {
  const book = page.getByRole('button', { name: new RegExp(`^${from},`) });
  await book.scrollIntoViewIfNeeded();
  const a = (await book.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 3 });
  const target = page.locator(`#y${toYear} .rows`);
  // 화면 밖이면 아래·위 끝으로 끌어 저절로 스크롤되게 함
  const vh = page.viewportSize()!.height;
  const inView = async () => {
    const r = (await target.boundingBox())!;
    return r.y >= 0 && r.y + Math.min(r.height, 80) <= vh;
  };
  if (!(await inView())) {
    const below = (await target.boundingBox())!.y > vh;
    await page.mouse.move(a.x + a.width / 2, below ? vh - 10 : 10, { steps: 5 });
    await expect.poll(inView, { timeout: 8000 }).toBe(true);
  }
  const b = (await target.boundingBox())!;
  // 책장 안이면서 화면 끝(자동 스크롤 구역)은 피한 자리
  const ty = Math.min(Math.max(b.y + 40, 100), vh - 100);
  await page.mouse.move(b.x + b.width / 2, ty, { steps: 10 });
  await expect(page.locator(`#y${toYear}`)).toContainText(`여기에 놓으면 ${toYear}년으로 옮겨요`);
  await page.mouse.up();
}

test('다른 해 책장에 끌어 놓으면 완독일을 확인하고 그해로 옮긴다', async ({ page }) => {
  const db = await loginAs(page, '#/', yearsSeed({ [y]: 2, [y - 1]: 2 }));
  await dragTo(page, `${y - 1}년 책 1`, y);
  const dialog = page.getByRole('dialog', {
    name: `「${y - 1}년 책 1」을 ${y}년 책장으로 옮길까요?`,
  });
  const date = dialog.getByLabel('완독일');
  await expect(date).toHaveValue(`${y}-01-10`);
  // 그해가 아닌 날짜는 받지 않음
  await date.fill(`${y - 1}-05-05`);
  await dialog.getByRole('button', { name: '옮기기' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(`${y}년 안의 날짜를 골라 주세요.`);
  await date.fill(`${y}-02-03`);
  await dialog.getByRole('button', { name: '옮기기' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.locator(`#y${y}`).getByRole('button', { name: new RegExp(`^${y - 1}년 책 1,`) }),
  ).toBeVisible();
  expect(db.readings.find((r) => r.id === `r-${y - 1}-0`)).toMatchObject({
    finished_at: `${y}-02-03`,
    shelf_position: null,
  });
});

test('옮기기 창에서 취소하면 그대로 둔다', async ({ page }) => {
  const db = await loginAs(page, '#/', yearsSeed({ [y]: 2, [y - 1]: 2 }));
  await dragTo(page, `${y}년 책 2`, y - 1);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('완독일')).toHaveValue(`${y - 1}-06-10`);
  await dialog.getByRole('button', { name: '취소' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.locator(`#y${y}`).getByRole('button', { name: new RegExp(`^${y}년 책 2,`) }),
  ).toBeVisible();
  expect(db.readings.find((r) => r.id === `r-${y}-1`)).toMatchObject({
    finished_at: `${y}-06-10`,
  });
});
