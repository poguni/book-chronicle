import { expect, test } from '@playwright/test';
import { horizontalOverflow, loginAs } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// 화면 점검표 (IMPLEMENTATION_PLAN Phase 9): 두 테마 × 1440·1024·390px × 주요 화면
// 가로 스크롤이 생기지 않고, 화면 제목이 보이는지 확인합니다. SHOTS=1이면 스크린샷도 남깁니다.
const y = new Date().getFullYear();
const ROUTES = ['#/', '#/compare', '#/recap', '#/import', '#/settings'];
const WIDTHS = [1440, 1024, 390];
const shots = process.env.SHOTS;

for (const theme of ['study', 'paper'] as const) {
  for (const width of WIDTHS) {
    test(`점검표: ${theme} ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', '폭을 직접 정함');
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.addInitScript((t) => localStorage.setItem('bookchronicle-theme', t), theme);
      await loginAs(page, '#/', yearsSeed({ [y]: 12, [y - 1]: 9, [y - 2]: 5 }));
      for (const hash of ROUTES) {
        await page.goto(`./${hash}`);
        await expect(page.locator('main h1').first()).toBeVisible();
        await page.waitForTimeout(500);
        expect(await horizontalOverflow(page), `${hash} 가로 넘침`).toBeLessThanOrEqual(0);
        if (shots)
          await page.screenshot({
            path: `${shots}/${theme}-${width}-${hash.replace(/[#/]/g, '') || 'shelves'}.png`,
            fullPage: true,
          });
      }

      await page.goto('./#/');
      await page.locator('button.book').first().click();
      const panel = page.getByRole('complementary', { name: '선택한 책과 올해 요약' });
      // 1200px 이상: 오른쪽 패널, 900~1199px: 서랍, 900px 미만: 책장 아래
      await expect(panel.getByRole('heading', { level: 3 }).first()).toBeVisible();
      if (width === 1024) {
        // 서랍이 다 열린 뒤(0.3초) 화면 안에 들어옴
        await expect
          .poll(async () => {
            const box = (await panel.boundingBox())!;
            return box.x + box.width;
          })
          .toBeLessThanOrEqual(width + 1);
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
      }
      if (width === 390) {
        // 접히는 메뉴: 펼친 메뉴가 화면보다 길면 메뉴 안에서 스크롤
        await page.getByRole('button', { name: '메뉴 열기' }).click();
        const menu = page.locator('#side-body');
        const scrollable = await menu.evaluate(
          (el) =>
            getComputedStyle(el).overflowY === 'auto' ||
            getComputedStyle(el).overflowY === 'scroll',
        );
        expect(scrollable).toBe(true);
      }
      if (shots) await page.screenshot({ path: `${shots}/${theme}-${width}-pulled.png` });
    });
  }
}
