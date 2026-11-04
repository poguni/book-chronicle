// 책등 크기 계산 (PRD 6.1·6.2, DESIGN 6.2, 결정 0001-1·3·4, 0009)

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
// 한 해 15권 안팎이 선반 절반쯤을 채우는 두께 (결정 0009). CSS의 --spine-k와 같은 값
export const SPINE_K = 0.012; // 쪽당 책장 폭의 %
export const SPINE_MIN_PX = 12;
export const SPINE_MAX_CQW = 6;
// 좁은 화면(휴대폰)에서도 제목이 들어가도록 쪽당 최소 두께와 최대 두께 하한(px)
export const SPINE_K_PX = 0.07;
export const SPINE_MAX_PX = 36;
export const SPINE_GAP_PX = 2;

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

/**
 * 실제 책등 두께(px) = clamp(12px, max(쪽수 × 0.012cqw, 쪽수 × 0.07px), max(6cqw, 36px)).
 * Book.svelte의 CSS와 같은 식. 넓은 화면은 책장 폭 비례, 좁은 화면은 px 하한이 정합니다.
 */
export function spineWidthPx(pages: number, shelfWidthPx: number): number {
  const cqw = shelfWidthPx / 100;
  const ideal = Math.max(pages * SPINE_K * cqw, pages * SPINE_K_PX);
  return Math.min(Math.max(SPINE_MIN_PX, ideal), Math.max(SPINE_MAX_CQW * cqw, SPINE_MAX_PX));
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

/** CSS --spine-hk(책등 높이 배율, px)와 같은 식: clamp(0.72px, 0.07vw, 0.98px) */
export function spineHk(viewportWidthPx: number): number {
  return Math.min(Math.max(0.72, viewportWidthPx * 0.0007), 0.98);
}

export type TitlePattern = 'hardcover' | 'paperback' | 'label';

/** 책등 제목 맞춤 결과. font: 글자 크기(px), cols: 세로 줄 수, maxHeight: 제목 상자 높이(px, 라벨 여백 포함) */
export type TitleFit = { font: number; cols: number; maxHeight: number; author: boolean };

export const TITLE_FONT_MAX = 12;
export const TITLE_FONT_MIN = 7;
const AUTHOR_FONT = 9;
const LINE = 1.15; // 제목 줄 간격(em) = 세로 줄 하나의 폭
const SLACK = 1.06; // 자간·줄바꿈 자리 여유
const LABEL_PAD = 12; // 라벨형 제목 상자의 위아래 안쪽 여백 합

/**
 * 세로쓰기에서 글자가 차지하는 길이(em). 옆으로 눕는 영문·숫자는 약 0.6em.
 * 한글·한자는 1.2em: Pretendard는 세로 글자 폭 표가 없어 글꼴 높이(약 1.19em)만큼 차지합니다.
 */
export function textEm(text: string): number {
  let em = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) em += 0.3;
    else if (ch.charCodeAt(0) < 0x0250) em += 0.6;
    else em += 1.2;
  }
  return em;
}

/** 패턴마다 제목 위·아래에 비워 두는 높이(px). Book.svelte의 여백과 맞춥니다. */
function reserve(pattern: TitlePattern, h: number, authorPx: number | null): number {
  if (pattern === 'hardcover') return 22 + 32;
  const top = pattern === 'paperback' ? 0.18 * h + 8 : 16 + LABEL_PAD;
  const bottom = authorPx === null ? 16 : (pattern === 'paperback' ? 22 : 12) + 4 + authorPx;
  return top + bottom;
}

/**
 * 제목이 책등에 모두 들어가도록 글자 크기와 세로 줄 수를 고릅니다(결정 0009).
 * 큰 글자부터 줄여 가며, 책등 폭에 들어가는 줄 수 안에 제목이 다 들어가면 그 크기를 씁니다.
 * 저자까지 넣으면 제목이 9px보다 작아질 때는 저자를 뺍니다(저자는 aria-label에 있음).
 * 가장 작은 글자로도 넘치면 7px로 두고 넘치는 부분만 잘립니다.
 */
export function fitTitle(
  title: string,
  author: string | null,
  pattern: TitlePattern,
  widthPx: number,
  heightPx: number,
): TitleFit {
  const em = textEm(title);
  const pad = pattern === 'label' ? LABEL_PAD : 0;
  const inner = widthPx - 3 - (pattern === 'label' ? 4 : 0); // 라벨 상자 좌우 여백 2px씩
  const tryFit = (avail: number): { font: number; cols: number } | null => {
    if (avail <= 0) return null;
    for (let font = TITLE_FONT_MAX; font >= TITLE_FONT_MIN; font -= 0.5) {
      const maxCols = Math.floor(inner / (font * LINE));
      if (maxCols < 1) continue;
      const cols = Math.max(1, Math.ceil((em * font * SLACK) / avail));
      if (cols <= maxCols) return { font, cols };
    }
    return null;
  };

  if (author && pattern !== 'hardcover') {
    const authorPx = Math.min(0.22 * heightPx, textEm(author) * AUTHOR_FONT);
    const avail = heightPx - reserve(pattern, heightPx, authorPx);
    const fit = tryFit(avail);
    if (fit && fit.font >= AUTHOR_FONT) return { ...fit, maxHeight: avail + pad, author: true };
  }
  const avail = Math.max(0, heightPx - reserve(pattern, heightPx, null));
  const fit = tryFit(avail);
  if (fit) return { ...fit, maxHeight: avail + pad, author: false };
  const cols = Math.max(1, Math.floor(inner / (TITLE_FONT_MIN * LINE)));
  return { font: TITLE_FONT_MIN, cols, maxHeight: avail + pad, author: false };
}
