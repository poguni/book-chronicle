// 그해의 책 순위 (PRD F6 P1): 한 해에 최대 3권, 고른 순서가 1·2·3위
export const MAX_BOOKS_OF_YEAR = 3;

/**
 * 고르거나 빼기. 이미 있으면 빼고(아래 순위가 한 칸씩 올라옴), 없으면 맨 뒤에 더합니다.
 * 세 권이 다 찼으면 바꾸지 않고 full: true
 */
export function toggleRank(
  list: readonly string[],
  bookId: string,
): { list: string[]; full: boolean } {
  if (list.includes(bookId)) return { list: list.filter((id) => id !== bookId), full: false };
  if (list.length >= MAX_BOOKS_OF_YEAR) return { list: [...list], full: true };
  return { list: [...list, bookId], full: false };
}

/** 순위 올리기(-1)·내리기(+1). 끝에 있으면 그대로 */
export function moveRank(list: readonly string[], bookId: string, dir: -1 | 1): string[] {
  const i = list.indexOf(bookId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [...list];
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** 1부터 세는 순위(없으면 null) */
export function rankOf(list: readonly string[] | undefined, bookId: string): number | null {
  const i = list?.indexOf(bookId) ?? -1;
  return i < 0 ? null : i + 1;
}
