# 북크로니클(Book Chronicle) 단계별 구현 계획

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-11-03 |
| 기준 문서 | PRD v0.9(`docs/Book Chronicle PRD.md`), DESIGN v1.3(`design/DESIGN.md`) |
| 최근 수정 | 2026-11-04: Phase 0 결과 반영(저장소 `book-chronicle`, Auth 설정 변경 없음, 함수 앱 주인 전용) |
| 새 저장소 위치 | `docs/IMPLEMENTATION_PLAN.md` |
| 구현 도구 | Claude Code (작업 규칙은 저장소 루트 `CLAUDE.md`) |

## 0. 이 문서 사용법
- Phase는 **순서대로** 진행합니다. 각 Phase는 "완료 기준"을 모두 통과해야 끝납니다.
- 작업할 때마다 체크박스(`- [ ]` → `- [x]`)를 갱신합니다.
- Claude Code에 작업을 맡길 때는 각 Phase 끝의 **시작 프롬프트 예시**를 그대로 쓰거나 고쳐 씁니다.
- 한 Phase 안에서도 작업이 크면 여러 세션으로 나눕니다. 세션을 시작할 때 "IMPLEMENTATION_PLAN.md에서 Phase N의 남은 항목부터 진행해 줘"라고 말하면 됩니다.

### PRD 마일스톤과의 관계
| Phase | 이름 | PRD 마일스톤 | 핵심 결과 |
|---|---|---|---|
| 0 | 기존 앱 분석과 준비 | M0 | 기존 앱 분석 메모, 새 저장소 |
| 1 | 프로젝트 골격과 배포 파이프라인 | M1 | 빈 앱이 GitHub Pages에 뜸 |
| 2 | Supabase 스키마·RLS·로그인 | M0·M1 | 로그인하면 내 데이터만 보임 |
| 3 | 앱 셸과 디자인 시스템 | M1 | 3단 레이아웃, 서재 테마, 토큰 |
| 4 | 책장 핵심: 책 입력과 생성형 책등 | M1 | 직접 입력한 책이 책장에 꽂힘 (**MVP**) |
| 5 | 알라딘 검색과 표지 | M2 | 검색 등록, 표지 저장, 팔레트 자동 추출 |
| 6 | 꺼내 보기와 상세 패널 | M2 | 책을 누르면 표지로 돌아서고 기록이 열림 |
| 7 | CSV 가져오기와 백업 | M3 | 과거 기록 이전, JSON·CSV 백업 |
| 8 | 연도 비교와 연말 회고 | M4 | 비교 그래프, 그해의 책, 회고 카드 PNG |
| 9 | 테마·반응형·마무리 | M5 | 종이 테마, 표지 질감, 스마트폰, 점검 |

### 공통 완료 기준 (모든 Phase)
- `npm run check`, `npm run lint`, `npm run test`가 통과합니다.
- 새로 만든 계산 로직에는 단위 테스트가 있습니다.
- 화면을 바꿨다면 1440px과 390px 폭에서 확인했습니다(가로 스크롤 없음).
- 비밀 값(`service_role` 키, TTB 키, `.env`)이 커밋에 없습니다.
- 이 문서의 체크박스와, 필요하면 `docs/decisions/`를 갱신했습니다.

---

## Phase 0. 기존 앱 분석과 준비
**목표**: 공유할 Supabase 프로젝트의 현재 상태를 파악하고, 새 저장소를 만든다.

### 0-1. 기존 독서 앱 분석 (기존 프로젝트 폴더에서 Claude Code로)
- [x] 알라딘 API 호출 위치와 방식 확인(브라우저 직접 호출 / Edge Function / 기타), TTB 키 보관 위치
- [x] 로그인 방식(이메일+비밀번호, 이메일 링크, 소셜 로그인)과 회원 가입 사용 여부
- [x] 사용 중인 스키마·테이블·버킷·Edge Function 이름 목록
- [x] Supabase Auth 설정: Site URL, Redirect URLs, 회원 가입 허용 여부
- [x] 결과를 `docs/decisions/existing-app-analysis.md`로 정리

