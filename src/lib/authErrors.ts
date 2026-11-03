import { ko } from './i18n/ko';

/** supabase-js AuthError에서 쓰는 값만 추린 모양 */
export type AuthErrorLike = {
  name?: string;
  status?: number;
  code?: string;
};

/** 로그인 오류를 화면 문구로 바꿉니다. 탓하지 않고 다음 행동을 알려 줍니다(CLAUDE.md 7장). */
export function loginErrorMessage(error: AuthErrorLike): string {
  if (error.code === 'email_not_confirmed') return ko.login.errorNotConfirmed;
  if (error.code === 'invalid_credentials' || error.status === 400) return ko.login.errorInvalid;
  if (
    error.name === 'AuthRetryableFetchError' ||
    error.status === 0 ||
    (error.status !== undefined && error.status >= 500)
  ) {
    return ko.login.errorNetwork;
  }
  if (error.status === 429) return ko.login.errorTooMany;
  return ko.login.errorUnknown;
}
