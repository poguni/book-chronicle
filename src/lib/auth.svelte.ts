import type { Session } from '@supabase/supabase-js';
import { loginErrorMessage } from './authErrors';
import { supabase } from './supabase';

// 로그인 상태. onAuthStateChange가 처음 구독할 때 INITIAL_SESSION으로 저장된 세션을 알려 줍니다.
class Auth {
  session = $state<Session | null>(null);
  /** 저장된 세션을 확인했는지 (확인 전에는 로그인 화면을 깜빡 보여 주지 않음) */
  ready = $state(false);
  /** 서버에서 로그인이 끝나 로그인 화면으로 돌아왔는지 (로그인 화면에 안내를 보여 줌) */
  expired = $state(false);
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
      if (!error) this.expired = false;
      return error ? loginErrorMessage(error) : null;
    } catch {
      return loginErrorMessage({ status: 0 });
    }
  }

  /**
   * 이 브라우저에서만 로그아웃합니다. 기본값(global)은 같은 계정의 다른 기기·기존 독서 앱의
   * 로그인까지 모두 끊으므로 쓰지 않습니다.
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut({ scope: 'local' });
  }

  /** 서버에서 로그인이 끝났을 때(다른 곳의 전체 로그아웃 등): 저장된 세션을 지우고 로그인 화면으로 */
  async expire(): Promise<void> {
    this.expired = true;
    await supabase.auth.signOut({ scope: 'local' });
  }
}

export const auth = new Auth();
