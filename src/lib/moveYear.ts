// 다른 해 책장으로 끌어 옮기기 (결정 0016): 완독일 고치기 계산

const pad = (n: number) => String(n).padStart(2, '0');

/** 그해에 있는 날인지 (윤년 2월 29일 포함) */
function existsIn(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * 옮길 해의 완독일 제안: 월·일은 그대로 두고 연도만 바꿉니다. 그해에 없는 날(2월 29일)은 28일로.
 * 완독일이 없으면(연도 미상) 오늘의 월·일을 씁니다.
 */
export function movedDate(finishedAt: string | null, year: number, today: Date): string {
  const m = finishedAt ? /^\d{4}-(\d{2})-(\d{2})$/.exec(finishedAt) : null;
  const month = m ? Number(m[1]) : today.getMonth() + 1;
  let day = m ? Number(m[2]) : today.getDate();
  while (day > 28 && !existsIn(year, month, day)) day--;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** YYYY-MM-DD 꼴의 실제 날짜이고 그해 안인지 */
export function dateInYear(date: string, year: number): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return y === year && existsIn(y, mo, d);
}
