import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'docs/',
      'design/',
      'playwright-report/',
      'test-results/',
      // Edge Function의 Deno 연결부(index.ts)만 뺍니다. 핵심 로직(handler.ts)은 함께 검사합니다.
      'supabase/.temp/',
      'supabase/functions/**/index.ts',
    ],
  },
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
  {
    rules: {
      // CLAUDE.md: any 금지
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
