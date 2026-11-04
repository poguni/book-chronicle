// 연결·저장 상태 (DESIGN 12장). 저장 상태는 Phase 4부터 데이터 계층이 바꿉니다.
export type SaveState = 'saved' | 'saving' | 'error';

class Status {
  online = $state(navigator.onLine);
  save = $state<SaveState>('saved');

  constructor() {
    window.addEventListener('online', () => (this.online = true));
    window.addEventListener('offline', () => (this.online = false));
  }
}

export const status = new Status();
