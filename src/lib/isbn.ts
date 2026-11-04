// ISBN 다루기 (PRD F2): ISBN-10은 ISBN-13으로 바꿔 저장합니다.

function digitsOnly(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

function isbn13Check(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function validIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
  return sum % 11 === 0;
}

/** ISBN-10 → ISBN-13 (978 붙이고 검사 숫자 다시 계산) */
export function isbn10to13(isbn10: string): string | null {
  const s = digitsOnly(isbn10);
  if (!validIsbn10(s)) return null;
  const first12 = `978${s.slice(0, 9)}`;
  return `${first12}${isbn13Check(first12)}`;
}

/** 입력이 올바른 ISBN이면 ISBN-13으로, 아니면 null. 하이픈·띄어쓰기는 무시 */
export function toIsbn13(input: string): string | null {
  const s = digitsOnly(input);
  if (/^97[89]\d{10}$/.test(s)) return isbn13Check(s.slice(0, 12)) === Number(s[12]) ? s : null;
  if (s.length === 10) return isbn10to13(s);
  return null;
}
