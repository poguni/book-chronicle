<script lang="ts">
  import { ko } from './lib/i18n/ko';
  import { router } from './lib/router.svelte';
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
</script>

{#if router.route.name === 'login'}
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
