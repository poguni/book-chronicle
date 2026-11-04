// 표지 팔레트 추출 (PRD 6.3). 64×64로 줄인 표지의 RGBA 픽셀을 받아 3색을 고릅니다.
// 순수 함수라 Web Worker(src/workers/palette.worker.ts)와 단위 테스트에서 함께 씁니다.
import { contrast } from './color';
import type { Palette } from './spineData';

type RGB = [number, number, number];

export type PaletteResult = { palette: Palette; candidates: string[] };

const K = 5;
const ITERATIONS = 12;

function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

/** HSL의 밝기·채도 (0~1) */
function lightSat([r, g, b]: RGB): { l: number; s: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { l, s };
}

/** 픽셀 고르기: 흰색·검은색에 가까운 것(밝기 5% 미만·95% 초과)과 테두리의 무채색을 뺍니다. */
export function usablePixels(rgba: ArrayLike<number>, width: number, height: number): RGB[] {
  const all: RGB[] = [];
  const kept: RGB[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if ((rgba[i + 3] ?? 255) < 128) continue; // 투명
      const px: RGB = [rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0];
      all.push(px);
      const { l, s } = lightSat(px);
      if (l < 0.05 || l > 0.95) continue;
      const border = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      if (border && s < 0.1) continue;
      kept.push(px);
    }
  }
  // 거의 흰 표지처럼 남는 것이 너무 적으면 전부 씁니다(무채색 그대로, PRD 6.3-4).
  return kept.length >= all.length * 0.05 ? kept : all;
}

function dist2(a: RGB, b: RGB): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** k-평균. 시작점은 밝기순으로 고르게 골라 늘 같은 결과가 나오게 합니다. */
export function kMeans(pixels: RGB[], k = K): { color: RGB; count: number }[] {
  if (pixels.length === 0) return [];
  const sorted = [...pixels].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const n = Math.min(k, sorted.length);
  let centers: RGB[] = Array.from({ length: n }, (_, i) => {
    const p = sorted[Math.floor(((i + 0.5) / n) * sorted.length)]!;
    return [...p] as RGB;
  });
  let assign = new Array<number>(pixels.length).fill(0);
  for (let iter = 0; iter < ITERATIONS; iter++) {
    assign = pixels.map((p) => {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, j) => {
        const d = dist2(p, c);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      });
      return best;
    });
    const sums = centers.map(() => [0, 0, 0, 0]);
    pixels.forEach((p, i) => {
      const s = sums[assign[i]!]!;
      s[0]! += p[0];
      s[1]! += p[1];
      s[2]! += p[2];
      s[3]! += 1;
    });
    centers = centers.map((c, j) => {
      const s = sums[j]!;
      return s[3] ? ([s[0]! / s[3], s[1]! / s[3], s[2]! / s[3]] as RGB) : c;
    });
  }
  const counts = centers.map(() => 0);
  for (const a of assign) counts[a]! += 1;
  return centers
    .map((color, j) => ({ color, count: counts[j]! }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** 강조색이 따로 없을 때 띠색을 밝게 또는 어둡게 */
function shift(color: RGB, amount: number): RGB {
  return color.map((v) => (amount > 0 ? v + (255 - v) * amount : v * (1 + amount))) as RGB;
}

export function extractPalette(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): PaletteResult | null {
  const clusters = kMeans(usablePixels(rgba, width, height));
  if (clusters.length === 0) return null;
  const withSat = clusters.map((c) => ({ ...c, ...lightSat(c.color), hex: toHex(c.color) }));

  // 바탕색: 픽셀 수 × (0.5 + 채도) 점수가 가장 높은 묶음
  const base = withSat.reduce((a, b) => (b.count * (0.5 + b.s) > a.count * (0.5 + a.s) ? b : a));
  const rest = withSat.filter((c) => c !== base);

  // 띠색: 바탕색과 밝기 차이가 가장 큰 묶음(명암비 2:1 이상을 먼저)
  const byLightGap = [...rest].sort((a, b) => Math.abs(b.l - base.l) - Math.abs(a.l - base.l));
  const band = byLightGap.find((c) => contrast(c.hex, base.hex) >= 2) ?? byLightGap[0] ?? undefined;
  const bandHex = band?.hex ?? toHex(shift(base.color, base.l > 0.5 ? -0.55 : 0.75));

  // 강조색: 나머지 중 채도가 가장 높은 묶음. 없으면 띠색을 조금 바꿔 만듦
  const accent = rest.filter((c) => c !== band).sort((a, b) => b.s - a.s)[0];
  const bandRgb = band?.color ?? shift(base.color, base.l > 0.5 ? -0.55 : 0.75);
  const accentHex =
    accent && accent.s > 0.15
      ? accent.hex
      : toHex(shift(bandRgb, lightSat(bandRgb).l > 0.5 ? -0.3 : 0.3));

  return {
    palette: { base: base.hex, band: bandHex, accent: accentHex },
    candidates: withSat.map((c) => c.hex),
  };
}
