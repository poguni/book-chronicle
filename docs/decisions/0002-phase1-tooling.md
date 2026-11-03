# 0002. Phase 1 도구 선택

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |

- **TypeScript는 6.0(`~6.0.3`)** 을 씁니다. 7.0이 나와 있지만, Vite 공식 `svelte-ts` 템플릿이 6.0을 쓰고 `typescript-eslint`가 `<6.1.0`까지만 지원합니다. 올릴 때는 두 도구의 지원 범위를 먼저 확인합니다.
- 주요 버전: Svelte 5.57, Vite 8, Vitest 5, ESLint 10(flat config), Playwright 1.64, Supabase CLI 3.0(개발 의존성, `npx supabase`로 실행).
- **해시 라우터는 직접 만듭니다**(`src/lib/route.ts` 순수 함수 + `src/lib/router.svelte.ts`). 화면이 7개뿐이라 라이브러리가 필요 없습니다. 알 수 없는 주소는 책장 홈으로 보냅니다.
- **테스트 위치**: 단위 테스트는 `tests/unit/*.test.ts`(Vitest), E2E는 `tests/e2e/*.spec.ts`(Playwright). E2E는 빌드 후 `vite preview`(포트 4173)에서 1440px·390px 두 폭으로 돌립니다.
- **Prettier는 코드만 정렬**합니다. `docs/`, `design/`, `*.md`는 사람이 관리하므로 제외합니다.
- **ESLint는 `supabase/`를 제외**합니다. Edge Function은 Deno 환경이라 Phase 5에서 따로 설정합니다.
- `npm audit`의 moderate 경고(deepmerge, minimatch)는 개발 도구 의존성에서 나오며, 배포 결과물(`dist/`)에는 들어가지 않습니다.
