import { downloadCover } from './data/covers';

// 표지 보여 주기: Storage에서 Blob으로 내려받아 화면 주소(object URL)로 씁니다.
// 한 번 받은 표지는 이 화면(탭) 안에서 다시 받지 않습니다(PRD 5.5).
class Covers {
  #urls = $state<Record<string, string>>({});
  #loading = new Set<string>();

  /** 아직 없으면 내려받기 시작하고, 받는 동안은 null */
  url(path: string | null): string | null {
    if (!path) return null;
    const hit = this.#urls[path];
    if (hit) return hit;
    if (!this.#loading.has(path)) {
      this.#loading.add(path);
      downloadCover(path)
        .then((blob) => (this.#urls[path] = URL.createObjectURL(blob)))
        .catch((e: unknown) => console.warn('표지를 내려받지 못했어요', e))
        .finally(() => this.#loading.delete(path));
    }
    return null;
  }

  /** 막 올린 표지는 내려받지 않고 바로 씁니다. */
  remember(path: string, blob: Blob) {
    const old = this.#urls[path];
    if (old) URL.revokeObjectURL(old);
    this.#urls[path] = URL.createObjectURL(blob);
  }

  clear() {
    for (const u of Object.values(this.#urls)) URL.revokeObjectURL(u);
    this.#urls = {};
  }
}

export const covers = new Covers();
