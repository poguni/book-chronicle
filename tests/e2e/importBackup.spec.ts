import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fakeBooks } from './fakeBooks.ts';
import { loginAs, type FakeDb } from './helpers.ts';

// Phase 7: CSV 가져오기와 백업
const T = '2025-01-01T00:00:00Z';
const USER = '00000000-0000-4000-8000-000000000001';

function existing(): Partial<FakeDb> {
  return {
    books: [
      {
        id: 'old',
        user_id: USER,
        title: '총, 균, 쇠',
        author: '재레드 다이아몬드',
        publisher: null,
        pub_date: null,
        isbn13: null,
        pages: 752,
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
      },
    ],
    readings: [
      {
        id: 'r-old',
        user_id: USER,
        book_id: 'old',
        status: 'finished',
        started_at: null,
        finished_at: '2024-05-01',
        date_approx: false,
        year: 2024,
        rating: 4,
        note: null,
        shelf_position: null,
        created_at: T,
        updated_at: T,
      },
    ],
  };
}

const csvFile = (text: string, name = 'books.csv') => ({
  name,
  mimeType: 'text/csv',
  buffer: Buffer.from(text, 'utf-8'),
});

async function goImport(page: Page, seed: Partial<FakeDb> = existing()) {
  const db = await loginAs(page, '#/import', seed);
  const api = await fakeBooks(page);
  await expect(page.getByRole('heading', { name: 'CSV로 한꺼번에 가져오기' })).toBeVisible();
  return { db, api };
}

test('CSV를 열 맞추기·보충 조회·중복 처리를 거쳐 가져온다', async ({ page }) => {
  const { db, api } = await goImport(page);
  await page
    .getByLabel('CSV 파일 고르기')
    .setInputFiles(
      csvFile(
        [
          '도서명,지은이,다 읽은 날,평점,한줄평',
          '작별하지 않는다,한강,2025.3.14,4.5,눈이 내리는 소설',
          '데미안,헤세,2024-07,4,',
          '데미안,헤세,2026-01-02,5,다시 읽음',
          '총 균 쇠,재레드 다이아몬드,2025/09/01,5,',
          ',제목 없는 줄,2025-01-01,3,',
        ].join('\n'),
      ),
    );

  // 열 맞추기: 비슷한 이름은 미리 맞춰 둠
  await expect(page.getByLabel('제목 *')).toHaveValue('0');
  await expect(page.getByLabel('완독일', { exact: true })).toHaveValue('2');
  await expect(
    page.getByText('4줄을 읽었어요. 제목이 없거나 읽지 않은 책 1줄은 빼요.'),
  ).toBeVisible();

  await page.getByRole('button', { name: '도서 정보 보충하기' }).click();
  await expect(page.getByRole('heading', { name: '미리 보기' })).toBeVisible();
  // 작별하지 않는다: 제목+저자로 하나 찾고 ISBN으로 쪽수까지
  expect(api.calls).toContainEqual({ action: 'search', q: '작별하지 않는다 한강' });
  const rows = page.locator('table.preview tbody tr');
  await expect(rows.nth(0).getByText('정보 보충됨')).toBeVisible();
  await expect(rows.nth(1).getByText('후보 여러 개')).toBeVisible();
  // 이미 있는 책(총, 균, 쇠): 독서 기록만 추가로
  await expect(rows.nth(3).getByText('이미 있는 책: 총, 균, 쇠')).toBeVisible();
  await page.getByLabel('5번째 줄 중복 처리').selectOption('addReading');

  await page.getByRole('button', { name: '4줄 가져오기' }).click();
  await expect(page.getByText('새 책 2권과 독서 기록 4개를 꽂았어요.')).toBeVisible();

  const added = db.books.filter((b) => b.source === 'csv');
  expect(added).toHaveLength(2);
  const farewell = added.find((b) => b.title === '작별하지 않는다')!;
  expect(farewell).toMatchObject({
    pages: 332,
    isbn13: '9788954682152',
    category: '문학',
    publisher: '문학동네',
  });
  expect(farewell.cover_path).toMatch(/covers\/.*\.jpg$/);
  expect(api.uploads.some((u) => u.path === farewell.cover_path && u.jpeg)).toBe(true);
  // 데미안: 한 권에 기록 두 개(같은 파일 안 다시 읽기), 일 미상 날짜
  const demian = added.find((b) => b.title === '데미안')!;
  const demianReadings = db.readings.filter((r) => r.book_id === demian.id);
  expect(demianReadings.map((r) => r.finished_at).sort()).toEqual(['2024-07-15', '2026-01-02']);
  expect(demianReadings.find((r) => r.finished_at === '2024-07-15')?.date_approx).toBe(true);
  // 총, 균, 쇠: 책은 그대로, 기록만 하나 더
  expect(db.books.filter((b) => b.title === '총, 균, 쇠')).toHaveLength(1);
  expect(db.readings.filter((r) => r.book_id === 'old')).toHaveLength(2);

  await page.getByRole('link', { name: '책장 보기' }).click();
  await expect(page.getByRole('button', { name: /^작별하지 않는다,/ })).toBeVisible();
});

