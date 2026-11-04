# CLAUDE.md — 북크로니클(Book Chronicle)

이 파일은 Claude Code가 이 저장소에서 작업할 때 **가장 먼저 읽는 안내서**입니다. 저장소 `poguni/book-chronicle`(로컬 폴더 `Book Chronicle`)의 루트에 둡니다.

## 1. 프로젝트 한눈에 보기
- **무엇**: 해마다 읽은 책을 책등이 꽂힌 책장으로 보여 주는 개인용 독서 연대기 웹 앱
- **누가**: 앱 주인 1명(로그인 필요, 이 앱에 회원 가입 화면 없음). 데스크톱 브라우저에서 기록하고 스마트폰으로 확인
- **구성**: Svelte 5 + TypeScript + Vite(SPA) → GitHub Pages 배포 / Supabase(Auth·Postgres·Storage·Edge Functions) / 카카오 책 검색 + 국립중앙도서관 ISBN 서지정보(알라딘 Open API는 2026-10-30 종료, 결정 0008)
- **오프라인 지원 없음**: 데이터 원본은 Supabase. IndexedDB·서비스 워커 캐시는 쓰지 않습니다.

## 2. 먼저 읽을 문서
작업을 시작하기 전에 관련 부분을 읽고, 문서와 다르게 구현해야 하면 **먼저 사용자에게 묻습니다.**

| 문서 | 내용 |
|---|---|
| `docs/Book Chronicle PRD.md` | 제품 기획서(다른 문서의 `docs/PRD.md`는 이 파일). 기능(4장), Supabase 설계(5장), 책등 규칙(6장), 데이터 모델(7장), 폴더 구조(9장) |
| `docs/IMPLEMENTATION_PLAN.md` | 단계별(Phase) 구현 계획과 체크리스트. **현재 Phase를 확인하고 그 범위만 작업** |
| `design/DESIGN.md` | 디자인 토큰, 레이아웃, 컴포넌트, 모션, 상태 표현, Svelte 구현 대응표(13장) |
| `design/design-mockup-study.html`, `design/design-mockup-paper.html` | 책장 홈·로그인 화면 시안(서재·종이 테마). 화면 구현의 기준(다른 문서의 `design/mockup-*.html`은 이 파일) |
| `docs/decisions/` | 결정 기록(`0001-initial-decisions.md`), 기존 독서 앱 분석 메모(`existing-app-analysis.md`). **PRD·DESIGN과 다르면 결정 기록이 우선** |

## 3. 자주 쓰는 명령
```bash
npm install                 # 의존성 설치
npm run dev                 # 개발 서버 (http://localhost:5173/book-chronicle/)
npm run build               # 배포용 빌드 (dist/)
npm run preview             # 빌드 결과 미리 보기
npm run check               # svelte-check + TypeScript 타입 검사
npm run lint                # ESLint + Prettier 검사 (npm run format으로 자동 정리)
npm run test                # Vitest 단위 테스트
npm run test:e2e            # Playwright E2E 테스트
```
```bash
npx supabase functions deploy bookchronicle-books --use-api --no-verify-jwt   # Edge Function 배포 (사용자 확인 후)
npm run check:books                                    # 배포 후 원격 점검
npx supabase gen types typescript --remote --schema bookchronicle > src/lib/database.types.ts
npx supabase db push --remote --dry-run                # 원격에 적용될 마이그레이션 목록만 확인
npx supabase db push --remote                          # 마이그레이션을 원격 DB에 적용 (사용자 확인 후에만)
npx supabase db query --remote --read-only "<SQL>"     # 원격 읽기 전용 조회
```
- Supabase CLI는 개발 의존성(3.x)이라 `npx supabase`로 실행합니다. 3.x는 기본 대상이 로컬 DB이므로 원격에는 `--remote`를 붙입니다.
- `supabase login`·`link`는 대화형이라 `!`가 아닌 별도 터미널에서 실행합니다(사용자).
```bash
```
- 작업을 마치기 전에 `npm run check`, `npm run lint`, `npm run test`를 돌리고 결과를 보고합니다.