> **시작 프롬프트 예시 (기존 앱 폴더에서)**
> 이 프로젝트를 분석해 줘. 코드는 고치지 말고 다음만 정리해 줘: (1) 알라딘 API를 어디서 어떻게 부르는지와 TTB 키가 어디에 있는지, (2) Supabase 로그인 방식과 회원 가입 기능 사용 여부, (3) 사용하는 Supabase 테이블·스키마·스토리지 버킷·Edge Function 이름, (4) 보안상 걱정되는 점. 결과를 existing-app-analysis.md 파일로 만들어 줘.

### 0-2. 새 저장소 준비
- [x] GitHub에 **공개** 저장소 `poguni/book-chronicle` 생성
- [x] 문서 배치: `docs/Book Chronicle PRD.md`·`.html`, `docs/IMPLEMENTATION_PLAN.md`, `docs/decisions/` (파일 이름은 지금 이름 유지)
- [x] 디자인 배치: `design/DESIGN.md`, `design/design-mockup-study.html`, `design/design-mockup-paper.html`
- [x] 루트에 `CLAUDE.md`, `.gitignore`(`.env*`, `supabase/.env`, `node_modules`, `dist`) 추가
- [ ] GitHub 저장소 설정에서 비밀 값 검사(secret scanning) 켜기
- [x] 로컬에 Node.js LTS, Supabase CLI 설치 확인(로컬 Supabase를 쓰려면 Docker도)
  - Node.js v24 확인. Supabase CLI는 Phase 1에서 개발 의존성(`npx supabase`)으로 설치. Docker 없음 → RLS 테스트는 원격 프로젝트에서 테스트 계정으로

### 0-3. 분석 결과에 따른 결정
- [x] 로그인 방식 확정 → PRD F0·5.3 갱신 (이메일 + 비밀번호)
- [x] 알라딘 함수: 새로 만들지 / 기존 함수 재사용할지 결정 → PRD 5.6 갱신 (새로 만듦, 앱 주인 사용자 ID만 허용)
- [x] 회원 가입 차단 가능 여부 결정(기존 앱이 가입을 쓰면 차단하지 않음) → 차단하지 않음

**완료 기준**: 분석 메모가 있고, 새 저장소에 문서·디자인·CLAUDE.md가 올라가 있으며, 로그인 방식과 알라딘 함수 방침이 정해졌다.

---

## Phase 1. 프로젝트 골격과 배포 파이프라인
**목표**: 빈 Svelte 5 앱이 GitHub Pages 주소에서 열린다.

