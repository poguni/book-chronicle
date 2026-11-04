// 연말 회고 카드 (PRD F7, 결정 0013): 배치·줄바꿈은 순수 함수, 그리기는 Canvas 2D
import { inkFor } from './spine/color';
import { packRows } from './spine/geometry';
import type { Palette } from './spine/spineData';

export const CARD_SIZES = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
} as const;
export type CardSize = keyof typeof CARD_SIZES;
export type CardTheme = 'study' | 'paper' | 'spine';
export type CardItems = {
  shelf: boolean;
  numbers: boolean;
  bookOfYear: boolean;
  oneLiner: boolean;
};

export type CardSpine = { pages: number; height: number; palette: Palette };
export type CardData = {
  year: number;
  books: number;
  pages: number;
  topCategory: string | null;
  spines: CardSpine[];
  bookOfYear: {
    title: string;
    author: string | null;
    palette: Palette;
    cover: CanvasImageSource | null;
  } | null;
  oneLiner: string | null;
};
export type CardLabels = {
  title: string;
  books: string;
  pages: string;
  booksLabel: string;
  pagesLabel: string;
  topLabel: string;
  boy: string;
  watermark: string;
};

type SectionKey = 'header' | 'shelf' | 'numbers' | 'boy' | 'oneLiner';

/**
 * 크기마다 정한 영역 높이(px). 스토리는 위아래 200px을 SNS 화면 글자 자리로 비워 둡니다.
 * lines: 한 줄 회고 최대 줄 수
 */
const SPEC: Record<
  CardSize,
  { padX: number; padY: number; footer: number; lines: number } & Record<SectionKey, number>
> = {
  square: {
    padX: 72,
    padY: 64,
    footer: 40,
    lines: 2,
    header: 150,
    shelf: 200,
    numbers: 116,
    boy: 210,
    oneLiner: 112,
  },
  portrait: {
    padX: 80,
    padY: 72,
    footer: 44,
    lines: 3,
    header: 170,
    shelf: 280,
    numbers: 140,
    boy: 260,
    oneLiner: 168,
  },
  story: {
    padX: 88,
    padY: 200,
    footer: 48,
    lines: 4,
    header: 200,
    shelf: 420,
    numbers: 160,
    boy: 320,
    oneLiner: 224,
  },
};

export type CardLayout = {
  width: number;
  height: number;
  padX: number;
  lines: number;
  sections: { key: SectionKey; y: number; h: number }[];
  footerY: number;
};

/**
 * 영역 배치: 넣을 영역만 위에서부터 쌓고, 남는 높이를 사이 간격(16~64px)으로 나눈 뒤 가운데 둡니다.
 * 그해의 책·한 줄 회고는 고른 항목이어도 내용이 없으면 뺍니다.
 */
export function cardLayout(
  size: CardSize,
  items: CardItems,
  has: { bookOfYear: boolean; oneLiner: boolean },
): CardLayout {
  const { w, h } = CARD_SIZES[size];
  const spec = SPEC[size];
  const keys: SectionKey[] = ['header'];
  if (items.shelf) keys.push('shelf');
  if (items.numbers) keys.push('numbers');
  if (items.bookOfYear && has.bookOfYear) keys.push('boy');
  if (items.oneLiner && has.oneLiner) keys.push('oneLiner');
  const top = spec.padY;
  const footerY = h - spec.padY - spec.footer;
  const avail = footerY - 24 - top;
  const sum = keys.reduce((n, k) => n + spec[k], 0);
  const gap = keys.length > 1 ? Math.min(64, Math.max(16, (avail - sum) / (keys.length - 1))) : 0;
  const total = sum + gap * (keys.length - 1);
  let y = top + Math.max(0, (avail - total) / 2);
  const sections = keys.map((key) => {
    const s = { key, y: Math.round(y), h: spec[key] };
    y += spec[key] + gap;
    return s;
  });
  return { width: w, height: h, padX: spec.padX, lines: spec.lines, sections, footerY };
}

