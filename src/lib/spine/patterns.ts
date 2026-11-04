// 분야 → 책등 패턴 (PRD 6.4, DESIGN 6.3)
import type { Json } from '../database.types';

export type Pattern = 'hardcover' | 'paperback' | 'label';
export const PATTERNS: readonly Pattern[] = ['hardcover', 'paperback', 'label'];

/**
 * 앱 주인이 주로 읽는 분야 24개(2026-11-04 결정 0006). 책 꽂기 대화 상자의 분야 목록입니다.
 * 이 목록에 없는 분야는 "직접 입력"으로 적습니다.
 */
export const CATEGORIES = [
  '영어',
  '일본어',
  '언어',
  '통계학',
  '파이썬',
  '바이브 코딩',
  '데이터 분석',
  '수학',
  '과학',
  '생명과학',
  '화학',
  '여행',
  '사진 & 카메라',
  '교육평가',
  '교육심리',
  '사회과학',
  '인문',
  '교양',
  '취미',
  '만화',
  'IT & 컴퓨터',
  '주식 & 경제',
  '학술지',
  '논문',
] as const;

/**
 * 분야별 기본 책등 무늬. 학술·이론서는 하드커버, 실용·기술서와 가벼운 읽을거리는 페이퍼백,
 * 어학·여행·취미는 라벨형. 여기 없는 분야(직접 입력)는 라벨형(결정 0001-2).
 */
export const DEFAULT_PATTERN_MAP: Readonly<Record<string, Pattern>> = {
  통계학: 'hardcover',
  수학: 'hardcover',
  과학: 'hardcover',
  생명과학: 'hardcover',
  화학: 'hardcover',
  교육평가: 'hardcover',
  교육심리: 'hardcover',
  사회과학: 'hardcover',
  인문: 'hardcover',
  '주식 & 경제': 'hardcover',
  학술지: 'hardcover',
  논문: 'hardcover',
  파이썬: 'paperback',
  '바이브 코딩': 'paperback',
  '데이터 분석': 'paperback',
  'IT & 컴퓨터': 'paperback',
  교양: 'paperback',
  만화: 'paperback',
  영어: 'label',
  일본어: 'label',
  언어: 'label',
  여행: 'label',
  '사진 & 카메라': 'label',
  취미: 'label',
};

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
