// RLS·Storage 보안 점검 (IMPLEMENTATION_PLAN Phase 2-3)
// 원격 Supabase에서 "로그아웃 상태", "다른 계정"이 앱 주인의 데이터에 접근하지 못하는지 확인합니다.
// 점검하며 만든 임시 책·기록·파일은 끝에 지웁니다.
//
// 준비: .env(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)와 .env.test.local(커밋 안 됨)에
//   OWNER_EMAIL, OWNER_PASSWORD   ← 앱 주인 계정
//   TEST_EMAIL, TEST_PASSWORD     ← 점검용 다른 계정
// 실행: node scripts/check-rls.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types.ts';

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

const BUCKET = 'bookchronicle-covers';

function newClient() {
  return createClient<Database, 'bookchronicle'>(
    env('VITE_SUPABASE_URL'),
    env('VITE_SUPABASE_ANON_KEY'),
    {
      db: { schema: 'bookchronicle' },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
}

type Client = ReturnType<typeof newClient>;

async function signIn(client: Client, email: string, password: string): Promise<string> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`로그인 실패(${email}): ${error?.message}`);
  return data.user.id;
}

const anon = newClient();
const owner = newClient();
const tester = newClient();
let bookId: string | null = null;
let coverPath: string | null = null;

try {
  // ───────── 1. 로그아웃 상태(anon) ─────────
  {
    const { data, error } = await anon.from('books').select('id').limit(1);
    check(
      'anon: books 조회 불가',
      Boolean(error) || (data ?? []).length === 0,
      error?.message ?? '',
    );
    const ins = await anon.from('settings').insert({});
    check('anon: settings 추가 불가', Boolean(ins.error), ins.error?.message ?? '추가됨!');
  }

  // ───────── 2. 앱 주인 ─────────
  const ownerId = await signIn(owner, env('OWNER_EMAIL'), env('OWNER_PASSWORD'));
  {
    const { data, error } = await owner
      .from('books')
      .insert({
        title: '[RLS 점검] 임시 책',
        spine: { palette: { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' } },
      })
      .select('id')
      .single();
    check('주인: 책 추가', !error && Boolean(data), error?.message ?? '');
    bookId = data?.id ?? null;
  }
  if (bookId) {
    const { data, error } = await owner
      .from('readings')
      .insert({ book_id: bookId, status: 'finished', finished_at: '2026-03-14', rating: 4.5 })
      .select('year')
      .single();
    check(
      '주인: 기록 추가, year=완독 연도',
      !error && data?.year === 2026,
      error?.message ?? `year=${data?.year}`,
    );

    const bad = await owner
      .from('readings')
      .insert({ book_id: bookId, status: 'finished', rating: 4.3 });
    check('주인: 별점 0.5 단위가 아니면 거부', Boolean(bad.error), bad.error?.message ?? '저장됨!');
  }
  {
    const cache = await owner.from('aladin_cache').select('key').limit(1);
    check('주인: aladin_cache 접근 불가', Boolean(cache.error), cache.error?.message ?? '읽힘!');
  }
  coverPath = `${ownerId}/covers/rls-check.jpg`;
  {
    const up = await owner.storage
      .from(BUCKET)
      .upload(
        coverPath,
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
        {
          contentType: 'image/jpeg',
          upsert: true,
        },
      );
    check('주인: 본인 폴더에 표지 올리기', !up.error, up.error?.message ?? '');
  }

  // ───────── 3. 다른 계정 ─────────
  const testerId = await signIn(tester, env('TEST_EMAIL'), env('TEST_PASSWORD'));
  check('점검 계정이 주인과 다른 사용자', testerId !== ownerId);
  if (bookId) {
    const sel = await tester.from('books').select('id').eq('id', bookId);
    check('다른 계정: 주인 책 조회 불가', (sel.data ?? []).length === 0, sel.error?.message ?? '');

    const upd = await tester.from('books').update({ title: '바뀜' }).eq('id', bookId).select('id');
    check('다른 계정: 주인 책 수정 불가', (upd.data ?? []).length === 0, upd.error?.message ?? '');

    const del = await tester.from('books').delete().eq('id', bookId).select('id');
    check('다른 계정: 주인 책 삭제 불가', (del.data ?? []).length === 0, del.error?.message ?? '');

    const fk = await tester.from('readings').insert({ book_id: bookId, status: 'finished' });
    check('다른 계정: 주인 책에 기록 달기 불가', Boolean(fk.error), fk.error?.message ?? '저장됨!');
  }
  {
    const spoof = await tester.from('books').insert({ user_id: ownerId, title: '사칭', spine: {} });
    check(
      '다른 계정: 주인 이름으로 책 추가 불가',
      Boolean(spoof.error),
      spoof.error?.message ?? '저장됨!',
    );
  }
  if (coverPath) {
    const dl = await tester.storage.from(BUCKET).download(coverPath);
    check(
      '다른 계정: 주인 표지 내려받기 불가',
      Boolean(dl.error),
      dl.error?.message ?? '내려받음!',
    );

    const up = await tester.storage
      .from(BUCKET)
      .upload(
        `${ownerId}/covers/intruder.jpg`,
        new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
        {
          contentType: 'image/jpeg',
        },
      );
    check('다른 계정: 주인 폴더에 올리기 불가', Boolean(up.error), up.error?.message ?? '올라감!');

    const list = await tester.storage.from(BUCKET).list(`${ownerId}/covers`);
    check(
      '다른 계정: 주인 폴더 목록 안 보임',
      (list.data ?? []).length === 0,
      list.error?.message ?? '',
    );
  }
} catch (e) {
  check('점검 진행', false, e instanceof Error ? e.message : String(e));
} finally {
  // ───────── 4. 정리 ─────────
  if (coverPath) await owner.storage.from(BUCKET).remove([coverPath]);
  if (bookId) {
    const del = await owner.from('books').delete().eq('id', bookId).select('id');
    check('정리: 임시 책 삭제', (del.data ?? []).length === 1, del.error?.message ?? '');
    const left = await owner.from('readings').select('id').eq('book_id', bookId);
    check('정리: 책을 지우면 기록도 함께 삭제', (left.data ?? []).length === 0);
  }
  await Promise.all([owner.auth.signOut(), tester.auth.signOut()]);
}

for (const r of results) {
  console.log(`${r.ok ? '통과' : '실패'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? `\n모두 통과 (${results.length}개)` : `\n실패 ${failed}개`);
process.exit(failed === 0 ? 0 : 1);
