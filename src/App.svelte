<script lang="ts">
  import { tick } from 'svelte';
  import DetailPanel from './components/DetailPanel.svelte';
  import OfflineBanner from './components/OfflineBanner.svelte';
  import Sidebar, { type YearBand } from './components/Sidebar.svelte';
  import { auth } from './lib/auth.svelte';
  import { ensureSettings } from './lib/data/settings';
  import { ko } from './lib/i18n/ko';
  import { router } from './lib/router.svelte';
  import { status } from './lib/status.svelte';
  import { isSupabaseConfigured } from './lib/supabase';
  import Compare from './pages/Compare.svelte';
  import Import from './pages/Import.svelte';
  import List from './pages/List.svelte';
  import Login from './pages/Login.svelte';
  import Recap from './pages/Recap.svelte';
  import Settings from './pages/Settings.svelte';
  import Shelves from './pages/Shelves.svelte';

  const today = new Date();
  const currentYear = today.getFullYear();
  // 책 데이터는 Phase 4에서 불러옵니다. 올해는 책이 없어도 늘 보입니다(결정 0001-8).
  const years: YearBand[] = [{ year: currentYear, count: 0, segments: [] }];

  // 900~1199px에서 상세 패널 서랍이 열렸는지 (책을 누르면 열림 — Phase 6)
  let detailOpen = $state(false);
  const withDetail = $derived(router.route.name === 'shelves');

  // 첫 로그인 때 settings 행 만들기 (이미 있으면 그대로)
  $effect(() => {
    const userId = auth.userId;
    if (userId) {
      ensureSettings(userId).catch((e: unknown) =>
        console.warn('settings 행을 만들지 못했어요', e),
      );
    }
  });

  // 로그인한 상태로 #/login에 오면 책장 홈으로
  $effect(() => {
    if (auth.session && router.route.name === 'login') window.location.hash = '#/';
  });

  function addBook() {
    // 책 꽂기 대화 상자는 Phase 4에서 만듭니다.
  }

  /** 연도 나이테를 누르면 주소는 그대로 두고 그 연도 책장으로 스크롤만 합니다(결정 0001-12). */
  async function scrollToYear(year: number) {
    if (router.route.name !== 'shelves') {
      window.location.hash = '#/';
      await new Promise((resolve) =>
        window.addEventListener('hashchange', resolve, { once: true }),
      );
      await tick();
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`y${year}`)
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && detailOpen) detailOpen = false;
  }
</script>

<svelte:window {onkeydown} />

{#if !isSupabaseConfigured}
  <p>{ko.app.notConfigured}</p>
{:else if !auth.ready}
  <!-- 저장된 세션을 확인하는 아주 짧은 순간: 로그인 화면이 깜빡이지 않게 비워 둠 -->
{:else if !auth.session}
  <!-- 로그인하지 않으면 어느 주소든 로그인 화면. 주소(해시)는 그대로 두어 로그인 후 원래 화면으로 돌아감 -->
  <Login />
{:else}
  <div class="app" class:with-detail={withDetail}>
    <Sidebar
      route={router.route}
      {years}
      {currentYear}
      saveState={status.save}
      onaddbook={addBook}
      onyear={scrollToYear}
      onlogout={() => auth.signOut()}
    />

    <main class="main">
      <OfflineBanner />
      {#if router.route.name === 'compare'}
        <Compare />
      {:else if router.route.name === 'recap'}
        <Recap year={router.route.year} />
      {:else if router.route.name === 'list'}
        <List />
      {:else if router.route.name === 'import'}
        <Import />
      {:else if router.route.name === 'settings'}
        <Settings />
      {:else}
        <Shelves {today} onaddbook={addBook} />
      {/if}
    </main>

    {#if withDetail}
      <DetailPanel {today} open={detailOpen} onclose={() => (detailOpen = false)} />
    {/if}
  </div>
{/if}

<style>
  /* 앱 셸 (DESIGN 5.1): 사이드바 232px / 본문 / 상세 패널. 상세 패널이 없는 화면은 2단 */
  .app {
    display: grid;
    grid-template-columns: var(--side-w) minmax(0, 1fr);
    min-height: 100vh;
  }
  .app.with-detail {
    grid-template-columns: var(--side-w) minmax(0, 1fr) var(--detail-w);
  }
  .main {
    min-width: 0;
    padding: 28px clamp(20px, 2.8vw, 48px) 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  /* 900~1199px: 상세 패널은 서랍이 되어 격자에서 빠짐 */
  @media (max-width: 1199px) {
    .app.with-detail {
      grid-template-columns: var(--side-w) minmax(0, 1fr);
    }
  }
  /* 900px 미만: 1단. 사이드바는 위에 붙는 상단 바 */
  @media (max-width: 899px) {
    .app,
    .app.with-detail {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto;
      align-content: start;
    }
    .main {
      padding: 20px 16px 32px;
    }
  }
</style>
