// books.spine(jsonb) 읽기·만들기 (PRD 7.2)
import type { Json } from '../database.types';
import { isHexColor } from './color';
import { hashId } from './geometry';
import { isPattern, type Pattern } from './patterns';

export type Palette = { base: string; band: string; accent: string };
export type SpineData = {
  palette: Palette;
  candidates: string[];
  pattern: Pattern | null;
  manual: boolean;
};

/** 직접 입력한 책의 기본 색 세트(결정 0001-8). 시안의 책등 색에서 골랐습니다. */
export const PRESET_PALETTES: readonly Palette[] = [
  { base: '#2F4F6F', band: '#E9E1CF', accent: '#C9A45C' },
  { base: '#C8A24A', band: '#1F1B16', accent: '#3B2A14' },
  { base: '#D8C3A5', band: '#B5523B', accent: '#3B2A20' },
  { base: '#3E6B5A', band: '#E8D9B0', accent: '#A8C686' },
  { base: '#5B8DB8', band: '#F2E6C9', accent: '#1F3550' },
  { base: '#1F2340', band: '#C9A45C', accent: '#C9A45C' },
  { base: '#6B7F3A', band: '#EFE6D2', accent: '#2A3018' },
  { base: '#8E3B2F', band: '#E9D3B0', accent: '#E9D3B0' },
  { base: '#B5523B', band: '#F1E3C8', accent: '#30231C' },
  { base: '#F0C05A', band: '#1D2433', accent: '#1D2433' },
  { base: '#9CB7D4', band: '#F7F1E6', accent: '#E3B23C' },
  { base: '#E8E1D3', band: '#3B4A5C', accent: '#3B4A5C' },
  { base: '#4B3F72', band: '#F0C05A', accent: '#F0C05A' },
  { base: '#7A2E22', band: '#E8D9B0', accent: '#C9A45C' },
  { base: '#2E5E73', band: '#F0E2C0', accent: '#9CC3D5' },
  { base: '#E7C9C0', band: '#7C3F58', accent: '#7C3F58' },
  { base: '#5A5F66', band: '#C0392B', accent: '#E9E4D8' },
  { base: '#3F8F6B', band: '#F2E6C9', accent: '#F0C05A' },
];

export function presetPalette(bookId: string): Palette {
  return PRESET_PALETTES[hashId(bookId) % PRESET_PALETTES.length] as Palette;
}

export function newSpineData(bookId: string): SpineData {
  return { palette: presetPalette(bookId), candidates: [], pattern: null, manual: false };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** DB 값이 이상해도 화면이 깨지지 않게, 빠진 값은 기본 색 세트로 채웁니다. */
export function parseSpineData(json: Json, bookId: string): SpineData {
  const o = asObject(json) ?? {};
  const p = asObject(o.palette) ?? {};
  const fallback = presetPalette(bookId);
  return {
    palette: {
      base: isHexColor(p.base) ? p.base : fallback.base,
      band: isHexColor(p.band) ? p.band : fallback.band,
      accent: isHexColor(p.accent) ? p.accent : fallback.accent,
    },
    candidates: Array.isArray(o.candidates) ? o.candidates.filter(isHexColor) : [],
    pattern: isPattern(o.pattern) ? o.pattern : null,
    manual: o.manual === true,
  };
}

export function toJson(spine: SpineData): Json {
  return {
    palette: { ...spine.palette },
    candidates: [...spine.candidates],
    pattern: spine.pattern,
    manual: spine.manual,
  };
}
