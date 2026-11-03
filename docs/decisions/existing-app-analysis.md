# 기존 독서 앱(DeliciousLibrary) 분석 메모

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-11-04 |
| 분석 대상 | 로컬 폴더 `DeliciousLibrary`(Next.js 16 + React 19), Supabase 프로젝트 `DeliciousLibrary` |
| 분석 방법 | 코드 읽기(수정 없음), Supabase MCP로 Edge Function 목록 조회 |
| 상태 | 완료. DB 조회는 MCP의 DB 인증 오류로 실패해, 테이블·버킷·Auth 설정은 앱 주인이 대시보드에서 확인(2026-11-04) |

## 1. 알라딘 API 호출 방식
- **브라우저가 아니라 Next.js 서버 API 라우트**(`/api/books`)에서 알라딘 `ItemLookUp`(ISBN 조회)만 호출합니다. 제목 검색(`ItemSearch`)은 쓰지 않습니다.
- 알라딘에서 찾지 못하면 Open Library API로 대체 조회합니다.
- TTB 키는 Next.js 서버 환경 변수에 있습니다(이름에 `NEXT_PUBLIC_` 접두사가 붙어 있으나, 현재는 서버 코드에서만 참조).
- **Supabase Edge Function은 없습니다**(조회 결과 0개).

→ **결정**: 북크로니클은 Edge Function `bookchronicle-aladin`을 **새로 만듭니다**(PRD 5.6 그대로). 재사용할 기존 함수가 없습니다. TTB 키는 같은 키를 `supabase secrets`에 등록하며, 하루 호출 한도를 기존 앱과 나눠 씁니다.

## 2. 로그인 방식과 회원 가입
- **이메일 + 비밀번호**(`signInWithPassword`)와 **Google 소셜 로그인**(`signInWithOAuth`)을 함께 씁니다.
- **회원 가입을 사용합니다**(`signUp`, 이메일 인증 필요). 가입 후 관리자 승인 절차(`user_metadata.approved`)가 있는 **여러 사용자용 앱**입니다.
- 세션은 `sessionStorage`에 저장합니다(브라우저를 닫으면 로그아웃).

→ **결정**
- Supabase Auth의 **회원 가입 차단은 하지 않습니다**(기존 앱이 가입을 씀).
- 그래서 누구나 가입해 `authenticated` 역할을 얻을 수 있다고 가정하고 설계합니다.
  - DB·Storage: RLS "본인 행만"으로 다른 사람의 데이터는 보호됩니다(다른 가입자는 빈 책장만 봄).
  - Edge Function: JWT 검증에 더해 **앱 주인 사용자 ID만 허용**하는 검사를 넣어 TTB 키 한도를 지킵니다(허용 ID는 Supabase 비밀 값으로 둠).
- 북크로니클 로그인 방식: **이메일 + 비밀번호로 확정**합니다. 앱 주인이 기존 앱에서 이 방식으로 접속하고 있습니다. Google 로그인은 넣지 않습니다.

## 3. 사용 중인 Supabase 자원 이름 (코드 기준)
| 종류 | 이름 | 비고 |
|---|---|---|
| 스키마 | `public` | `bookchronicle` 스키마와 겹치지 않음 |
| 테이블 | `public.books`, `public.categories` | 북크로니클은 `bookchronicle.books`(다른 스키마)라 충돌 없음 |
| Storage 버킷 | `book-covers` | 공개 URL(`getPublicUrl`) 사용 → 공개 버킷으로 추정. `bookchronicle-covers`와 겹치지 않음 |
| Edge Function | 없음 | |
| Auth 메타데이터 | `user_metadata.approved`, `role`, `library_name` | 북크로니클은 읽지도 쓰지도 않음 |

### 대시보드 확인 결과 (2026-11-04)
- 테이블: `books`, `categories`. 버킷: `book-covers`. 코드와 일치하고, 코드에 없는 자원은 없습니다.
- Auth Site URL: `http://localhost:3000`. Redirect URLs: 없음.
  - 북크로니클은 이메일 + 비밀번호 로그인만 쓰고, 메일 링크나 소셜 로그인으로 돌아오는 주소가 필요 없습니다. 그래서 **Site URL과 Redirect URLs를 바꾸지 않아도 됩니다.**
  - 나중에 비밀번호 재설정 메일 같은 기능을 넣을 때만 Redirect URLs 추가를 검토합니다(앱 주인 확인 후).

## 4. 이름 충돌 점검
`bookchronicle` 스키마, `bookchronicle-covers` 버킷, `bookchronicle-aladin` 함수는 모두 기존 자원과 겹치지 않습니다.

## 5. 보안 참고
- 기존 앱 코드에서 보안상 점검이 필요한 부분을 발견해 앱 주인에게 따로 전달했습니다.
- 공개 저장소이므로 세부 내용은 여기에 적지 않습니다.
- 북크로니클은 기존 앱 코드를 재사용하지 않으므로 직접 영향은 없습니다.
- 다만 같은 Supabase 프로젝트의 서비스 키가 기존 앱 서버에 있으므로, 기존 앱의 보안 수준이 공유 프로젝트 전체에 영향을 줍니다.
