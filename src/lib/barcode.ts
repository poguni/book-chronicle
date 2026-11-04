// 바코드 스캔 (PRD F2 P1, 결정 0014): 책 뒤 ISBN 바코드(EAN-13) 읽기.
// 브라우저 내장 BarcodeDetector(안드로이드 크롬 등)를 먼저 쓰고, 없으면(아이폰 사파리 등)
// ZXing을 그때만 불러옵니다(앱 첫 화면 번들에는 들어가지 않음).
import { toIsbn13 } from './isbn';

/** 읽은 바코드가 책 ISBN(978·979로 시작하는 EAN-13, 검사 숫자 맞음)이면 ISBN-13, 아니면 null */
export function isbnFromBarcode(text: string): string | null {
  const digits = text.replace(/\D/g, '');
  if (!/^97[89]\d{10}$/.test(digits)) return null;
  return toIsbn13(digits);
}

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorClass = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

/**
 * 카메라 영상에서 ISBN을 찾을 때까지 읽습니다. 찾으면 onisbn을 한 번 부르고 멈춥니다.
 * 돌려준 함수를 부르면 읽기를 멈춥니다(카메라 끄기는 부르는 쪽).
 */
export async function scanIsbn(
  video: HTMLVideoElement,
  onisbn: (isbn: string) => void,
): Promise<() => void> {
  let stopped = false;
  const found = (text: string) => {
    const isbn = isbnFromBarcode(text);
    if (isbn && !stopped) {
      stopped = true;
      onisbn(isbn);
    }
    return Boolean(isbn);
  };

  const Native = (globalThis as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  const formats = Native ? ((await Native.getSupportedFormats?.()) ?? []) : [];
  if (Native && formats.includes('ean_13')) {
    const detector = new Native({ formats: ['ean_13'] });
    const loop = async () => {
      while (!stopped) {
        try {
          const codes = await detector.detect(video);
          if (codes.some((c) => found(c.rawValue))) return;
        } catch {
          // 영상이 아직 준비되지 않음
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    };
    void loop();
    return () => (stopped = true);
  }

  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);
  const reader = new BrowserMultiFormatReader(hints);
  const controls = await reader.decodeFromVideoElement(video, (result) => {
    if (result && found(result.getText())) controls.stop();
  });
  return () => {
    stopped = true;
    controls.stop();
  };
}
