# 0003. Phase 2 Supabase 스키마·로그인 결정

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |

## 스키마 (PRD 7장에서 더 엄격하게 한 부분)
- **`readings.year`는 생성 열**입니다(`extract(year from finished_at)`). 앱이 직접 넣지 않으므로 완독일과 연도가 어긋날 수 없습니다.
- **readings → books 외래 키를 `(book_id, user_id)`로 묶었습니다.** 다른 사용자의 책 ID를 알아도 그 책에 기록을 달 수 없습니다(외래 키 검사는 RLS를 거치지 않기 때문).
- 값 검사: 별점 0~5·0.5 단위, ISBN-13은 숫자 13자리, `years.book_of_year`는 최대 3권, 한 줄 회고 80자, `theme`·`spine_style`·`source`·`status`는 정해진 값만.
- 버킷 `bookchronicle-covers`: 비공개, 파일 최대 1MB, JPEG·WebP·PNG만.
- `storage.objects`는 기존 앱과 함께 쓰는 테이블이라, 정책 이름 앞에 `bookchronicle`을 붙이고 모든 정책을 `bucket_id`로 한정했습니다.
- `anon`에게서 스키마·테이블·함수 권한을 모두 회수했습니다. `aladin_cache`는 `service_role`만 접근합니다.

## 마이그레이션 적용
- Docker가 없어 로컬 DB로 미리 실행해 보지 못했습니다. 원격 적용은 `npx supabase db push --dry-run`으로 목록을 확인한 뒤, 사용자 승인을 받고 실행합니다.
- `supabase/config.toml`은 로컬 개발용입니다. `supabase config push`는 공유 프로젝트의 Auth 설정을 바꿀 수 있으므로 **쓰지 않습니다.**

## 로그인
- 공개 키는 Supabase가 권장하는 **publishable 키(`sb_publishable_...`)** 를 씁니다(환경 변수 이름은 `VITE_SUPABASE_ANON_KEY` 그대로).
- 세션 저장 이름을 `bookchronicle-auth`로 따로 둡니다. `poguni.github.io`나 `localhost`에 같은 Supabase 프로젝트를 쓰는 다른 앱이 있어도 세션이 섞이지 않습니다.
- 세션은 `localStorage`에 유지합니다(PRD F0: 기기마다 한 번만 로그인). 기존 앱은 `sessionStorage`를 쓰지만 따르지 않습니다.
- 로그인하지 않으면 주소와 상관없이 로그인 화면을 보여 주고, 주소(해시)는 그대로 두어 로그인 후 원래 화면으로 돌아갑니다.

## 테스트
- E2E는 진짜 Supabase 없이 돌립니다. 가짜 주소로 빌드하고, 인증·DB 요청을 Playwright로 가짜 응답으로 바꿉니다(CI에서도 그대로 동작).
- RLS·Storage 점검은 `npm run check:rls`(`scripts/check-rls.ts`)로 원격에서 합니다. 앱 주인 계정과 점검용 계정이 필요하며, 비밀번호는 `.env.test.local`(커밋 안 됨)에 둡니다.
- 디자인 토큰(`tokens.css`·`themes.css`)과 글꼴은 로그인 화면 때문에 Phase 3에서 앞당겨 만들었습니다. 기본 요소 스타일은 `src/styles/base.css`에 따로 두었습니다(PRD 9장에 없는 파일).
