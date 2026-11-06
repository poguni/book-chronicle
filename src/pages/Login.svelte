<script lang="ts">
  import { auth } from '../lib/auth.svelte';
  import { ko } from '../lib/i18n/ko';

  // 로그인 배경 그림 (public/). GitHub Pages의 하위 경로(base)를 붙입니다.
  const splash = `url('${import.meta.env.BASE_URL}book-chronicle-splash-screen.webp')`;

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

<div class="login" style:--splash={splash}>
  <form class="login-card" aria-labelledby="loginTitle" {onsubmit}>
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

    {#if auth.expired && !error}
      <p class="notice" role="status">{ko.login.expired}</p>
    {/if}

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
  /*
   * 배경 그림(1920×1080)의 제목은 그림 위쪽 35%(y≈380px)에 있으므로 카드는 그 아래 빈 곳에 둡니다.
   * 가로 화면: 화면을 꽉 채우고(cover) 그림 1px = max(100vw/1920, 100vh/1080)이므로
   * 제목 아래 끝은 화면 가운데에서 (540 - 400)그림px 위입니다.
   */
  .login {
    --img-px: max(100vw / 1920, 100vh / 1080);
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--splash) center / cover no-repeat var(--splash-bg);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: max(24px, calc(50vh - 140 * var(--img-px))) 24px 24px;
    overflow-y: auto;
  }
  /*
   * 세로 화면: 그림을 위에 붙여 화면 높이의 55%쯤으로 키우고 양옆은 잘라 냅니다.
   * 제목(그림 가로 575~1345px)이 잘리지 않게 높이는 140vw까지, 폭은 화면보다 좁아지지 않게.
   * 카드는 제목 아래 끝(그림 y≈400px)부터.
   */
  @media (orientation: portrait) {
    .login {
      --img-w: max(100vw, min(55vh, 140vw) * 1920 / 1080);
      --img-h: calc(var(--img-w) * 1080 / 1920);
      /* 그림 아래 끝이 딱 끊기지 않게 바탕색으로 흐리게 */
      background:
        linear-gradient(to bottom, transparent 60%, var(--splash-bg)) top center / 100% var(--img-h)
          no-repeat,
        var(--splash) top center / var(--img-w) auto no-repeat var(--splash-bg);
      padding-top: calc(var(--img-w) * 400 / 1920 + 8px);
    }
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
  .notice {
    font-size: 14px;
    color: var(--text);
    margin: -8px 0;
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
      padding-inline: 16px;
      padding-bottom: 16px;
    }
    .login-card {
      padding: 28px 20px;
    }
  }
</style>
