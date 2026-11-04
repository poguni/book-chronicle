// 책등 크기 계산 (PRD 6.1·6.2, DESIGN 6.2, 결정 0001-1·3·4)

/** 책 ID로 만든 고정 난수(0 이상 정수). 같은 책은 늘 같은 값 */
export function hashId(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

/** 책등 높이 배수: 132 + 고정 난수 0~41 (× --spine-hk) */
export function spineHeight(id: string): number {
  return 132 + (hashId(id) % 42);
}

export const DEFAULT_PAGES = 280;
export const SPINE_K = 0.019; // 쪽당 책장 폭의 %
export const SPINE_MIN_PX = 8;
export const SPINE_MAX_CQW = 9;
export const SPINE_GAP_PX = 2;
/** 이보다 얇은 책등은 제목을 숨깁니다 */
export const TITLE_MIN_PX = 14;

/** 분야별 평균 쪽수 (쪽수를 아는 책만) */
export function categoryAveragePages(
  books: readonly { category: string | null; pages: number | null; pages_estimated: boolean }[],
): Map<string, number> {
  const sums = new Map<string, { total: number; n: number }>();
  for (const b of books) {
    if (!b.category || !b.pages || b.pages_estimated) continue;
    const s = sums.get(b.category) ?? { total: 0, n: 0 };
    s.total += b.pages;
    s.n += 1;
    sums.set(b.category, s);
  }
  return new Map([...sums].map(([k, s]) => [k, Math.round(s.total / s.n)]));
}

/** 책등 두께에 쓸 쪽수. 모르면 분야 평균, 그것도 없으면 280쪽으로 두고 추정으로 표시 */
export function effectivePages(
  book: { category: string | null; pages: number | null; pages_estimated: boolean },
  averages: ReadonlyMap<string, number>,
): { pages: number; estimated: boolean } {
  if (book.pages) return { pages: book.pages, estimated: book.pages_estimated };
  const avg = book.category ? averages.get(book.category) : undefined;
  return { pages: avg ?? DEFAULT_PAGES, estimated: true };
}

/** 실제 책등 두께(px) = clamp(8px, 쪽수 × 0.019cqw, 9cqw). CSS와 같은 식 */
export function spineWidthPx(pages: number, shelfWidthPx: number): number {
  const cqw = shelfWidthPx / 100;
  return Math.min(Math.max(SPINE_MIN_PX, pages * SPINE_K * cqw), SPINE_MAX_CQW * cqw);
}

/**
 * 책등을 선반 줄로 나눕니다. 한 줄 폭을 넘으면 다음 줄로(결정 0001-4).
 * 폭을 아직 모르면(0) 한 줄에 모두 둡니다. 반환값은 줄마다 책의 순번 목록
 */
export function packRows(widths: readonly number[], shelfWidthPx: number): number[][] {
  if (shelfWidthPx <= 0 || widths.length === 0) return [widths.map((_, i) => i)];
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  widths.forEach((w, i) => {
    const need = row.length === 0 ? w : used + SPINE_GAP_PX + w;
    if (row.length > 0 && need > shelfWidthPx + 0.5) {
      rows.push(row);
      row = [i];
      used = w;
    } else {
      row.push(i);
      used = need;
    }
  });
  rows.push(row);
  return rows;
}
