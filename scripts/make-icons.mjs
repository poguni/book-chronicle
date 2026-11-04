// 홈 화면 아이콘 PNG 만들기 (결정 0014): public/icons/icon.svg → 크기별 PNG
// 실행: node scripts/make-icons.mjs (Playwright의 Chromium으로 그립니다)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf-8');
// 마스크 가능 아이콘: 둥근 모서리 없이 꽉 채우고, 동심원은 가운데 안전 영역(80%) 안에
const maskable = svg
  .replace('rx="112"', 'rx="0"')
  .replace('<g ', '<g transform="translate(256 256) scale(0.78) translate(-256 -256)" ');
const outputs = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-512.png', 512, maskable],
  ['apple-touch-icon.png', 180, maskable],
  ['favicon-32.png', 32, svg],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, source] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${source}`,
  );
  await page.screenshot({
    path: fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url)),
    omitBackground: true,
  });
  console.log('made', name);
}
await browser.close();
