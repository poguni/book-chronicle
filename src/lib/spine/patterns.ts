// 분야 → 책등 패턴 (PRD 6.4, DESIGN 6.3)
import type { Json } from '../database.types';

export type Pattern = 'hardcover' | 'paperback' | 'label';
export const PATTERNS: readonly Pattern[] = ['hardcover', 'paperback', 'label'];

/** 기본 매핑. 알라딘 2단계 분야 이름과 짧은 이름을 함께 둡니다. 여기 없는 분야는 라벨형(결정 0001-2). */
export const DEFAULT_PATTERN_MAP: Readonly<Record<string, Pattern>> = {
  인문학: 'hardcover',
  인문: 'hardcover',
  역사: 'hardcover',
  과학: 'hardcover',
  사회과학: 'hardcover',
  사회: 'hardcover',
  경제경영: 'hardcover',
  '소설/시/희곡': 'paperback',
  소설: 'paperback',
  장르소설: 'paperback',
  에세이: 'label',
  '예술/대중문화': 'label',
  예술: 'label',
  자기계발: 'label',
};

/** 책 꽂기 대화 상자에서 고를 수 있게 보여 줄 분야 */
export const SUGGESTED_CATEGORIES = [
  '소설/시/희곡',
  '에세이',
  '인문학',
  '역사',
  '과학',
  '사회과학',
  '경제경영',
  '자기계발',
  '예술/대중문화',
] as const;

export function isPattern(value: unknown): value is Pattern {
  return value === 'hardcover' || value === 'paperback' || value === 'label';
}

/** settings.pattern_map(jsonb)을 읽습니다. 이상한 값은 버립니다. */
export function parsePatternMap(json: Json | null | undefined): Record<string, Pattern> {
  const map: Record<string, Pattern> = {};
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    for (const [k, v] of Object.entries(json)) if (isPattern(v)) map[k] = v;
  }
  return map;
}

/** "외서 소설/시/희곡"처럼 앞에 붙은 외서 표시는 매핑할 때 떼고 봅니다(PRD 5.8). */
function baseCategory(category: string): string {
  return category.replace(/^외서\s*/, '').trim();
}

/**
 * 패턴 고르기 순서: 책마다 지정한 패턴 → 사용자 매핑 → 기본 매핑 → 라벨형
 */
export function patternFor(
  bookPattern: Pattern | null,
  category: string | null,
  userMap: Readonly<Record<string, Pattern>> = {},
): Pattern {
  if (bookPattern) return bookPattern;
  if (!category) return 'label';
  for (const key of [category.trim(), baseCategory(category)]) {
    const p = userMap[key] ?? DEFAULT_PATTERN_MAP[key];
    if (p) return p;
  }
  return 'label';
}
