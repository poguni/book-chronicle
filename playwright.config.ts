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
    reuseExistingServer: !process.env.CI,
  },
});
