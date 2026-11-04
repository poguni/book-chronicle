<script lang="ts" module>
  /** 연도별 나이테 한 줄: 그해 책등 색을 쪽수 비율로 이어 붙인 띠 */
  export type YearBand = {
    year: number;
    count: number;
    segments: { pages: number; color: string }[];
  };
</script>

<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import type { Route } from '../lib/route';
  import type { SaveState } from '../lib/status.svelte';
  import type { SpineStyle, Theme } from '../lib/theme';
  import BrandMark from './BrandMark.svelte';
  import Icon, { type IconName } from './Icon.svelte';
  import SaveDot from './SaveDot.svelte';

  let {
    route,
    years,
    currentYear,
    saveState,
    onaddbook,
    onyear,
    onlogout,
  }: {
    route: Route;
    years: YearBand[];
    currentYear: number;
    saveState: SaveState;
    onaddbook: () => void;
    onyear: (year: number) => void;
    onlogout: () => void;
  } = $props();

  const links: { href: string; name: Route['name']; label: string; icon: IconName }[] = [
    { href: '#/', name: 'shelves', label: ko.pages.shelves, icon: 'shelf' },
    { href: '#/compare', name: 'compare', label: ko.pages.compare, icon: 'chart' },
    { href: '#/recap', name: 'recap', label: ko.pages.recap, icon: 'bookmark' },
    { href: '#/list', name: 'list', label: ko.pages.list, icon: 'list' },
    { href: '#/import', name: 'import', label: ko.pages.import, icon: 'download' },
    { href: '#/settings', name: 'settings', label: ko.pages.settings, icon: 'gear' },
  ];

  const themes: { value: Theme; label: string }[] = [
    { value: 'study', label: ko.side.themeStudy },
    { value: 'paper', label: ko.side.themePaper },
  ];
  const spines: { value: SpineStyle; label: string }[] = [
    { value: 'generated', label: ko.side.spineGenerated },
    { value: 'texture', label: ko.side.spineTexture },
  ];

  // 900px 미만에서 상단 바의 메뉴 펼침
  let open = $state(false);

  // 화면이 바뀌면 펼친 메뉴를 닫습니다.
  $effect(() => {
    void route;
    open = false;
  });
</script>

