import { defineConfig, devices } from '@playwright/test';

// 배포와 같은 결과물을 확인하려고 빌드 후 미리 보기 서버에서 E2E를 돌립니다.
export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:4173/book-chronicle/',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/book-chronicle/',
    reuseExistingServer: false,
    // 진짜 Supabase 대신 아무도 듣지 않는 가짜 주소로 빌드합니다. 요청은 테스트에서 가짜 응답으로 바꿉니다.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54399',
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
    },
  },
});
