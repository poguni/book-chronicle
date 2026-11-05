// 연도 비교 그래프 (PRD F5, 결정 0013). Chart.js에서 쓰는 부품만 등록해 크기를 줄이고,
// 연도 비교 화면에서만 동적으로 불러옵니다(책장 화면 번들에 들어가지 않음).
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);

export { Chart };
export type { ChartConfiguration };

/** 지금 테마의 색 토큰을 읽습니다(테마를 바꾸면 그래프를 다시 그림). */
export function chartTheme(el: Element = document.documentElement) {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    series: [1, 2, 3, 4, 5, 6, 7].map((i) => v(`--series-${i}`)),
    other: v('--series-other'),
    text: v('--text'),
    muted: v('--muted'),
    line: v('--line'),
    surface: v('--card'),
    accent: v('--accent'),
    font: v('--font-body') || 'sans-serif',
  };
}

/** #rrggbb에 투명도를 더합니다(연도별 추이에서 비교하지 않는 해를 옅게). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
