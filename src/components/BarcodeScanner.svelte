<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { scanIsbn } from '../lib/barcode';
  import { ko } from '../lib/i18n/ko';

  // 바코드 스캔 (PRD F2 P1): 뒤 카메라로 ISBN 바코드를 읽으면 onisbn을 부르고 닫힙니다.
  let { onisbn, onclose }: { onisbn: (isbn: string) => void; onclose: () => void } = $props();

  let error = $state<string | null>(null);

  const camera: Attachment<HTMLVideoElement> = (video) => {
    let stream: MediaStream | null = null;
    let stopScan: (() => void) | null = null;
    let alive = true;
    const cleanup = () => {
      alive = false;
      stopScan?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!alive) return cleanup();
        video.srcObject = stream;
        await video.play();
        stopScan = await scanIsbn(video, (isbn) => {
          cleanup();
          onisbn(isbn);
        });
        if (!alive) stopScan();
      } catch (e) {
        error =
          (e as DOMException).name === 'NotAllowedError'
            ? ko.search.barcodeDenied
            : ko.search.barcodeError;
        cleanup();
      }
    })();
    return cleanup;
  };
</script>

<div class="scanner" role="group" aria-label={ko.search.barcode}>
  {#if error}
    <p class="error" role="alert">{error}</p>
  {:else}
    <div class="view">
      <video {@attach camera} muted playsinline></video>
      <span class="frame" aria-hidden="true"></span>
    </div>
    <p class="hint">{ko.search.barcodeHint}</p>
  {/if}
  <button type="button" class="close" onclick={onclose}>{ko.search.barcodeClose}</button>
</div>

<style>
  .scanner {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
  }
  .view {
    position: relative;
    border-radius: var(--radius-s);
    overflow: hidden;
    background: #000;
    aspect-ratio: 4 / 3;
    max-height: 320px;
  }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .frame {
    position: absolute;
    left: 12%;
    right: 12%;
    top: 30%;
    bottom: 30%;
    border: 2px solid var(--accent);
    border-radius: 8px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
  }
  .hint,
  .error {
    margin: 0;
    font-size: 13px;
  }
  .hint {
    color: var(--muted);
  }
  .close {
    align-self: flex-end;
    height: 40px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--text);
    cursor: pointer;
  }
</style>
