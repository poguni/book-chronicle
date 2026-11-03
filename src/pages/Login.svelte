<script lang="ts">
  import { auth } from '../lib/auth.svelte';
  import { ko } from '../lib/i18n/ko';

  // 카드 위 작은 책장 그림 (DESIGN 7.4). 책등 색은 토큰이 아니라 책 데이터처럼 다룹니다.
  const miniShelf = [
    { w: 14, h: 44, c: '#2F4F6F' },
    { w: 26, h: 56, c: '#C8A24A' },
    { w: 12, h: 40, c: '#D8C3A5' },
    { w: 18, h: 50, c: '#3E6B5A' },
    { w: 30, h: 58, c: '#1F2340' },
    { w: 16, h: 46, c: '#8E3B2F' },
    { w: 20, h: 52, c: '#E8E1D3' },
    { w: 14, h: 42, c: '#4B3F72' },
  ];

  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let submitting = $state(false);

  async function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    if (submitting) return;
    submitting = true;
    error = await auth.signIn(email.trim(), password);
    submitting = false;
  }
</script>

<div class="login">
  <form class="login-card" aria-labelledby="loginTitle" {onsubmit}>
    <div class="mini-shelf" aria-hidden="true">
      {#each miniShelf as book, i (i)}
        <span style:width="{book.w}px" style:height="{book.h}px" style:background={book.c}></span>
      {/each}
    </div>

    <div class="heading">
      <span class="label">{ko.login.brand}</span>
      <h1 class="display" id="loginTitle">{ko.login.title}</h1>
      <span class="sub">{ko.login.subtitle}</span>
    </div>

    <label class="field">
      {ko.login.email}
      <input
        type="email"
        autocomplete="email"
        placeholder={ko.login.emailPlaceholder}
        required
        bind:value={email}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'loginError' : undefined}
      />
    </label>
    <label class="field">
      {ko.login.password}
      <input
        type="password"
        autocomplete="current-password"
        placeholder={ko.login.passwordPlaceholder}
        required
        bind:value={password}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'loginError' : undefined}
      />
    </label>

    <div class="error" id="loginError" role="alert">
      {#if error}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3 2 20h20L12 3z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
        <span>{error}</span>
      {/if}
    </div>

    <button type="submit" class="btn-primary" disabled={submitting}>
      {submitting ? ko.login.submitting : ko.login.submit}
    </button>
  </form>
</div>

<style>
  /* 시안(design-mockup-study.html) '로그인 화면' 절을 그대로 옮김 */
  .login {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
  }
  .login-card {
    width: min(420px, 100%);
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 36px 32px;
    border-radius: 20px;
    background: var(--panel);
    border: 1px solid var(--line);
    box-shadow: var(--book-shadow);
  }
  .mini-shelf {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 64px;
    padding: 0 6px;
    border-bottom: 6px solid var(--plank);
  }
  .mini-shelf span {
    display: block;
    border-radius: 2px 2px 0 0;
  }
  .heading {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    color: var(--muted);
  }
  h1 {
    margin: 0;
    font-size: 26px;
    line-height: 1.3;
  }
  .sub {
    font-size: 13px;
    color: var(--muted);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
  }
  .field input {
    height: 48px;
    border-radius: var(--radius-m);
    border: 1px solid var(--line);
    background: var(--card);
    padding: 0 14px;
    font-size: 15px;
    color: var(--text);
  }
  .field input:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  /* 실패 문구: 강조색이 아닌 본문색 + 경고 아이콘 (DESIGN 7.4). 비어 있을 때는 자리를 차지하지 않음 */
  .error {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text);
    margin: -8px 0;
  }
  .error:empty {
    display: none;
  }
  .btn-primary {
    height: 48px;
    border-radius: var(--radius-m);
    border: 0;
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
    cursor: pointer;
  }
  .btn-primary:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  @media (max-width: 420px) {
    .login {
      padding: 16px;
    }
    .login-card {
      padding: 28px 20px;
    }
  }
</style>
