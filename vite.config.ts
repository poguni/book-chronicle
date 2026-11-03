import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// GitHub Pages 주소(https://poguni.github.io/book-chronicle/)에 맞춰 base를 저장소 이름으로 둡니다.
export default defineConfig({
  base: '/book-chronicle/',
  plugins: [svelte()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
