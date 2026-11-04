// 책등 글자색과 색상순 정렬에 쓰는 색 계산 (PRD 6.7, DESIGN 6.3)

export const INK_DARK = '#1F1A16';
export const INK_LIGHT = '#FBF7EF';

/** #RRGGBB → [r, g, b] (0~1). 잘못된 값이면 회색 */
function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m?.[1] ?? '808080';
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** WCAG 상대 휘도 */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 명암비 (1~21) */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** 바탕 위에서 밝은·어두운 글자 중 명암비가 더 높은 쪽 */
export function inkFor(background: string): string {
  return contrast(background, INK_DARK) >= contrast(background, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

/** 색상순 정렬 키: 색상환 각도(0~360). 무채색에 가까우면 400 이상으로 맨 뒤(밝기순). 시안과 같은 규칙 */
export function hueKey(hex: string): number {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.08) return 400 + luminance(hex) * 100;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}