test('한글 엑셀(CP949) 파일을 알아보고, 인코딩을 바꿀 수 있다', async ({ page }) => {
  await goImport(page);
  await page.getByLabel('CSV 파일 고르기').setInputFiles({
    name: 'excel.csv',
    mimeType: 'text/csv',
    buffer: readFileSync(new URL('../fixtures/cp949.csv', import.meta.url)),
  });
  await expect(page.getByLabel('글자 인코딩')).toHaveValue('euc-kr');
  // CP949 확장 글자까지 브라우저가 읽음
  await expect(page.locator('table.sample')).toContainText('똠방각하');
  await page.getByLabel('글자 인코딩').selectOption('utf-8');
  await expect(page.locator('table.sample')).not.toContainText('똠방각하');
});

test('보충 없이 가져오고, 줄을 빼거나 후보를 고를 수 있다', async ({ page }) => {
  const { db } = await goImport(page, {});
  await page
    .getByLabel('CSV 파일 고르기')
    .setInputFiles(
      csvFile('제목,저자,완독일\n소년이 온다,한강,2025-01-05\n빼고 싶은 책,누구,2025-01-06'),
    );
  await page.getByRole('button', { name: '보충 없이 미리 보기' }).click();
  await page.getByLabel('3번째 줄 가져오기').uncheck();
  await page.getByRole('button', { name: '1줄 가져오기' }).click();
  await expect(page.getByText('새 책 1권과 독서 기록 1개를 꽂았어요.')).toBeVisible();
  expect(db.books.map((b) => b.title)).toEqual(['소년이 온다']);
  expect(db.books[0]?.cover_path).toBeNull();
});

test('JSON 백업을 받고, 받은 시각을 기억한다. CSV로도 내보낸다', async ({ page }) => {
  const { db } = await goImport(page);
  await expect(page.getByText('아직 백업 파일을 받은 적이 없어요.')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSON 백업 받기' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^bookchronicle-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = JSON.parse(readFileSync(await download.path(), 'utf-8')) as Record<
    string,
    unknown
  >;
  expect(backup).toMatchObject({ app: 'bookchronicle', schemaVersion: 1 });
  expect(backup.books).toHaveLength(1);
  expect(backup.readings).toHaveLength(1);
  await expect(page.getByText('백업 파일을 받았어요.')).toBeVisible();
  expect(db.settings[0]?.last_backup_at).toEqual(expect.any(String));
  await expect(page.getByText(/^마지막 백업: /)).toBeVisible();

  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSV로 내보내기 (엑셀)' }).click(),
  ]);
  const bytes = readFileSync(await csv.path());
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(bytes.toString('utf-8')).toContain('총, 균, 쇠');
});

