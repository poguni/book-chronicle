<script lang="ts">
  import { auth } from './lib/auth.svelte';
  import { ensureSettings } from './lib/data/settings';
  import { ko } from './lib/i18n/ko';
  import { router } from './lib/router.svelte';
  import { isSupabaseConfigured } from './lib/supabase';
  import Compare from './pages/Compare.svelte';
  import Import from './pages/Import.svelte';
  import List from './pages/List.svelte';
  import Login from './pages/Login.svelte';
  import Recap from './pages/Recap.svelte';
  import Settings from './pages/Settings.svelte';
  import Shelves from './pages/Shelves.svelte';

  // 임시 메뉴: Phase 3에서 Sidebar.svelte로 바뀝니다.
  const links = [
    { href: '#/', name: 'shelves', label: ko.pages.shelves },
    { href: '#/compare', name: 'compare', label: ko.pages.compare },
    { href: '#/recap', name: 'recap', label: ko.pages.recap },
    { href: '#/list', name: 'list', label: ko.pages.list },
    { href: '#/import', name: 'import', label: ko.pages.import },
    { href: '#/settings', name: 'settings', label: ko.pages.settings },
  ] as const;

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
</script>

{#if !isSupabaseConfigured}
  <p>{ko.app.notConfigured}</p>
{:else if !auth.ready}
  <!-- 저장된 세션을 확인하는 아주 짧은 순간: 로그인 화면이 깜빡이지 않게 비워 둠 -->
{:else if !auth.session}
  <!-- 로그인하지 않으면 어느 주소든 로그인 화면. 주소(해시)는 그대로 두어 로그인 후 원래 화면으로 돌아감 -->
  <Login />
{:else}
  <nav aria-label={ko.nav.label}>
    <ul>
      {#each links as link (link.name)}
        <li>
          <a href={link.href} aria-current={router.route.name === link.name ? 'page' : undefined}>
            {link.label}
          </a>
        </li>
      {/each}
    </ul>
    <button type="button" onclick={() => auth.signOut()}>{ko.nav.logout}</button>
  </nav>

  <main>
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
      <Shelves />
    {/if}
  </main>
{/if}
