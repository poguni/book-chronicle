import { parseHash, type Route } from './route';

// 현재 해시 주소를 $state로 들고 있다가 주소가 바뀌면 갱신합니다.
class Router {
  route = $state<Route>(parseHash(window.location.hash));

  constructor() {
    window.addEventListener('hashchange', () => {
      this.route = parseHash(window.location.hash);
    });
  }
}

export const router = new Router();