/** 다른 계정에서 만든 백업 파일 */
function otherBackup() {
  const other = 'other-user';
  return {
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'bookchronicle',
        schemaVersion: 1,
        exportedAt: '2026-10-01T00:00:00Z',
        books: [
          { ...existing().books![0], id: 'b1', user_id: other, title: '총, 균, 쇠' },
          {
            ...existing().books![0],
            id: 'b2',
            user_id: other,
            title: '코스모스',
            author: '칼 세이건',
            cover_path: 'other-user/covers/b2.jpg',
          },
        ],
        readings: [
          { ...existing().readings![0], id: 'x1', user_id: other, book_id: 'b1' },
          {
            ...existing().readings![0],
            id: 'x2',
            user_id: other,
            book_id: 'b2',
            finished_at: '2023-02-02',
            year: 2023,
          },
        ],
        years: [
          {
            user_id: other,
            year: 2023,
            book_of_year: ['b2'],
            one_liner: '별을 본 해',
            updated_at: T,
          },
        ],
        settings: null,
      }),
    ),
  };
}

test('백업에서 합치기로 복원한다(다른 계정의 백업은 ID를 새로 만들고, 있는 책은 그대로)', async ({
  page,
}) => {
  const { db } = await goImport(page);
  await page.getByLabel('백업 파일(JSON) 고르기').setInputFiles(otherBackup());
  await expect(page.getByText('다른 계정에서 만든 백업이에요', { exact: false })).toBeVisible();
  await expect(
    page.getByText('책 1권과 기록 1개를 더해요. 이미 있는 책 1권은 그대로 둬요.'),
  ).toBeVisible();
  await page.getByRole('button', { name: '복원하기' }).click();
  await expect(page.getByText('복원했어요.')).toBeVisible();
  expect(db.books.map((b) => b.title).sort()).toEqual(['총, 균, 쇠', '코스모스']);
  const cosmos = db.books.find((b) => b.title === '코스모스')!;
  expect(cosmos.id).not.toBe('b2');
  expect(cosmos.user_id).toBe(USER);
  expect(cosmos.cover_path).toBeNull();
  expect(db.years).toMatchObject([
    { year: 2023, book_of_year: [cosmos.id], one_liner: '별을 본 해' },
  ]);
});

test('덮어쓰기 복원은 한 번 더 확인한 뒤 지금 책장을 바꾼다', async ({ page }) => {
  const { db } = await goImport(page);
  await page.getByLabel('백업 파일(JSON) 고르기').setInputFiles(otherBackup());
  await page.getByRole('radio', { name: /덮어쓰기/ }).check();
  await expect(
    page.getByText('지금 책장의 책 1권이 모두 지워지고', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: '복원하기' }).click();
  // 아직 바뀌지 않음: 확인 버튼이 나옴
  expect(db.books.map((b) => b.id)).toEqual(['old']);
  await page.getByRole('button', { name: '네, 덮어쓸게요' }).click();
  await expect(page.getByText('복원했어요.')).toBeVisible();
  expect(db.books).toHaveLength(2);
  expect(db.books.some((b) => b.id === 'old')).toBe(false);
  expect(db.readings).toHaveLength(2);
});

test('북크로니클 백업이 아니면 알려 준다', async ({ page }) => {
  await goImport(page);
  await page.getByLabel('백업 파일(JSON) 고르기').setInputFiles({
    name: 'x.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":1}'),
  });
  await expect(page.getByText('북크로니클 백업 파일이 아니에요.')).toBeVisible();
});

test('마지막 백업 후 30일이 지나면 책장에서 백업을 권한다', async ({ page }) => {
  await loginAs(page, '#/', existing());
  const banner = page.getByRole('status').filter({ hasText: '30일이 지났어요' });
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: '나중에' }).click();
  await expect(banner).toBeHidden();
});
