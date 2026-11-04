import { expect, test, type Page } from '@playwright/test';
import { fakeBooks, twoTonePng } from './fakeBooks.ts';
import { loginAs, openMenuIfCollapsed } from './helpers.ts';
import { yearsSeed } from './seedYears.ts';

// Phase 9: 설정 저장, 표지 질감, 강조·접기·기대어 놓기, 바코드
const y = new Date().getFullYear();
const OWNER = '00000000-0000-4000-8000-000000000001';
const main = (page: Page) => page.getByRole('main');

test('테마·책등 스타일은 계정(Supabase)에 저장되고, 다음 로그인 때 그 값으로 열린다', async ({
  page,
}) => {
  const db = await loginAs(page, '#/settings', yearsSeed({ [y]: 2 }));
  await main(page).getByRole('radio', { name: '종이' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  await expect.poll(() => db.settings[0]?.theme).toBe('paper');

  // 다른 기기: 이 브라우저 저장소가 비어 있어도 계정 값을 따름
  await page.evaluate(() => localStorage.clear());
  db.settings[0]!.theme = 'study';
  await page.reload();
  await page.getByLabel('이메일').fill('owner@example.com');
  await page.getByLabel('비밀번호').fill('password-1234');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'study');
});

test('분야별 책등 무늬를 바꾸고, 분야 이름을 바꿔 합친다', async ({ page }) => {
  const db = await loginAs(page, '#/settings', yearsSeed({ [y]: 9 }));
  await main(page).getByRole('combobox', { name: '인문 책등 무늬' }).selectOption('paperback');
  await expect.poll(() => db.settings[0]?.pattern_map).toEqual({ 인문: 'paperback' });

  const before = db.books.filter((b) => b.category === '역사').length;
  expect(before).toBeGreaterThan(0);
  await main(page).getByRole('button', { name: '역사 이름 바꾸기' }).click();
  await main(page).getByRole('textbox', { name: '「역사」의 새 이름' }).fill('인문');
  await main(page).getByRole('button', { name: '바꾸기', exact: true }).click();
  await expect(main(page).getByText('「역사」을 「인문」로 바꿨어요.')).toBeVisible();
  expect(db.books.filter((b) => b.category === '역사')).toHaveLength(0);
});

test('도서 검색 연결을 확인한다', async ({ page }) => {
  await loginAs(page, '#/settings', {});
  await fakeBooks(page);
  await main(page).getByRole('button', { name: '연결 확인' }).click();
  await expect(
    main(page).getByText('잘 연결돼 있어요. 시험 검색에서 2권을 찾았어요.'),
  ).toBeVisible();
});

test('표지 질감 모드: 질감이 없는 책은 질감을 만들고, 책등에 흐린 표지를 깐다', async ({
  page,
}) => {
  const seed = yearsSeed({ [y]: 3 });
  seed.books[0]!.cover_path = `${OWNER}/covers/b-${y}-0.jpg`;
  const db = await loginAs(page, '#/settings', seed);
  const api = await fakeBooks(page, {
    files: { [`${OWNER}/covers/b-${y}-0.jpg`]: twoTonePng([120, 40, 30], [230, 220, 200]) },
  });
  await main(page).getByRole('radio', { name: '표지 질감' }).check();
  await expect.poll(() => db.books[0]?.texture_path).toBe(`${OWNER}/textures/b-${y}-0.webp`);
  expect(api.uploads.map((u) => u.path)).toEqual([`${OWNER}/textures/b-${y}-0.webp`]);
  expect(db.settings[0]?.spine_style).toBe('texture');

  await page.goto('./#/');
  // 질감이 있는 책만 흐린 표지, 나머지는 생성형 책등
  await expect(page.locator('.spine .tex')).toHaveCount(1);
  await expect(page.locator('.spine .tex')).toHaveCSS('background-image', /^url\("blob:/);
});

test('강조 보기와 지난해 접기, 읽는 중 기대어 놓기', async ({ page }) => {
  const seed = yearsSeed({ [y]: 5, [y - 1]: 4 });
  Object.assign(
    seed.readings.find((r) => r.id === `r-${y}-0`)!,
    {
      status: 'reading',
      finished_at: null,
      year: null,
    },
  );
  await loginAs(page, '#/', seed);

  // 읽는 중인 책은 비스듬히
  await expect(page.locator('#shelf-reading button.book.lean')).toHaveCount(1);

  // 별점 4.5 이상만 진하게
  await main(page).getByRole('combobox', { name: '강조' }).selectOption('rating');
  const dims = await page
    .locator(`#y${y} button.book`)
    .evaluateAll((els) => els.map((e) => e.classList.contains('dim')));
  expect(dims).toContain(true);
  expect(dims).toContain(false);

  // 지난해 접기: 띠로 접고, 띠를 누르면 펼침. 이 기기에 기억
  await main(page).getByRole('button', { name: '지난해 접기' }).click();
  await expect(page.locator(`#y${y - 1} button.book`)).toHaveCount(0);
  const band = page.locator(`#y${y - 1} .band`);
  await expect(band).toBeVisible();
  await expect(page.locator(`#y${y} button.book`)).toHaveCount(4);
  await page.reload(); // 로그인은 유지됨
  await expect(page.locator(`#y${y - 1} .band`)).toBeVisible();
  await page.locator(`#y${y - 1} .band`).click();
  await expect(page.locator(`#y${y - 1} button.book`)).toHaveCount(4);
});

test('바코드로 찾기: 카메라로 읽은 ISBN으로 바로 조회한다', async ({ page }) => {
  // 카메라와 바코드 인식을 흉내 냄(실제 기기 확인은 배포 후)
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    // 영상 프레임이 나오도록 계속 그림
    setInterval(() => {
      ctx.fillStyle = `hsl(${Date.now() % 360} 50% 50%)`;
      ctx.fillRect(0, 0, 64, 48);
    }, 50);
    const stream = canvas.captureStream(20);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve(stream) },
    });
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = class {
      static getSupportedFormats() {
        return Promise.resolve(['ean_13', 'qr_code']);
      }
      detect() {
        return Promise.resolve([{ rawValue: '9788954682152' }]);
      }
    };
  });
  await loginAs(page, '#/', {});
  const api = await fakeBooks(page);
  await openMenuIfCollapsed(page);
  await page.getByRole('button', { name: '책 한 권 꽂기' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '바코드로 찾기' }).click();
  await expect(dialog.getByRole('searchbox')).toHaveValue('9788954682152');
  await expect(dialog.getByRole('button', { name: /작별하지 않는다/ })).toBeVisible();
  expect(api.calls).toContainEqual({ action: 'lookup', isbn: '9788954682152' });
});
