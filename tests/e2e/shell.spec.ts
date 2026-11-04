import { expect, test } from '@playwright/test';
import { horizontalOverflow, loginAs, openMenuIfCollapsed } from './helpers';

const year = String(new Date().getFullYear());

test.describe('앱 셸 (데스크톱)', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, '데스크톱 전용');

  test('1440px에서는 사이드바·책장·상세 패널 3단이 보인다', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('나의 독서 연대기');
    await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
    await expect(page.getByRole('link', { name: '책장' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('complementary', { name: '선택한 책과 올해 요약' })).toBeVisible();
    // 올해 책장은 비어 있어도 보이고, 첫 책을 꽂자고 안내한다
    await expect(page.getByRole('heading', { level: 2, name: year })).toBeVisible();
    await expect(page.getByText('이 해의 첫 책을 꽂아 볼까요?')).toBeVisible();
    await expect(page.getByRole('img', { name: `${year}년 월별 완독 권수` })).toBeVisible();

    // 세 칸이 나란히 놓였는지
    const side = await page.locator('aside.side').boundingBox();
    const main = await page.locator('main').boundingBox();
    const detail = await page.locator('aside.detail').boundingBox();
    expect(side?.width).toBe(232);
    expect(main!.x).toBeGreaterThanOrEqual(side!.x + side!.width);
    expect(detail!.x).toBeGreaterThanOrEqual(main!.x + main!.width);
    expect(detail!.width).toBeGreaterThanOrEqual(360);
    expect(detail!.width).toBeLessThanOrEqual(440);
  });

  test('1024px에서는 상세 패널이 서랍으로 숨는다', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAs(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('나의 독서 연대기');
    await expect(page.getByRole('navigation', { name: '주 메뉴' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: '선택한 책과 올해 요약' })).toBeHidden();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test('상세 패널은 책장 화면에만 있다', async ({ page }) => {
    await loginAs(page, '#/settings');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('설정');
    await expect(page.locator('aside.detail')).toHaveCount(0);
  });
});

test.describe('앱 셸 (스마트폰)', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 9999) >= 900, '스마트폰 전용');

  test('상단 바의 메뉴 버튼으로 메뉴를 펼치고, 화면을 고르면 접힌다', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('나의 독서 연대기');
    const nav = page.getByRole('navigation', { name: '주 메뉴' });
    await expect(nav).toBeHidden();

    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await expect(nav).toBeVisible();
    await expect(page.getByRole('button', { name: '메뉴 닫기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await page.getByRole('link', { name: '설정' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('설정');
    await expect(nav).toBeHidden();
  });

  test('390px 책장 홈에서 가로 스크롤이 생기지 않고, 상세 패널은 책장 아래에 있다', async ({
    page,
  }) => {
    await loginAs(page);
    await expect(page.getByText('이 해의 첫 책을 꽂아 볼까요?')).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    const main = await page.locator('main').boundingBox();
    const detail = await page.locator('aside.detail').boundingBox();
    expect(detail!.y).toBeGreaterThanOrEqual(main!.y + main!.height - 1);
  });
});

test.describe('보기 설정', () => {
  test('처음에는 운영체제 설정을 따른다', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'study');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  });

  test('사이드바에서 고른 테마·책등 스타일을 기억하고, 로그인 화면도 그 테마를 쓴다', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await loginAs(page);
    await openMenuIfCollapsed(page);
    const paper = page.getByRole('radio', { name: '종이' });
    await expect(page.getByRole('radio', { name: '서재' })).toHaveAttribute('aria-checked', 'true');
    await paper.click();
    await expect(paper).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');

    await page.getByRole('radio', { name: '표지 질감' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-spine', 'texture');

    await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '책장으로 돌아오신 걸 환영해요',
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
    await expect(page.locator('html')).toHaveAttribute('data-spine', 'texture');
  });
});
