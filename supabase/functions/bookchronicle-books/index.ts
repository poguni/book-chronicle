// Edge Function `bookchronicle-books` (Deno). 핵심 로직은 handler.ts에 있습니다.
// 배포: npx supabase functions deploy bookchronicle-books --use-api --no-verify-jwt (사용자 확인 후)
// 비밀 값: KAKAO_REST_API_KEY, NLK_CERT_KEY, BOOKCHRONICLE_OWNER_ID (supabase secrets에만 둠)
//
// publishable 키를 쓰는 프로젝트는 플랫폼의 JWT 검사(verify_jwt)를 끄고 함수 안에서 확인합니다.
// 여기서는 Auth 서버에 토큰을 물어 사용자를 확인합니다(auth.getUser).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handle } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';

function firstKey(dictName: string, legacyName: string): string {
  try {
    const dict = JSON.parse(Deno.env.get(dictName) ?? '{}') as Record<string, string>;
    if (dict.default) return dict.default;
  } catch {
    // 아래 예전 키로
  }
  return Deno.env.get(legacyName) ?? '';
}

const publicClient = createClient(url, firstKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
// 캐시 표 aladin_cache(이름은 그대로 둠)는 RLS 정책이 없어 비밀 키로만 읽고 씁니다(브라우저는 접근 불가).
const adminClient = createClient(
  url,
  firstKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'),
  {
    db: { schema: 'bookchronicle' },
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve((req) =>
  handle(req, {
    kakaoKey: Deno.env.get('KAKAO_REST_API_KEY') ?? '',
    nlkKey: Deno.env.get('NLK_CERT_KEY') ?? '',
    ownerId: Deno.env.get('BOOKCHRONICLE_OWNER_ID') ?? '',
    fetch,
    async getUserId(token) {
      const { data, error } = await publicClient.auth.getUser(token);
      return error ? null : (data.user?.id ?? null);
    },
    async cacheGet(key) {
      const { data } = await adminClient
        .from('aladin_cache')
        .select('value')
        .eq('key', key)
        .gt('saved_at', new Date(Date.now() - DAY_MS).toISOString())
        .maybeSingle();
      return data?.value ?? null;
    },
    async cacheSet(key, value) {
      await adminClient
        .from('aladin_cache')
        .upsert({ key, value, saved_at: new Date().toISOString() });
    },
  }),
);
