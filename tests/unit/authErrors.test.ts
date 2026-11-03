import { describe, expect, it } from 'vitest';
import { loginErrorMessage } from '../../src/lib/authErrors';
import { ko } from '../../src/lib/i18n/ko';

describe('loginErrorMessage', () => {
  it('이메일·비밀번호가 틀리면 확인 안내', () => {
    expect(loginErrorMessage({ status: 400, code: 'invalid_credentials' })).toBe(
      ko.login.errorInvalid,
    );
    expect(loginErrorMessage({ status: 400 })).toBe(ko.login.errorInvalid);
  });

  it('이메일 인증 전이면 메일함 안내', () => {
    expect(loginErrorMessage({ status: 400, code: 'email_not_confirmed' })).toBe(
      ko.login.errorNotConfirmed,
    );
  });

  it('연결 문제·서버 오류는 연결 안내', () => {
    expect(loginErrorMessage({ name: 'AuthRetryableFetchError' })).toBe(ko.login.errorNetwork);
    expect(loginErrorMessage({ status: 0 })).toBe(ko.login.errorNetwork);
    expect(loginErrorMessage({ status: 503 })).toBe(ko.login.errorNetwork);
  });

  it('너무 많이 시도하면 기다림 안내', () => {
    expect(loginErrorMessage({ status: 429 })).toBe(ko.login.errorTooMany);
  });

  it('그 밖의 오류는 일반 안내', () => {
    expect(loginErrorMessage({ status: 403 })).toBe(ko.login.errorUnknown);
    expect(loginErrorMessage({})).toBe(ko.login.errorUnknown);
  });
});