/**
 * 글자 줄바꿈: 띄어쓰기에서 먼저 나누고, 한 낱말이 너무 길면 글자 단위로 나눕니다.
 * maxLines를 넘으면 마지막 줄 끝을 "…"로.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  const push = () => {
    lines.push(line);
    line = '';
  };
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) push();
    if (measure(word) <= maxWidth) {
      line = word;
      continue;
    }
    for (const ch of word) {
      if (measure(line + ch) > maxWidth && line) push();
      line += ch;
    }
  }
  if (line) push();
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1]!;
  while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

/** 가장 많이 쓰인 책등 바탕색 (책등 색 테마의 배경) */
export function dominantColor(spines: readonly CardSpine[], fallback = '#2F4F6F'): string {
  const count = new Map<string, number>();
  for (const s of spines) count.set(s.palette.base, (count.get(s.palette.base) ?? 0) + s.pages);
  let best = fallback;
  let max = 0;
  for (const [c, n] of count) if (n > max) [best, max] = [c, n];
  return best;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** 카드 테마 색 (서재·종이는 앱 테마 토큰과 같은 값) */
export function cardColors(theme: CardTheme, spines: readonly CardSpine[]) {
  if (theme === 'study')
    return {
      bg: '#1e1712',
      text: '#f3e9d7',
      muted: '#b9a88f',
      accent: '#d4a55a',
      shelf: '#2a2019',
      plank: '#6b4529',
    };
  if (theme === 'paper')
    return {
      bg: '#f7f4ee',
      text: '#1d2433',
      muted: '#5e6573',
      accent: '#2f4a7a',
      shelf: '#efe9de',
      plank: '#e4d5ba',
    };
  const bg = dominantColor(spines);
  const text = inkFor(bg);
  return {
    bg,
    text,
    muted: mix(text, bg, 0.3),
    accent: text,
    shelf: mix(bg, '#000000', 0.18),
    plank: mix(bg, '#000000', 0.4),
  };
}

const DISPLAY = '"Gowun Dodum", "Noto Sans KR", sans-serif';
const BODY = '"Noto Sans KR", sans-serif';

/** 카드에 쓰는 글꼴을 미리 불러 둡니다(캔버스는 글꼴이 없으면 기본 글꼴로 그림). */
export async function loadCardFonts(): Promise<void> {
  if (!('fonts' in document)) return;
  await Promise.all([
    document.fonts.load(`64px ${DISPLAY}`, '가나다2026'),
    document.fonts.load(`400 28px ${BODY}`, '가나다'),
    document.fonts.load(`700 28px ${BODY}`, '가나다'),
  ]).catch(() => {});
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** 이미지를 상자에 꽉 차게(잘라서) 그림 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

export function drawCard(
  canvas: HTMLCanvasElement,
  data: CardData,
  opts: { size: CardSize; theme: CardTheme; items: CardItems },
  labels: CardLabels,
): void {
  const layout = cardLayout(opts.size, opts.items, {
    bookOfYear: data.bookOfYear !== null,
    oneLiner: Boolean(data.oneLiner),
  });
  const { width: W, height: H, padX } = layout;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const c = cardColors(opts.theme, data.spines);
  const inner = W - padX * 2;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  // 책등 색 테마: 위쪽에 그해 책등 색 띠
  if (opts.theme === 'spine' && data.spines.length > 0) {
    const total = data.spines.reduce((n, s) => n + s.pages, 0);
    let x = 0;
    for (const s of data.spines) {
      const w = (s.pages / total) * W;
      ctx.fillStyle = s.palette.base;
      ctx.fillRect(x, 0, w + 1, 18);
      x += w;
    }
  }
  ctx.textBaseline = 'alphabetic';

  for (const sec of layout.sections) {
    const { y, h } = sec;
    if (sec.key === 'header') {
      ctx.fillStyle = c.text;
      ctx.font = `${Math.round(h * 0.66)}px ${DISPLAY}`;
      ctx.fillText(String(data.year), padX, y + h * 0.62);
      ctx.fillStyle = c.muted;
      ctx.font = `${Math.round(h * 0.2)}px ${BODY}`;
      ctx.fillText(labels.title, padX, y + h * 0.94);
    } else if (sec.key === 'shelf') {
      ctx.fillStyle = c.shelf;
      roundRect(ctx, padX, y, inner, h, 18);
      drawShelf(ctx, data.spines, padX + 24, y + 20, inner - 48, h - 20, c.plank);
    } else if (sec.key === 'numbers') {
      const cols = [
        { v: `${data.books.toLocaleString('ko-KR')}${labels.books}`, l: labels.booksLabel },
        { v: `${data.pages.toLocaleString('ko-KR')}${labels.pages}`, l: labels.pagesLabel },
        { v: data.topCategory ?? '–', l: labels.topLabel },
      ];
      const colW = inner / 3;
      cols.forEach((col, i) => {
        const x = padX + colW * i;
        ctx.fillStyle = c.text;
        ctx.font = `${Math.round(h * 0.42)}px ${DISPLAY}`;
        const v = wrapLines(col.v, colW - 16, (s) => ctx.measureText(s).width, 1)[0] ?? '';
        ctx.fillText(v, x, y + h * 0.5);
        ctx.fillStyle = c.muted;
        ctx.font = `${Math.round(h * 0.19)}px ${BODY}`;
        ctx.fillText(col.l, x, y + h * 0.88);
      });
    } else if (sec.key === 'boy' && data.bookOfYear) {
      const b = data.bookOfYear;
      const coverW = Math.round(h * 0.68);
      if (b.cover) drawCover(ctx, b.cover, padX, y, coverW, h);
      else {
        ctx.fillStyle = b.palette.base;
        ctx.fillRect(padX, y, coverW, h);
        ctx.fillStyle = b.palette.band;
        ctx.fillRect(padX, y + h * 0.72, coverW, h * 0.28);
        ctx.fillStyle = inkFor(b.palette.base);
        ctx.font = `${Math.round(coverW * 0.13)}px ${DISPLAY}`;
        wrapLines(b.title, coverW - 28, (s) => ctx.measureText(s).width, 3).forEach((l, i) =>
          ctx.fillText(l, padX + 14, y + 20 + coverW * 0.15 * (i + 1)),
        );
      }
      // 제본선
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(padX, y, 6, h);
      const tx = padX + coverW + 40;
      const tw = W - padX - tx;
      ctx.fillStyle = c.accent;
      ctx.font = `700 ${Math.round(h * 0.1)}px ${BODY}`;
      ctx.fillText(labels.boy, tx, y + h * 0.18);
      ctx.fillStyle = c.text;
      const titleSize = Math.round(h * 0.17);
      ctx.font = `${titleSize}px ${DISPLAY}`;
      const titleLines = wrapLines(b.title, tw, (s) => ctx.measureText(s).width, 2);
      titleLines.forEach((l, i) => ctx.fillText(l, tx, y + h * 0.18 + titleSize * 1.35 * (i + 1)));
      if (b.author) {
        ctx.fillStyle = c.muted;
        ctx.font = `${Math.round(h * 0.11)}px ${BODY}`;
        ctx.fillText(
          wrapLines(b.author, tw, (s) => ctx.measureText(s).width, 1)[0] ?? '',
          tx,
          y + h * 0.18 + titleSize * 1.35 * titleLines.length + h * 0.18,
        );
      }
    } else if (sec.key === 'oneLiner' && data.oneLiner) {
      const size = Math.round(h / layout.lines / 1.45);
      ctx.font = `${size}px ${DISPLAY}`;
      const lines = wrapLines(
        `“${data.oneLiner}”`,
        inner - 40,
        (s) => ctx.measureText(s).width,
        layout.lines,
      );
      // 왼쪽 강조 막대는 글 높이만큼
      ctx.fillStyle = c.accent;
      ctx.fillRect(padX, y, 6, size * 1.45 * lines.length);
      ctx.fillStyle = c.text;
      lines.forEach((l, i) => ctx.fillText(l, padX + 32, y + size * 1.1 + size * 1.45 * i));
    }
  }

  ctx.fillStyle = c.muted;
  ctx.font = `24px ${BODY}`;
  ctx.fillText(labels.watermark, padX, layout.footerY + 32);
}

/** 미니 책장: 책등 폭은 쪽수 비례, 줄이 넘치면 다음 줄로. 줄마다 선반 판 */
function drawShelf(
  ctx: CanvasRenderingContext2D,
  spines: readonly CardSpine[],
  x: number,
  y: number,
  w: number,
  h: number,
  plank: string,
) {
  if (spines.length === 0) return;
  const rowsWanted = spines.length <= 30 ? 1 : spines.length <= 70 ? 2 : 3;
  const PLANK = 12;
  const rowH = (h - PLANK * rowsWanted - 10 * (rowsWanted - 1)) / rowsWanted;
  const totalPages = spines.reduce((n, s) => n + s.pages, 0);
  // 책이 적어도 너무 뚱뚱하지 않게: 300쪽 책이 줄 높이의 1/3을 넘지 않음
  const perPage = Math.min(
    rowH * 0.0011,
    ((w - 3 * spines.length) * rowsWanted * 0.92) / totalPages,
  );
  const widths = spines.map((s) => Math.max(8, s.pages * perPage));
  const rows = packRows(widths, w).slice(0, rowsWanted);
  rows.forEach((row, r) => {
    const base = y + (rowH + PLANK + 10) * r + rowH;
    let cx = x;
    for (const i of row) {
      const s = spines[i]!;
      const sw = widths[i]!;
      const sh = rowH * (s.height / 176);
      ctx.fillStyle = s.palette.base;
      ctx.fillRect(cx, base - sh, sw, sh);
      ctx.fillStyle = s.palette.band;
      ctx.fillRect(cx, base - sh, sw, sh * 0.16);
      ctx.fillStyle = s.palette.accent;
      ctx.fillRect(cx, base - sh * 0.1, sw, Math.max(2, sh * 0.02));
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(cx + sw - 2, base - sh, 2, sh);
      cx += sw + 3;
    }
    ctx.fillStyle = plank;
    ctx.fillRect(x - 12, base, w + 24, PLANK);
  });
}

/** 캔버스 → PNG Blob */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png_failed'))), 'image/png'),
  );
}