- [x] Vite + Svelte 5 + TypeScript 프로젝트 생성(공식 `svelte-ts` 템플릿 구성을 기준으로 직접 작성), Svelte 5.57 확인
- [x] `vite.config.ts`에 `base: '/book-chronicle/'` 설정(저장소 이름과 같게)
- [x] Supabase CLI를 개발 의존성으로 설치(`npm i -D supabase`, 3.0.0)
- [x] TypeScript `strict`, `svelte-check`, ESLint + Prettier 설정
- [x] Vitest(단위 테스트), Playwright(E2E) 설정과 샘플 테스트 1개씩
- [x] `package.json` 스크립트: `dev`, `build`, `preview`, `check`, `lint`, `test`, `test:e2e` (+ `format`)
- [x] PRD 9장 폴더 구조대로 빈 폴더와 자리 파일 생성
- [x] 해시 라우터(아주 작은 자체 구현)와 빈 화면 7개(Login, Shelves, Compare, Recap, Import, Settings + 전체 목록 List)
- [x] `.env.example`(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [x] `.github/workflows/deploy.yml`: `main` push → 설치 → `check`·`lint`·`test` → 빌드 → GitHub Pages 배포 (PR에서는 검사·빌드만)
  - Supabase 주소·공개 키는 GitHub 저장소 **Variables**에 넣고 빌드 시 주입 (값 등록은 Phase 2에서 사용자가)
- [x] GitHub 저장소 설정 → Pages → 배포 소스를 "GitHub Actions"로 지정 (사용자)
- [x] **완료 확인(2026-11-04)**: 배포 주소에서 `#/compare` 화면 전환 확인
- [x] `README.md`: 설치, 실행, 배포 방법

**완료 기준**: `https://poguni.github.io/book-chronicle/`에서 빈 앱이 열리고, `#/compare` 같은 해시 주소로 화면이 바뀐다. CI가 통과한다.

> **시작 프롬프트 예시**
> CLAUDE.md와 docs/IMPLEMENTATION_PLAN.md의 Phase 1을 읽고 진행해 줘. Svelte 5 + TypeScript + Vite 프로젝트를 만들고, GitHub Pages 배포 워크플로까지 설정해 줘. 끝나면 체크박스를 갱신해 줘.

---

## Phase 2. Supabase 스키마·RLS·로그인
**목표**: 로그인한 본인만 자기 데이터를 읽고 쓸 수 있다.

### 2-1. 마이그레이션 (PRD 5.4, 5.5, 7장)
- [x] `supabase init`
- [x] `supabase link`(기존 공유 프로젝트) — 사용자가 `npx supabase login`, `npx supabase link --project-ref <ref>` 실행
- [x] `0001_bookchronicle_schema.sql`: 스키마, 테이블 5개(`books`, `readings`, `years`, `settings`, `aladin_cache`), 인덱스, `updated_at` 자동 갱신 트리거
- [x] `0002_bookchronicle_rls.sql`: 모든 테이블 RLS + 본인 행 정책, `authenticated`에만 권한, `aladin_cache`는 정책 없음
- [x] `0003_bookchronicle_storage.sql`: 비공개 버킷 `bookchronicle-covers`, 경로 첫 폴더 = `auth.uid()` 정책
- [x] **사용자 확인 후** `supabase db push` (2026-11-04, 3개 적용. RLS·권한·버킷 조회로 확인, 보안 점검은 `aladin_cache` 정책 없음(의도) 1건만)
- [x] Supabase 대시보드 → API 설정 → 노출 스키마(Exposed schemas)에 `bookchronicle` 추가 (사용자)
- ~~Auth → Redirect URLs 추가~~ → 하지 않음. 이메일 + 비밀번호 로그인은 돌아오는 주소가 필요 없음(Phase 0 결정)
- [x] `supabase gen types`로 `src/lib/database.types.ts` 생성

### 2-2. 앱 연결
- [x] `src/lib/supabase.ts`: 클라이언트 생성(`db: { schema: 'bookchronicle' }`, 세션 저장 이름 `bookchronicle-auth`)
- [x] `src/lib/auth.svelte.ts`: 세션 상태(`$state`), 로그인·로그아웃, 세션 변경 구독 (오류 문구 변환은 `authErrors.ts` + 단위 테스트)
- [x] 로그인 화면(DESIGN 7.4): 작은 책장 그림, 환영 문구, 이메일·비밀번호, 오류 문구
- [x] 로그인하지 않으면 모든 화면이 로그인 화면으로 이동, 로그인 후 원래 화면으로 복귀 (E2E, 가짜 인증 응답)
- [x] 첫 로그인 시 `settings` 행 자동 생성 (`src/lib/data/settings.ts`)
- [x] GitHub 저장소 **Repository** Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등록 (사용자)
- [x] 실제 계정으로 로컬 로그인 확인(2026-11-04): 원래 화면 복귀, `settings` 행 생성(201), 새로 고침 후 세션 유지, 로그아웃

### 2-3. 보안 테스트 (`npm run check:rls`, 원격에서 실행 — 2026-11-04 18개 모두 통과)
- [x] 로그아웃 상태(anon)로 `bookchronicle.books` 조회 → 0건 또는 거부 (`permission denied for schema`)
- [x] 다른 계정(테스트용)이 내 행을 볼 수 없음 확인 (조회·수정·삭제·사칭 추가·내 책에 기록 달기 모두 거부, 원격에서)
- [x] Storage: 다른 사용자 경로 접근 거부 확인 (내려받기·올리기·목록 거부)
- [x] 기존 앱이 평소대로 동작하는지 확인 (사용자, 2026-11-04)
- [x] 배포된 주소에서 로그인 확인 (`main` 합친 뒤, 사용자, 2026-11-04)
- [x] 저장소 전체 기록·배포 번들 비밀 값 점검: 비밀번호·service_role·TTB 키 없음 (2026-11-04)
- [x] **Phase 2 완료 (2026-11-04)**

**완료 기준**: 배포된 주소에서 로그인할 수 있고, 로그인한 계정으로 `books` 행을 넣고 읽을 수 있으며, 로그아웃 상태에서는 읽을 수 없다. 기존 앱에 영향이 없다.

> **시작 프롬프트 예시**
> Phase 2를 진행해 줘. PRD 5.4·5.5·7장대로 bookchronicle 스키마 마이그레이션을 만들고, 원격 적용(db push)은 내가 확인한 다음에 해 줘. public 스키마는 절대 건드리지 마.

---

## Phase 3. 앱 셸과 디자인 시스템
**목표**: 시안과 같은 3단 레이아웃과 서재 테마가 실제 앱에 적용된다.

- [x] `src/styles/tokens.css`, `themes.css`: DESIGN 3장의 토큰을 그대로 옮김(서재·종이 둘 다 정의, 우선 서재 적용) — 로그인 화면 때문에 Phase 2에서 먼저 함(+ `base.css`)
- [x] 글꼴 불러오기(나눔명조, 함렛, Noto Sans KR) — Phase 2에서 먼저 함
- [x] `App.svelte`: CSS Grid 3단(사이드바 232px / 본문 / 상세 패널 `clamp(360px, 26vw, 440px)`)
- [x] `Sidebar.svelte`: 로고, 책 꽂기 버튼, 메뉴 6개, 연도별 나이테(빈 상태), 보기 설정, 계정 영역(로그아웃)
- [x] 상단(제목, 올해 요약, 검색창, 정렬 칩) 자리 — `ShelfTop.svelte`
- [x] 아이콘 세트(DESIGN 10장)를 Svelte 컴포넌트로 — `Icon.svelte`, `BrandMark.svelte`
- [x] `src/lib/theme.ts`: `data-theme`, `data-spine` 적용(`system`이면 운영체제 설정 따름) — 상태는 `prefs.svelte.ts`, 지금은 localStorage에만 기억(Supabase 저장은 Phase 9)
- [x] `src/lib/i18n/ko.ts`: 화면 문구 모음
- [x] 공통 상태 표현 부품: 빈 상태, 불러오는 중, 연결 끊김 띠, 저장 상태 점(DESIGN 12장)
- [x] 확인: 단위 22개·E2E 17개 통과, 1440·1024·390px × 서재·종이 스크린샷 점검(가로 스크롤 없음). 결정은 `docs/decisions/0004-phase3-app-shell.md`

**완료 기준**: 로그인 후 시안과 같은 3단 화면(데이터는 비어 있음)이 서재 테마로 보이고, 1200px·900px 아래에서 서랍·상단 바로 바뀐다.

**Phase 3 완료 (2026-11-04)** — main 병합·배포

> **시작 프롬프트 예시**
> Phase 3을 진행해 줘. design/DESIGN.md와 design/mockup-study.html을 기준으로 토큰, 앱 셸, 사이드바를 Svelte 컴포넌트로 옮겨 줘. 시안의 CSS 치수와 클래스는 최대한 그대로 써 줘.

---

## Phase 4. 책장 핵심: 책 입력과 생성형 책등 (MVP)
**목표**: 직접 입력한 책이 연도별 책장에 생성형 책등으로 꽂힌다.

### 4-1. 데이터 계층
- [x] `src/lib/data/books.ts`, `readings.ts`, `years.ts`, `settings.ts`: 조회·추가·수정·삭제 (years는 조회만, 쓰기는 Phase 6·8) — 상태는 `library.svelte.ts`
- [x] 책 삭제 시 독서 기록(외래 키)과 Storage 파일 함께 삭제
- [x] `readings.year` = 완독일의 연도(완독일 없으면 null → "연도 미상") — DB 생성 열
- [x] 저장 상태(저장 중·저장됨·실패)를 계정 영역 점과 연결

### 4-2. 책등 계산 (순수 함수 + 단위 테스트)
- [x] `spine/patterns.ts`: 분야 → 패턴(하드커버·페이퍼백·라벨형), 사용자 매핑 반영
- [x] 책등 두께(쪽수 × 0.019cqw, 최소 8px·최대 9cqw), 높이(책 ID 고정 난수), 글자색(명암비) 계산 — `spine/geometry.ts`, `spine/color.ts`
- [x] 쪽수 없음 → 분야 평균 또는 280쪽 + 추정 표시(점선 테두리)

### 4-3. 화면
- [x] `Shelf.svelte`(연도 머리글, 책장, 선반 판, 폭을 넘으면 다음 줄), `Book.svelte`(책등 면 + 패턴 3종 + 그해의 책 끈)
- [x] 책장 홈: 최신 연도가 위, 연도별 권수·쪽수·그해의 책, 완독일순 정렬(색상순·분야순도)
- [x] 책 추가·수정 대화 상자(수동 입력): 제목, 저자, 쪽수, 분야, 완독일, 별점, 메모, 팔레트 3색 직접 고르기 (+ 출판사, 상태, 책등 무늬, 다시 읽은 기록 더하기, 지우기)
- [x] 사이드바 연도별 나이테(색 띠)와 올해 요약 숫자 연결 (+ 상세 패널 "한눈에")
- [x] 빈 연도 상태 문구
- [x] 확인: 단위 60개·E2E 35개 통과(가짜 DB로 30권·세 해, 줄 넘김, 고치기·지우기·다시 읽기, 저장 실패), 1440·1024·390px × 서재·종이 스크린샷 점검. 결정은 `docs/decisions/0005-phase4-manual-shelf.md`
- [x] 배포된 주소에서 책 꽂기 확인(앱 주인, 2026-11-04)
- [x] 앱 주인 의견 반영(결정 0006): 읽는 중·중단한 책 선반, 별 채우기 별점(0.5 단위), 분야 24개 + 직접 입력

**완료 기준**: 배포된 주소에서 로그인해 직접 입력한 30권이 3개 연도 책장에 꽂혀 보이고, 스마트폰에서 같은 책장이 보인다. (**MVP 완성**)

> **시작 프롬프트 예시**
> Phase 4를 진행해 줘. PRD F1·F4와 6.1·6.2·6.4·6.7, DESIGN 6장을 기준으로 책 입력과 생성형 책등을 구현해 줘. 책등 계산은 순수 함수로 분리하고 테스트를 붙여 줘.

---

## Phase 5. 알라딘 검색과 표지
**목표**: 제목·ISBN 검색으로 10초 안에 책을 등록하고, 표지에서 책등 색을 자동으로 뽑는다.

### 5-1. Edge Function `bookchronicle-aladin` (PRD 5.6, 5.7)
- [ ] Phase 0 결정에 따라 새로 작성 또는 기존 코드 재사용
- [ ] `search`(ItemSearch), `lookup`(ItemLookUp), `importCover`(표지 → 300px로 줄여 Storage 저장)
- [ ] JWT 검증 + **앱 주인 사용자 ID 확인**(`BOOKCHRONICLE_OWNER_ID`, 회원 가입이 열려 있으므로), CORS(GitHub Pages·localhost만), `coverUrl` 도메인 허용 목록
- [ ] 응답을 앱 형식으로 정리, `aladin_cache` 24시간 캐시
- [ ] 로컬 실행(`supabase functions serve`)으로 테스트
- [ ] **사용자 확인 후** `supabase secrets set ALADIN_TTB_KEY=... BOOKCHRONICLE_OWNER_ID=...`, `supabase functions deploy`
- [ ] 다른 계정(테스트용)으로 호출하면 거부되는지 확인

### 5-2. 앱
- [ ] `src/lib/aladin.ts`: 함수 호출, 시간 제한 8초, 1회 재시도, 실패 시 수동 입력 안내
- [ ] ISBN-10 → ISBN-13 변환(단위 테스트)
- [ ] 분야 매핑: `categoryName` 2단계, 외서 표시, 원본 저장(단위 테스트)
- [ ] 책 꽂기 대화 상자: 검색(300ms 디바운스), 결과 목록, 선택 시 자동 채움
- [ ] `workers/palette.worker.ts`: 64×64 축소 → 밝기·채도 필터 → k-평균(k=5) → 바탕·띠·강조 3색(PRD 6.3, 단위 테스트)
- [ ] 책등 미리 보기(앞뒤 책 사이에 꽂힌 모습)와 팔레트 후보 5색 수정
- [ ] 표지 표시: Storage에서 Blob으로 내려받아 표시, 화면 안 메모리 캐시
- [ ] "도서 DB 제공: 알라딘 인터넷서점" 표기

**완료 기준**: 제목 검색으로 10초 안에 한 권 등록, 표지가 Storage에 저장되고 생성형 책등이 표지와 어울린다. 로그아웃 상태에서는 함수를 호출할 수 없다.

> **시작 프롬프트 예시**
> Phase 5를 진행해 줘. docs/decisions/existing-app-analysis.md를 먼저 읽고 알라딘 Edge Function을 만들어 줘. 비밀 값 등록과 배포는 내가 확인한 다음에 해 줘.

---

## Phase 6. 꺼내 보기와 상세 패널
**목표**: 책을 누르면 앞으로 빠져나와 표지로 돌아서고, 상세 패널에 기록이 열린다.

- [ ] `Book.svelte`에 표지 면 추가(CSS 3D, 시안의 변환 값 그대로), 표지 없으면 간이 표지
- [ ] 마우스 올림 들림, 선택 시 꺼내 보기, 다른 책·Esc로 되돌리기
- [ ] 키보드: ←→ 이동, Enter·Space로 꺼내 보기
- [ ] `prefers-reduced-motion`·설정의 움직임 줄이기 → 회전 없이 강조만
- [ ] `DetailPanel.svelte`: 표지, 그해의 책 태그, 제목·저자·별점, 쪽수·완독·분야, 독서 기록 목록(재독), 메모(공책 줄), 기록 수정·그해의 책으로 버튼
- [ ] "2026 한눈에" 통계 카드, 월별 막대(`MonthBars.svelte`), 올해의 나이테(`YearRings.svelte`)
- [ ] 정렬: 완독일순·색상순·분야순(+ 별점순·쪽수순)
- [ ] 900~1199px 상세 서랍, 900px 미만 책장 아래 배치 + 스크롤

**완료 기준**: 시안(design/mockup-study.html)과 같은 상호작용이 실제 데이터로 동작하고, 키보드만으로도 책을 고를 수 있다.

---

## Phase 7. CSV 가져오기와 백업
**목표**: 과거 기록 200권을 10분 안에 옮기고, 언제든 백업·복원할 수 있다.

- [ ] `src/lib/csv.ts`: Papa Parse, UTF-8/CP949 판별(`TextDecoder('euc-kr')`), 날짜 형식 5종 인식(단위 테스트)
- [ ] 가져오기 화면: 파일 → 인코딩 확인 → 열 매핑(자동 추천) → 보충 조회 → 미리 보기 → 가져오기
- [ ] 보충 조회: ISBN 우선, 없으면 제목+저자, 동시 2건·200ms 간격, 진행 막대·멈추기
- [ ] 행 상태: 정상·보충됨·후보 여러 개·찾지 못함, 중복 처리(건너뛰기·기록만 추가·덮어쓰기)
- [ ] Goodreads CSV 프리셋(P1)
- [ ] `src/lib/backup.ts`: JSON 백업(표지 선택), 복원(덮어쓰기·합치기, `user_id` 교체, `schemaVersion` 변환), CSV 내보내기(UTF-8 BOM)
- [ ] `settings.last_backup_at` 갱신, 30일 경과 알림

**완료 기준**: 200행 CSV를 10분 안에 정리해 가져오고, JSON 백업 파일로 다른 계정(테스트)이나 초기화한 상태에 복원할 수 있다.

---

## Phase 8. 연도 비교와 연말 회고
**목표**: 여러 해를 비교하고, 그해의 책과 회고 카드를 만든다.

- [ ] `src/lib/stats.ts`: 권수, 총·평균 쪽수, 평균 별점, 최다 분야, 월별(누적), 분야 비중(상위 6 + 기타)(단위 테스트)
- [ ] 연도 비교 화면: 연도 칩(2~5개), 지표 카드(증감), 월별 선 그래프(누적 토글), 분야 100% 누적 막대, 표로 보기(Chart.js)
- [ ] 연도 색: 밝기 차이 + 선 모양으로 구분(색약 배려)
- [ ] 그해의 책 선정(1권, P1 최대 3권), 한 줄 회고(80자), 후보 제안, 12월 안내
- [ ] 회고 카드 편집기: 크기 3종(1080×1080, 1080×1350, 1080×1920), 테마 3종, 포함 항목 체크
- [ ] Canvas로 카드 그리기(표지는 Storage Blob 사용) → PNG 저장, Web Share API 공유

**완료 기준**: 2개 연도를 겹쳐 비교할 수 있고, 연말 회고 카드를 만들어 휴대폰 사진첩에 저장할 수 있다.

---

## Phase 9. 테마·반응형·마무리
**목표**: 두 테마와 세 화면 폭에서 완성도 있게 동작한다.

- [ ] 종이 테마 적용 점검(모든 화면), 테마 전환(서재·종이·시스템), 설정 Supabase 저장
- [ ] 표지 질감 모드: 등록 시 64×256 흐림 이미지 생성·Storage 저장, 기존 책 일괄 생성, 표지 없으면 생성형으로 대체
- [ ] 900px 미만 상단 바·접히는 메뉴(메뉴 안 스크롤), 900~1199px 서랍 최종 점검
- [ ] 지난해 접기(책등 색 띠), 강조 옵션, 읽는 중 표시(P1)
- [ ] 바코드 스캔(P1), 홈 화면 바로 가기 매니페스트·아이콘
- [ ] 설정 화면 완성: 분야 이름·패턴 매핑, 검색 연결 확인, 계정 표시·로그아웃
- [ ] 성능: 책 1,000권 테스트 데이터로 첫 표시 2초 이내, 화면에 보이는 표지부터 내려받기
- [ ] 접근성 점검: 키보드만으로 주요 흐름, 스크린 리더 라벨, 명암비
- [ ] E2E: 로그인 → 책 검색·등록 → 꺼내 보기 → 비교 → 회고 카드 → 백업
- [ ] 화면 점검표: 두 테마 × 1440·1024·390px × 주요 화면

**완료 기준**: 두 테마 × 세 화면 폭에서 주요 화면 점검을 통과하고, E2E 테스트가 통과한다. PRD 14장 성공 지표를 확인할 준비가 되었다.

---

## 부록 A. 단계별 확인이 필요한 작업 (사용자 승인)
| Phase | 작업 | 이유 |
|---|---|---|
| 0 | Supabase Auth 설정 확인 (완료, 변경 없음) | 기존 앱과 공유 |
| 2 | `supabase db push`, 노출 스키마 추가 | 공유 프로젝트 변경 |
| 2 | RLS 테스트용 계정 만들기 | 공유 Auth에 사용자 추가 |
| 5 | `supabase secrets set`, `supabase functions deploy` | 비밀 값·배포 |
| 모든 단계 | 데이터·테이블·버킷 삭제 | 되돌릴 수 없음 |

## 부록 B. 테스트 전략
| 종류 | 대상 | 도구 |
|---|---|---|
| 단위 | 책등 계산, 팔레트 선택, ISBN 변환, 분야 매핑, CSV 날짜 인식, 통계, 백업 변환 | Vitest |
| 컴포넌트 | Book, Shelf, DetailPanel의 상태별 렌더링 | Vitest + Testing Library |
| 보안 | RLS(로그아웃·다른 사용자 접근 거부), Storage 정책, 함수 JWT 검증 | 로컬 Supabase + 스크립트 |
| E2E | 로그인부터 회고 카드까지 주요 흐름 | Playwright(테스트 계정) |
| 화면 | 두 테마 × 세 화면 폭 스크린샷 비교 | Playwright 스크린샷 |

## 부록 C. 위험 체크포인트
| 시점 | 확인할 것 |
|---|---|
| Phase 2 종료 | 기존 앱이 정상 동작하는지, RLS 테스트 통과 |
| Phase 5 종료 | 알라딘 하루 호출 한도 사용량, Edge Function 호출 수 |
| Phase 7 종료 | 표지 Storage 사용량(무료 한도 대비) |
| Phase 9 종료 | Supabase 무료 한도 전체 사용량, 공개 저장소에 비밀 값 없음 |
