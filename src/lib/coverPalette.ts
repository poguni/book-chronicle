// 표지 Blob → 팔레트·줄인 JPEG (Web Worker에서 처리)
import type { PaletteResponse } from '../workers/palette.worker';
import type { PaletteResult } from './spine/palette';

export async function processCover(
  blob: Blob,
): Promise<{ result: PaletteResult | null; jpeg: Blob }> {
  const worker = new Worker(new URL('../workers/palette.worker.ts', import.meta.url), {
    type: 'module',
  });
  try {
    const response = await new Promise<PaletteResponse>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<PaletteResponse>) => resolve(e.data);
      worker.onerror = () => reject(new Error('worker_error'));
      worker.postMessage({ blob });
    });
    if (!response.ok) throw new Error(response.error);
    return { result: response.result, jpeg: response.jpeg };
  } finally {
    worker.terminate();
  }
}
