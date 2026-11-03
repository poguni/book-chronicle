# 북크로니클 (Book Chronicle)

해마다 읽은 책을 책등이 꽂힌 책장으로 보여 주는 개인용 독서 연대기 웹 앱입니다.

- 배포 주소: https://poguni.github.io/book-chronicle/
- 구성: Svelte 5 + TypeScript + Vite(SPA) · GitHub Pages · Supabase · 알라딘 Open API
- 기획: [`docs/Book Chronicle PRD.md`](docs/Book%20Chronicle%20PRD.md) · 구현 계획: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) · 디자인: [`design/DESIGN.md`](design/DESIGN.md)

## 설치와 실행

Node.js 24 이상이 필요합니다.

```bash
npm install
cp .env.example .env      # Supabase 주소와 공개 키를 채웁니다(Phase 2부터 필요)
npm run dev               # http://localhost:5173/book-chronicle/
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드(`dist/`) |
| `npm run preview` | 빌드 결과 미리 보기 |
| `npm run check` | svelte-check + TypeScript 타입 검사 |
| `npm run lint` | ESLint + Prettier 검사 (`npm run format`으로 자동 정리) |
| `npm run test` | Vitest 단위 테스트 (`tests/unit`) |
| `npm run test:e2e` | Playwright E2E 테스트 (`tests/e2e`, 처음 한 번 `npx playwright install chromium`) |

## 배포

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 검사·테스트·빌드 후 GitHub Pages에 배포합니다. PR에서는 검사와 빌드만 합니다.

처음 한 번 GitHub 저장소에서 설정합니다.

1. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다.
2. Supabase를 연결할 때(Phase 2) **Settings → Secrets and variables → Actions → Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 추가합니다.
   - 이 두 값은 브라우저 코드에 들어가는 공개 값입니다. 보안은 로그인 + RLS로 지킵니다.
   - `service_role` 키와 알라딘 TTB 키는 저장소·Variables에 넣지 않습니다(Supabase secrets에만 둠).

## 주소 방식

GitHub Pages는 서버 주소 처리 기능이 없으므로 앱 안 주소는 해시 방식입니다.
`#/` 책장 · `#/compare` 연도 비교 · `#/recap/2026` 연말 회고 · `#/list` 전체 목록 · `#/import` 가져오기·백업 · `#/settings` 설정 · `#/login` 로그인
