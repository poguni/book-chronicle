// 도서 정보 Edge Function 배포 후 점검 (IMPLEMENTATION_PLAN Phase 5-1, 결정 0008)
// 원격 함수 bookchronicle-books가 앱 주인만 쓸 수 있고, 엉뚱한 요청은 거절하는지 확인합니다.
// 바깥 호출 수: 카카오 검색 1번 + ISBN 조회(카카오·국립중앙도서관) 1번 + 표지 1번 (24시간 캐시)
//
// 준비: .env(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)와 .env.test.local(커밋 안 됨)에
//   OWNER_EMAIL, OWNER_PASSWORD, TEST_EMAIL, TEST_PASSWORD  (check-rls.ts와 같음)
// 실행: npm run check:books

import { createClient } from '@supabase/supabase-js';

for (const file of ['.env', '.env.test.local']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // 파일이 없으면 아래에서 빠진 값을 알려 줍니다.
  }
}

const need = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'OWNER_EMAIL',
  'OWNER_PASSWORD',
  'TEST_EMAIL',
  'TEST_PASSWORD',
];
const missing = need.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`빠진 환경 변수: ${missing.join(', ')}`);
  process.exit(2);
}
const env = (k: string) => process.env[k] as string;
const FN = `${env('VITE_SUPABASE_URL')}/functions/v1/bookchronicle-books`;
const ORIGIN = 'https://poguni.github.io';

async function tokenOf(email: string, password: string): Promise<string> {
  const client = createClient(env('VITE_SUPABASE_URL'), env('VITE_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`로그인 실패(${email}): ${error?.message}`);
  return data.session.access_token;
}

function call(body: unknown, token: string | null, origin = ORIGIN) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: env('VITE_SUPABASE_ANON_KEY'),
    Origin: origin,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(FN, { method: 'POST', headers, body: JSON.stringify(body) });
}

const results: { name: string; ok: boolean; detail: string }[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
}

const owner = await tokenOf(env('OWNER_EMAIL'), env('OWNER_PASSWORD'));
const other = await tokenOf(env('TEST_EMAIL'), env('TEST_PASSWORD'));
const search = { action: 'search', q: '작별하지 않는다' };

let r = await call(search, null);
check('로그인 없이 부르면 401', r.status === 401, `status ${r.status}`);

r = await call(search, other);
check('다른 가입자는 403', r.status === 403, `status ${r.status}`);

r = await call(search, owner, 'https://evil.example');
check('허용하지 않은 주소(Origin)는 403', r.status === 403, `status ${r.status}`);

r = await call({ action: 'cover', url: 'https://evil.example/a.jpg' }, owner);
check('허용하지 않은 표지 주소는 400', r.status === 400, `status ${r.status}`);

r = await call(search, owner);
const text = await r.text();
let items: { title: string; cover: string | null }[] = [];
try {
  items = (JSON.parse(text) as { items: typeof items }).items ?? [];
} catch {
  // 아래에서 실패로 표시
}
check(
  '앱 주인은 검색할 수 있다',
  r.status === 200 && items.length > 0,
  `status ${r.status}, ${items.length}건${r.ok ? '' : `, ${text.slice(0, 80)}`}`,
);
check(
  'CORS: 허용한 주소를 돌려준다',
  r.headers.get('access-control-allow-origin') === ORIGIN,
  String(r.headers.get('access-control-allow-origin')),
);
check('응답에 키 이름이 없다', !/kakaoak|cert_key/i.test(text));

const isbn = (items as { isbn13?: string | null }[]).find((i) => i.isbn13)?.isbn13;
if (isbn) {
  r = await call({ action: 'lookup', isbn }, owner);
  const item = ((await r.json()) as { item: { pages: number | null; kdc: string | null } | null })
    .item;
  check('ISBN 조회가 된다', r.status === 200 && item !== null, `status ${r.status}`);
  check(
    '국립중앙도서관에서 쪽수를 받는다 (인증키 승인 전이면 실패)',
    Boolean(item?.pages),
    `pages ${item?.pages ?? '없음'}, KDC ${item?.kdc ?? '없음'}`,
  );
}

const coverUrl = items.find((i) => i.cover)?.cover;
if (coverUrl) {
  r = await call({ action: 'cover', url: coverUrl }, owner);
  const type = r.headers.get('content-type') ?? '';
  const size = (await r.arrayBuffer()).byteLength;
  check(
    '앱 주인은 표지를 받을 수 있다',
    r.status === 200 && type.startsWith('image/'),
    `${type}, ${size}B`,
  );
} else {
  check('앱 주인은 표지를 받을 수 있다', false, '검색 결과에 표지가 없음');
}

for (const x of results)
  console.log(`${x.ok ? '통과' : '실패'}  ${x.name}${x.detail ? `  (${x.detail})` : ''}`);
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