## 4. 폴더 구조 요약 (자세히는 PRD 9장)
```
docs/        기획·문서 (PRD, 구현 계획, 결정 기록)
design/      디자인 가이드와 시안
src/pages/   화면 단위 (Login, Shelves, Compare, Recap, Import, Settings)
src/components/  재사용 부품 (Sidebar, Shelf, Book, DetailPanel, ...)
src/lib/     supabase.ts, auth.ts, theme.ts, data/, bookApi.ts, spine/, stats.ts, csv.ts, backup.ts
src/styles/  tokens.css(공통 토큰), themes.css(서재·종이)
supabase/migrations/  DB 스키마·RLS·Storage 정책 (SQL)
supabase/functions/bookchronicle-books/  도서 정보 프록시(카카오·국립중앙도서관)
```

## 5. 절대 규칙 (보안·공유 프로젝트)
이 Supabase 프로젝트는 **기존 독서 앱과 함께 쓰는 공유 프로젝트**이고, GitHub 저장소는 **공개**입니다.

1. **`bookchronicle` 스키마만 다룹니다.** `public` 스키마와 기존 앱의 테이블·버킷·함수는 읽지도, 고치지도, 지우지도 않습니다.
2. SQL에는 항상 스키마를 명시합니다(`bookchronicle.books`). 버킷은 `bookchronicle-covers`, 함수 이름은 `bookchronicle-`로 시작합니다.
3. **모든 테이블과 버킷에 RLS를 켜고** "본인 행만(`user_id = (select auth.uid())`)" 정책을 마이그레이션에 함께 넣습니다. RLS 없는 테이블을 만들지 않습니다.
4. 브라우저 코드에는 Supabase 주소와 공개 키(anon 또는 publishable 키)만 씁니다. **`service_role`(비밀) 키와 도서 API 키(카카오 REST 키, 국립중앙도서관 인증키)는 저장소·브라우저 코드·로그에 절대 넣지 않습니다.** 도서 API 키는 `supabase secrets`에만 둡니다.
5. `.env`, `supabase/.env`, `.dev.vars` 같은 파일은 커밋하지 않습니다. 커밋 전에 `git diff --staged`에 비밀 값이 없는지 확인합니다.
6. 아래 작업은 **반드시 사용자에게 먼저 확인**합니다.
   - `supabase db push` 등 원격 DB에 변경을 적용하는 명령
   - Auth 설정 변경(사이트 주소, 회원 가입 허용, 이메일 템플릿) — 기존 앱에 영향을 줌
   - 데이터·테이블·버킷 삭제, `drop`, `truncate`
   - Edge Function 배포, 비밀 값 등록
7. `supabase db reset`은 로컬 개발 DB에서만 씁니다. 원격 프로젝트에는 쓰지 않습니다.

## 6. 코드 규칙

### Svelte 5
- **runes 문법만** 씁니다: `$state`, `$derived`, `$effect`, `$props`, `$bindable`.
- 예전 문법(`export let`, `$:` 반응 구문, `on:click`)은 쓰지 않습니다. 이벤트는 `onclick={...}` 속성으로 씁니다.
- 컴포넌트는 화면(`src/pages`)과 부품(`src/components`)으로 나누고, 데이터 접근은 `src/lib/data/`를 통해서만 합니다(컴포넌트에서 `supabase.from(...)`을 직접 부르지 않음).
- 앱 안 주소는 해시 방식(`#/`, `#/compare`, `#/recap/2026`)입니다. GitHub Pages 때문입니다.

### TypeScript
- `strict` 모드. `any`를 쓰지 않습니다(불가피하면 이유를 주석으로).
- DB 타입은 `supabase gen types`로 만든 `src/lib/database.types.ts`를 씁니다. 스키마를 바꾸면 타입도 다시 생성합니다.
- 계산 로직(책등 두께, 팔레트 선택, 통계, CSV 날짜 인식, ISBN 변환)은 화면과 분리한 순수 함수로 만들고 단위 테스트를 붙입니다.

