import type { Session } from '@supabase/supabase-js';
import { loginErrorMessage } from './authErrors';
import { supabase } from './supabase';

// 로그인 상태. onAuthStateChange가 처음 구독할 때 INITIAL_SESSION으로 저장된 세션을 알려 줍니다.
class Auth {
  session = $state<Session | null>(null);
  /** 저장된 세션을 확인했는지 (확인 전에는 로그인 화면을 깜빡 보여 주지 않음) */
  ready = $state(false);
  userId = $derived(this.session?.user.id ?? null);

  constructor() {
    // 주의: 이 콜백 안에서 다른 supabase 호출을 await하지 않습니다(supabase-js 권고).
    supabase.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      this.ready = true;
    });
  }

  /** 성공하면 null, 실패하면 화면에 보여 줄 문구 */
  async signIn(email: string, password: string): Promise<string | null> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? loginErrorMessage(error) : null;
    } catch {
      return loginErrorMessage({ status: 0 });
    }
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}

export const auth = new Auth();
