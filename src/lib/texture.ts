// 표지 질감 모드 (PRD 6.5, 결정 0014): 표지 → 64×256 흐림 이미지(WebP, 못 만들면 PNG)
export const TEXTURE_W = 64;
export const TEXTURE_H = 256;

/** 표지를 세로로 긴 책등 크기에 꽉 차게(가운데 잘라) 두고 흐리게 만듭니다. */
export async function makeTexture(cover: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(cover);
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  // 흐림 가장자리가 비지 않도록 조금 크게 그립니다.
  const scale = Math.max(TEXTURE_W / bitmap.width, TEXTURE_H / bitmap.height) * 1.15;
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.filter = 'blur(5px)';
  ctx.drawImage(bitmap, (TEXTURE_W - w) / 2, (TEXTURE_H - h) / 2, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('texture_failed'))), 'image/webp', 0.7),
  );
}
