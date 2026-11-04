import { mount } from 'svelte';
import App from './App.svelte';
import './lib/prefs.svelte'; // 저장된 테마·책등 스타일을 화면을 그리기 전에 적용
import './styles/tokens.css';
import './styles/themes.css';
import './styles/base.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app 요소를 찾을 수 없습니다.');

export default mount(App, { target });
