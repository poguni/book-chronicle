// 검색한 책 정보 → 책 꽂기 입력값 (결정 0006·0008). 화면과 분리한 순수 함수
import { CATEGORIES } from './spine/patterns';

type Category = (typeof CATEGORIES)[number];

/** "사피엔스 - 유인원에서 사이보그까지" → "사피엔스" (" - " 뒤 부제를 뗌) */
export function cleanTitle(title: string): string {
  const main = title.split(/\s+-\s+/)[0]?.trim() ?? '';
  return main || title.trim();
}

/**
 * 저자 정리. "유발 하라리 (지은이), 조현욱 (옮긴이)"처럼 역할이 붙어 있으면 지은이만 남기고,
 * 역할 표시가 하나도 없으면(카카오) 그대로 둡니다.
 */
export function cleanAuthor(author: string | null): string | null {
  if (!author) return null;
  const people = author
    .split(/\s*,\s*/)
    .map((p) => {
      const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(p);
      return m ? { name: m[1]!.trim(), role: m[2]!.trim() } : { name: p.trim(), role: '' };
    })
    .filter((p) => p.name);
  if (people.length === 0) return null;
  if (people.every((p) => !p.role)) return people.map((p) => p.name).join(', ');
  const writers = people.filter((p) => /지은이|글|저자|지음|원작/.test(p.role));
  const chosen = writers.length > 0 ? writers : [people[0]!];
  return chosen.map((p) => p.name).join(', ');
}

/** 제목에 이 낱말이 있으면 그 분야 (분류번호보다 먼저 봄: 주제가 좁은 분야) */
const TITLE_RULES: [RegExp, Category][] = [
  [/교육평가|교육측정/, '교육평가'],
  [/교육심리/, '교육심리'],
  [/파이썬|python/i, '파이썬'],
  [/바이브\s*코딩|vibe\s*coding/i, '바이브 코딩'],
  [/데이터\s*(분석|사이언스|과학)|빅데이터|머신\s*러닝|machine\s*learning/i, '데이터 분석'],
  [/통계/, '통계학'],
];

/** KDC 분류번호 앞자리 → 분야. 위에서부터 먼저 맞는 것 */
const KDC_RULES: [RegExp, Category][] = [
  [/^00[45]/, 'IT & 컴퓨터'], // 컴퓨터과학, 프로그래밍
  [/^05/, '학술지'], // 연속간행물
  [/^31/, '통계학'],
  [/^32/, '주식 & 경제'],
  [/^3/, '사회과학'],
  [/^413/, '통계학'], // 확률·통계
  [/^41/, '수학'],
  [/^43/, '화학'],
  [/^4[789]/, '생명과학'], // 생명과학, 식물학, 동물학
  [/^[45]/, '과학'], // 자연과학, 기술과학
  [/^66/, '사진 & 카메라'],
  [/^69/, '취미'], // 오락·운동
  [/^73/, '일본어'],
  [/^74/, '영어'],
  [/^7/, '언어'],
  [/^98/, '여행'], // 지리·여행
  [/^[129]/, '인문'], // 철학, 종교, 역사
];

/** 맞는 분야가 없을 때 KDC 주류 이름 */
const KDC_MAIN = [
  '총류',
  '철학',
  '종교',
  '사회과학',
  '자연과학',
  '기술과학',
  '예술',
  '언어',
  '문학',
  '역사',
];

/**
 * 책 분야 고르기: 제목 낱말 → KDC 분류번호 → (없으면) KDC 주류 이름(예: 문학) → null
 * 결과가 24개 분야 밖이면 대화 상자에서 "직접 입력"으로 보입니다.
 */
export function mapCategory(title: string | null, kdc: string | null): string | null {
  for (const [re, category] of TITLE_RULES) if (title && re.test(title)) return category;
  const code = kdc?.match(/^\d{3}/)?.[0];
  if (!code) return null;
  for (const [re, category] of KDC_RULES) if (re.test(code)) return category;
  return KDC_MAIN[Number(code[0])] ?? null;
}
