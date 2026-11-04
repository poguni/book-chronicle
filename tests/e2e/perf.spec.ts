import { expect, test } from '@playwright/test';
import { loginAs } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// 성능 (PRD 11장): 책 1,000권(10년치)에서 로그인 후 책장 홈 첫 표시 2초 이내, 스크롤 중 긴 작업 없음
const y = new Date().getFullYear();

test('책 1,000권: 로그인부터 모든 책장 표시까지 2초 이내, 스크롤 중 50ms 넘는 작업 없음', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', '데스크톱 한 번만 잼');
  const per: Record<number, number> = {};
  for (let i = 0; i < 10; i++) per[y - i] = 100;
  const t0 = Date.now();
  await loginAs(page, '#/', yearsSeed(per));
  await page.locator('button.book').nth(999).waitFor({ state: 'attached' });
  await page
    .locator(`#y${y - 9} .t`)
    .first()
    .waitFor();
  const elapsed = Date.now() - t0;
  console.log(`1,000권 표시: ${elapsed}ms`);
  expect(elapsed).toBeLessThan(2000);

  await page.waitForTimeout(1000);
  const worst = await page.evaluate(async () => {
    let w = 0;
    const obs = new PerformanceObserver((l) =>
      l.getEntries().forEach((e) => (w = Math.max(w, e.duration))),
    );
    obs.observe({ type: 'longtask', buffered: false });
    for (let i = 0; i < 30; i++) {
      window.scrollBy(0, 400);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    await new Promise((r) => setTimeout(r, 300));
    obs.disconnect();
    return w;
  });
  expect(worst).toBeLessThan(50);
});
