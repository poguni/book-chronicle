import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loginAs, openMenuIfCollapsed } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// 접근성 자동 점검 (PRD 11장, CLAUDE.md 6장): WCAG 2.1 A·AA 규칙, 두 테마 × 주요 화면
const y = new Date().getFullYear();

async function violations(page: Page, where: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return r.violations.map(
    (v) => `${where} ${v.impact} ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  );
}

for (const theme of ['study', 'paper'] as const) {
  test(`접근성: ${theme === 'study' ? '서재' : '종이'} 테마 주요 화면`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('bookchronicle-theme', t), theme);
    await page.goto('./#/');
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
    const found = await violations(page, '로그인');

    await loginAs(page, '#/', yearsSeed({ [y]: 6, [y - 1]: 4 }));
    for (const hash of ['#/', '#/compare', '#/recap', '#/list', '#/import', '#/settings']) {
      await page.goto(`./${hash}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForTimeout(600);
      if (hash === '#/') await page.locator('button.book').first().click();
      found.push(...(await violations(page, hash)));
    }
    await page.goto('./#/');
    await openMenuIfCollapsed(page);
    await page.getByRole('button', { name: '책 한 권 꽂기' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    found.push(...(await violations(page, '책 꽂기')));
    expect(found).toEqual([]);
  });
}
