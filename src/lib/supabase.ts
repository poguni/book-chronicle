import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 브라우저 코드에는 Supabase 주소와 공개 키(anon/publishable)만 씁니다. 보안은 로그인 + RLS로 지킵니다.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient<Database, 'bookchronicle'>(
  url || 'http://localhost:54321',
  key || 'not-configured',
  {
    db: { schema: 'bookchronicle' },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // 이메일 + 비밀번호 로그인만 쓰므로 주소에서 세션을 읽지 않습니다(해시 라우터와 충돌 방지).
      detectSessionInUrl: false,
      // poguni.github.io·localhost에 다른 앱이 함께 있어도 세션이 섞이지 않게 저장 이름을 따로 둡니다.
      storageKey: 'bookchronicle-auth',
    },
  },
);
