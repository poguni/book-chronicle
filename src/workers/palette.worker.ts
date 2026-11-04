// 표지 처리 Web Worker (PRD 6.3·5.5): 화면이 멈추지 않게 따로 돌립니다.
// 1) 64×64로 줄여 팔레트 3색과 후보 5색을 뽑고
// 2) 가로 300px 이하 JPEG로 다시 만들어(메타데이터도 빠짐) Storage에 올릴 준비를 합니다.
import { extractPalette, type PaletteResult } from '../lib/spine/palette';

export type PaletteRequest = { blob: Blob };
export type PaletteResponse =
  { ok: true; result: PaletteResult | null; jpeg: Blob } | { ok: false; error: string };

const SAMPLE = 64;
const MAX_WIDTH = 300;

async function process(blob: Blob): Promise<PaletteResponse> {
  const bitmap = await createImageBitmap(blob);
  try {
    const sample = new OffscreenCanvas(SAMPLE, SAMPLE);
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    if (!sctx) throw new Error('no_canvas');
    sctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);
    const { data } = sctx.getImageData(0, 0, SAMPLE, SAMPLE);
    const result = extractPalette(data, SAMPLE, SAMPLE);

    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const out = new OffscreenCanvas(w, h);
    const octx = out.getContext('2d');
    if (!octx) throw new Error('no_canvas');
    octx.fillStyle = '#ffffff'; // 투명한 PNG도 JPEG로 바꿀 수 있게
    octx.fillRect(0, 0, w, h);
    octx.drawImage(bitmap, 0, 0, w, h);
    const jpeg = await out.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    return { ok: true, result, jpeg };
  } finally {
    bitmap.close();
  }
}

// 앱 tsconfig는 DOM 타입이라 워커 전역을 필요한 만큼만 적어 둡니다.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<PaletteRequest>) => void) | null;
  postMessage: (message: PaletteResponse) => void;
};

ctx.onmessage = async (e) => {
  try {
    ctx.postMessage(await process(e.data.blob));
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : 'error' });
  }
};
