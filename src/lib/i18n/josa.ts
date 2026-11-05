// 받침에 따라 조사 고르기: 책 제목처럼 정해져 있지 않은 낱말 뒤에 씁니다.
// 한글은 마지막 글자의 받침으로, 숫자·영문은 읽는 소리(6 → 육, L → 엘)로 판단합니다.

type Pair = '을/를' | '은/는' | '이/가' | '으로/로';

/** 숫자를 읽었을 때의 끝소리 받침: 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔 */
const DIGIT_FINAL: Record<string, 'none' | 'rieul' | 'other'> = {
  '0': 'other',
  '1': 'rieul',
  '2': 'none',
  '3': 'other',
  '4': 'none',
  '5': 'none',
  '6': 'other',
  '7': 'rieul',
  '8': 'rieul',
  '9': 'none',
};
/** 영문 글자 이름이 받침으로 끝나는 것: L 엘, R 알 (ㄹ), M 엠, N 엔 */
const LETTER_FINAL: Record<string, 'rieul' | 'other'> = {
  l: 'rieul',
  r: 'rieul',
  m: 'other',
  n: 'other',
};

/** 마지막 글자(괄호·문장 부호는 건너뜀)의 받침: 없음 / ㄹ / 그 밖의 받침 */
function finalSound(word: string): 'none' | 'rieul' | 'other' {
  for (let i = word.length - 1; i >= 0; i--) {
    const ch = word[i]!;
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const jong = (code - 0xac00) % 28;
      return jong === 0 ? 'none' : jong === 8 ? 'rieul' : 'other';
    }
    if (ch in DIGIT_FINAL) return DIGIT_FINAL[ch]!;
    if (/[a-z]/i.test(ch)) return LETTER_FINAL[ch.toLowerCase()] ?? 'none';
  }
  return 'none';
}

/** 낱말에 맞는 조사. 예: josa('데미안', '을/를') → '을', josa('인문', '으로/로') → '으로' */
export function josa(word: string, pair: Pair): string {
  const [withFinal, withoutFinal] = pair.split('/') as [string, string];
  const s = finalSound(word);
  if (pair === '으로/로') return s === 'other' ? withFinal : withoutFinal;
  return s === 'none' ? withoutFinal : withFinal;
}