<aside class="side" class:open>
  <div class="side-top">
    <div class="brand">
      <BrandMark />
      <div>
        <span class="brand-name display">{ko.appName}</span>
        <span class="brand-sub">{ko.side.brandSub}</span>
      </div>
    </div>
    <button
      type="button"
      class="menu-btn"
      aria-label={open ? ko.side.closeMenu : ko.side.openMenu}
      aria-expanded={open}
      aria-controls="side-body"
      onclick={() => (open = !open)}
    >
      <Icon name={open ? 'close' : 'menu'} size={20} />
    </button>
  </div>

  <div class="side-body" id="side-body">
    <button type="button" class="btn-primary" onclick={onaddbook}>
      <Icon name="plus" strokeWidth={2.2} />{ko.side.addBook}
    </button>

    <nav class="nav" aria-label={ko.nav.label}>
      {#each links as link (link.name)}
        <a href={link.href} aria-current={route.name === link.name ? 'page' : undefined}>
          <Icon name={link.icon} />{link.label}
        </a>
      {/each}
    </nav>

    <div class="years">
      <span class="label">{ko.side.years}</span>
      {#each years as y (y.year)}
        <button
          type="button"
          class="year-link"
          aria-current={y.year === currentYear ? 'true' : undefined}
          onclick={() => {
            open = false;
            onyear(y.year);
          }}
        >
          <span class="row"><b>{y.year}</b><span>{ko.side.yearCount(y.count)}</span></span>
          <span class="band" aria-hidden="true">
            {#each y.segments as seg, i (i)}
              <span class="seg" style:flex="{seg.pages} 1 0" style:background={seg.color}></span>
            {/each}
          </span>
        </button>
      {/each}
    </div>

    <div class="prefs">
      <span class="label">{ko.side.prefs}</span>
      <div class="seg-ctl" role="radiogroup" aria-label={ko.side.theme}>
        {#each themes as t (t.value)}
          <button
            type="button"
            role="radio"
            aria-checked={prefs.theme === t.value}
            onclick={() => library.chooseTheme(t.value)}>{t.label}</button
          >
        {/each}
      </div>
      <div class="seg-ctl" role="radiogroup" aria-label={ko.side.spine}>
        {#each spines as s (s.value)}
          <button
            type="button"
            role="radio"
            aria-checked={prefs.spine === s.value}
            onclick={() => library.chooseSpine(s.value)}>{s.label}</button
          >
        {/each}
      </div>
    </div>

    <div class="side-foot">
      <div class="account">
        <span class="avatar" aria-hidden="true">{ko.side.avatar}</span>
        <span class="who">
          <b>{ko.side.account}</b>
          <SaveDot state={saveState} />
        </span>
        <button
          type="button"
          class="icon-btn"
          aria-label={ko.nav.logout}
          title={ko.nav.logout}
          onclick={onlogout}
        >
          <Icon name="logout" />
        </button>
      </div>
      <span>{ko.side.credit}</span>
    </div>
  </div>
</aside>

<style>
  /* 시안(design-mockup-study.html) '사이드바' 절을 옮김 */
  .side {
    background: var(--side);
    border-right: 1px solid var(--line);
    padding: 28px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    /* 3단일 때 사이드바는 화면에 붙어 있고, 넘치면 안에서 스크롤 */
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    overflow-y: auto;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-name {
    font-size: 21px;
    line-height: 1.2;
  }
  .brand-sub {
    display: block;
    font-size: 11px;
    letter-spacing: 0.18em;
    color: var(--muted);
  }
  .side-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .menu-btn {
    display: none;
  }
  .side-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
    flex: 1;
  }
  .nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav a {
    height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    color: var(--muted);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  .nav a:hover {
    background: var(--accent-soft);
    color: var(--text);
  }
  .nav a[aria-current] {
    background: var(--card);
    color: var(--text);
    font-weight: 700;
  }
  .nav a[aria-current] :global(svg) {
    color: var(--accent);
  }
  .years {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .year-link {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--text);
    border: 1px solid transparent;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }
  .year-link:hover {
    border-color: var(--line);
  }
  .year-link[aria-current] {
    border-color: var(--accent);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13px;
  }
  .row b {
    font-family: var(--font-display);
    font-weight: var(--display-weight);
    font-size: 16px;
  }
  .row span {
    color: var(--muted);
    font-size: 12px;
  }
  /* 빈 해에도 띠 자리가 보이도록 바탕색을 깔아 둠 */
  .band {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    gap: 1px;
    background: var(--bar-off);
  }
  .seg {
    display: block;
    height: 100%;
  }
  .prefs {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .seg-ctl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 3px;
  }
  .seg-ctl button {
    height: 36px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
  }
  .seg-ctl button[aria-checked='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 700;
  }
  .side-foot {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12px;
    color: var(--muted);
  }
  .account {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px 8px 10px;
    border-radius: 12px;
    background: var(--card);
    border: 1px solid var(--line);
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: var(--accent);
    color: var(--accent-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    flex: none;
  }
  .who {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.35;
  }
  .who b {
    color: var(--text);
    font-size: 13px;
  }
  .icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: 0;
    background: transparent;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: none;
  }
  .icon-btn:hover {
    background: var(--accent-soft);
    color: var(--text);
  }

  /* 900px 미만: 위에 붙는 상단 바 + 펼치는 메뉴 (DESIGN 5.2) */
  @media (max-width: 899px) {
    .side {
      padding: 12px 16px;
      gap: 0;
      border-right: 0;
      border-bottom: 1px solid var(--line);
      z-index: 20;
      height: auto;
      overflow: visible;
    }
    .brand :global(.brand-mark) {
      width: 32px;
      height: 32px;
    }
    .brand-name {
      font-size: 18px;
    }
    .brand-sub {
      display: none;
    }
    .menu-btn {
      display: flex;
      width: 44px;
      height: 44px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background: var(--card);
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .side-body {
      display: none;
      padding-top: 16px;
    }
    /* 펼친 메뉴가 화면 높이를 넘으면 메뉴 안에서 스크롤 */
    .side.open .side-body {
      display: flex;
      max-height: calc(100vh - 69px);
      max-height: calc(100dvh - 69px);
      overflow-y: auto;
      padding-bottom: 16px;
    }
  }
</style>
