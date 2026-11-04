import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// Phase 8: 연도 비교와 연말 회고
const y = new Date().getFullYear();
const main = (page: Page) => page.getByRole('main');
const yearChip = (page: Page, year: number) =>
  main(page).getByRole('button', { name: String(year), exact: true });

test('연도 비교: 기본은 올해와 작년, 2~5개까지 고르고, 지표와 증감을 보여 준다', async ({
  page,
}) => {
  await loginAs(page, '#/compare', yearsSeed({ [y]: 6, [y - 1]: 4, [y - 2]: 2 }));
  await expect(yearChip(page, y)).toHaveAttribute('aria-pressed', 'true');
  await expect(yearChip(page, y - 1)).toHaveAttribute('aria-pressed', 'true');
  await expect(yearChip(page, y - 2)).toHaveAttribute('aria-pressed', 'false');

  const books = main(page).locator('.metric').filter({ hasText: '권수' }).first();
  await expect(books).toContainText('6권');
  await expect(books).toContainText('4권');
  await expect(books).toContainText('▲ 2권 (+50%)');

  // 두 개 아래로는 뺄 수 없음
  await yearChip(page, y - 1).click();
  await expect(main(page).getByText('연도를 두 개 이상 골라 주세요.')).toBeVisible();
  await expect(yearChip(page, y - 1)).toHaveAttribute('aria-pressed', 'true');

  await yearChip(page, y - 2).click();
  await expect(yearChip(page, y - 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(books).toContainText('2권');

  // 그래프가 그려짐(지연 불러오기)
  await expect(main(page).getByRole('img', { name: /월별 권수 선 그래프/ })).toBeVisible();
  await expect(main(page).locator('canvas')).toHaveCount(2);
});

test('연도 비교: 표로 보기는 그래프와 같은 값(누적 포함)', async ({ page }) => {
  await loginAs(page, '#/compare', yearsSeed({ [y]: 6, [y - 1]: 4 }));
  await main(page).getByRole('button', { name: '표로 보기' }).click();
  const monthly = main(page).locator('table').first();
  await expect(monthly.locator('thead')).toContainText(String(y));
  await main(page).getByRole('button', { name: '누적' }).click();
  // 누적 마지막 달 = 그해 권수
  const dec = monthly.locator('tbody tr').last();
  await expect(dec.locator('td').nth(0)).toHaveText('6');
  await expect(dec.locator('td').nth(1)).toHaveText('4');
  // 분야 표: 연도마다 합이 그해 권수
  const cat = main(page).locator('table').nth(1);
  await expect(cat.locator('tbody tr')).toHaveCount(2);
  await main(page).getByRole('button', { name: '그래프로 보기' }).click();
  await expect(main(page).locator('table')).toHaveCount(0);
});

test('연도 비교: 책이 있는 해가 하나면 알려 준다', async ({ page }) => {
  await loginAs(page, '#/compare', yearsSeed({ [y]: 2 }));
  await expect(main(page).getByText('책이 있는 해가 하나뿐이에요', { exact: false })).toBeVisible();
});

test('연말 회고: 후보 제안, 그해의 책 고르기, 한 줄 회고 저장', async ({ page }) => {
  const db = await loginAs(page, `#/recap/${y}`, yearsSeed({ [y]: 5, [y - 1]: 2 }));
  await expect(main(page).getByRole('heading', { name: `${y}년 연말 회고` })).toBeVisible();
  // 별점 5점인 책 4가 후보
  await expect(main(page).getByText(`별점 5점인 「${y}년 책 4」은 어때요?`)).toBeVisible();
  await main(page).getByRole('button', { name: '이 책으로 정하기' }).click();
  await expect(main(page).getByRole('button', { name: new RegExp(`${y}년 책 4`) })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(db.years).toMatchObject([{ year: y, book_of_year: [`b-${y}-3`] }]);

  // 다른 책으로 바꾸기
  await main(page)
    .getByRole('button', { name: new RegExp(`^${y}년 책 2`) })
    .click();
  await expect(
    main(page).getByRole('button', { name: new RegExp(`^${y}년 책 2`) }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(db.years[0]?.book_of_year).toEqual([`b-${y}-1`]);

  const input = main(page).getByRole('textbox', { name: '한 줄 회고' });
  await input.fill('천천히, 그러나 꾸준히');
  await expect(main(page).getByText('12 / 80')).toBeVisible();
  await main(page).getByRole('button', { name: '저장', exact: true }).click();
  await expect(main(page).getByText('저장했어요.')).toBeVisible();
  expect(db.years[0]).toMatchObject({
    one_liner: '천천히, 그러나 꾸준히',
    book_of_year: [`b-${y}-1`],
  });
  await expect(input).toHaveAttribute('maxlength', '80');
});

test('회고 카드: 크기·테마·항목을 바꾸고 PNG로 저장한다', async ({ page }) => {
  await loginAs(page, `#/recap/${y}`, yearsSeed({ [y]: 5 }));
  const canvas = main(page).locator('.preview canvas');
  await expect(canvas).toHaveAttribute('width', '1080');
  await expect(canvas).toHaveAttribute('height', '1350');
  await main(page).getByRole('radio', { name: '스토리 1080×1920' }).check();
  await expect(main(page).locator('.preview canvas')).toHaveAttribute('height', '1920');
  await main(page).getByRole('radio', { name: '책등 색' }).check();
  await main(page).getByRole('checkbox', { name: '그해의 책장' }).uncheck();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    main(page).getByRole('button', { name: 'PNG로 저장' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`bookchronicle-${y}-story.png`);
  const bytes = readFileSync(await download.path());
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
});

test('나이테의 "회고 카드 만들기"로 그해 회고 화면에 간다', async ({ page }) => {
  await loginAs(page, '#/', yearsSeed({ [y]: 2 }));
  await page.getByRole('link', { name: '회고 카드 만들기' }).click();
  await expect(main(page).getByRole('heading', { name: `${y}년 연말 회고` })).toBeVisible();
});