### 스타일
- 색·글꼴·간격은 `src/styles/tokens.css`, `themes.css`의 **CSS 변수만** 씁니다. 컴포넌트에 색상값을 직접 쓰지 않습니다. 예외: 책등 색은 책 데이터(팔레트)에서 옵니다.
- 테마는 `<html data-theme="study|paper">`, 책등 스타일은 `<html data-spine="generated|texture">`로 바꿉니다.
- 시안 HTML의 CSS(클래스 이름, 치수, 3D 변환)를 최대한 그대로 옮깁니다. 시안의 `innerHTML` 렌더링 방식은 따라 하지 않습니다.
- 레이아웃 기준: 1440×900 데스크톱 3단, 1200px·900px에서 반응형 전환(DESIGN 5장). 390px에서 가로 스크롤이 생기면 안 됩니다.

### 접근성
- 책등은 `<button>` + `aria-label`(제목, 저자, 쪽수, 완독 연월) + `aria-pressed`. 키보드 ←→ 이동, Enter로 꺼내 보기.
- 아이콘만 있는 버튼에는 `aria-label`. 입력창에는 `<label>`.
- `prefers-reduced-motion: reduce`이면 회전 애니메이션을 끕니다.
- 글자 명암비 4.5:1 이상.

## 7. 화면 문구 규칙
- 화면 문구는 **한국어 존댓말**, 짧고 다정하게 씁니다(예: "이 해의 첫 책을 꽂아 볼까요?").
- 한글 맞춤법과 띄어쓰기를 지킵니다. 숫자는 `toLocaleString('ko-KR')`로 표기(4,967쪽).
- 오류 문구는 탓하지 않고 다음 행동을 알려 줍니다(예: "검색이 잠시 안 돼요. 직접 입력할 수 있어요").
- 화면 문구는 한곳(`src/lib/i18n/ko.ts`)에 모읍니다.
- 도서 검색 데이터를 쓰는 화면에는 출처("도서 정보: 카카오 책 검색 · 국립중앙도서관")를 표기합니다.

## 8. 작업 방식
1. `docs/IMPLEMENTATION_PLAN.md`에서 현재 Phase와 다음 체크 항목을 확인합니다.
2. 관련 PRD·DESIGN 절을 읽고, 큰 작업이면 짧은 계획을 먼저 말합니다.
3. 작은 단위로 구현하고, 테스트와 검사를 돌립니다.
4. 화면을 바꿨으면 개발 서버에서 1440px과 390px 폭으로 확인합니다(가능하면 Playwright 스크린샷).
5. 끝나면 구현 계획의 체크박스를 갱신하고, 결정한 내용이 있으면 `docs/decisions/`에 짧게 남깁니다.
6. PRD·DESIGN과 달라진 점이 생기면 문서도 함께 고치자고 제안합니다(임의로 크게 바꾸지 않음).

## 9. Git 규칙
- 기본 브랜치는 `main`이며, `main`에 올라가면 GitHub Actions가 GitHub Pages로 배포합니다.
- 별도 브랜치를 만들지 않고 `main`에 바로 커밋합니다(2026-11-04 앱 주인 결정). 그래서 커밋 전에 `npm run check`·`lint`·`test`가 **종료 코드 0**인지 꼭 확인합니다(실패하면 배포가 멈춤).
- 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지 한 줄 요약 + 필요하면 본문.
- 사용자가 요청할 때만 push·PR을 만듭니다.

## 10. 정해진 것과 아직 정해지지 않은 것
정해진 것(2026-11-04, Phase 0)
- 로그인은 **이메일 + 비밀번호**. 소셜 로그인 없음
- 기존 앱이 회원 가입을 쓰므로 **회원 가입은 막지 않음**. Auth 설정(Site URL·Redirect URLs)은 바꾸지 않음
- Edge Function `bookchronicle-books`(처음엔 `bookchronicle-aladin`)는 함수 안에서 로그인 확인 + 앱 주인 사용자 ID(`BOOKCHRONICLE_OWNER_ID`)만 허용 (`verify_jwt = false`, 결정 0007)
- 기존 앱 자원: `public.books`, `public.categories`, 버킷 `book-covers`. 건드리지 않음
- 배포 주소 `https://poguni.github.io/book-chronicle/`, Vite `base: '/book-chronicle/'`

아직 정해지지 않은 것 (작업 전 확인)
- 회고 카드 기본 항목, 분야별 기본 책등 패턴은 PRD의 제안값으로 진행합니다.
