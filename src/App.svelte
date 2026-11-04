<script lang="ts">
  import { tick, untrack } from 'svelte';
  import BackupReminder from './components/BackupReminder.svelte';
  import BookDialog, { type DialogMode } from './components/BookDialog.svelte';
  import DetailPanel, { type Selection } from './components/DetailPanel.svelte';
  import OfflineBanner from './components/OfflineBanner.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import { auth } from './lib/auth.svelte';
  import { ensureSettings } from './lib/data/settings';
  import { ko } from './lib/i18n/ko';
  import { covers } from './lib/covers.svelte';
  import { library } from './lib/library.svelte';
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
  import { findSpine, sortReadings, type ShelfSpine } from './lib/shelves';
  import { shelfOf, yearBands } from './lib/stats';

  const today = new Date();
  const currentYear = today.getFullYear();
  const years = $derived(yearBands(library.shelves));
  const thisYearSpines = $derived(shelfOf(library.shelves, currentYear)?.spines ?? []);

  // 책 꽂기·고치기 대화 상자. key를 바꾸면 새 값으로 다시 엽니다.
  let dialog = $state<{ mode: DialogMode; key: number } | null>(null);
  let dialogKey = 0;
  function openDialog(mode: DialogMode) {
    dialog = { mode, key: ++dialogKey };
  }

  // 900~1199px에서 상세 패널 서랍이 열렸는지 (책을 누르면 열림)
  let detailOpen = $state(false);

  // 꺼내 본 책(기록 ID). 기록이 지워지면 선택도 저절로 풀립니다.
  let selectedId = $state<string | null>(null);
  const selection: Selection | null = $derived.by(() => {
    if (!selectedId) return null;
    const reading = library.readingById(selectedId);
    const spine = findSpine(library.shelves, selectedId);
    if (!reading || !spine) return null;
    return { spine, reading, readings: sortReadings(library.readingsOf(reading.book_id)) };
  });
  const withDetail = $derived(router.route.name === 'shelves');

  // 로그인하면 settings 행을 만들고(이미 있으면 그대로) 책장을 불러옵니다. 로그아웃하면 비웁니다.
  $effect(() => {
    const userId = auth.userId;
    if (userId) {
      ensureSettings(userId).catch((e: unknown) =>
        console.warn('settings 행을 만들지 못했어요', e),
      );
      // 이 효과는 로그인한 사용자가 바뀔 때만 다시 돌도록, 책장 상태는 추적하지 않습니다.
      untrack(() => void library.load());
    } else {
      untrack(() => {
        library.reset();
        covers.clear();
      });
      dialog = null;
    }
  });

  // 로그인한 상태로 #/login에 오면 책장 홈으로
  $effect(() => {
    if (auth.session && router.route.name === 'login') window.location.hash = '#/';
  });

  function addBook() {
    openDialog({ kind: 'new' });
  }

  /**
   * 책등을 누르면 꺼내 보고(다시 누르면 제자리로) 상세 패널을 그 책으로 바꿉니다(PRD 6.6).
   * 900~1199px에서는 서랍을 열고, 900px 미만에서는 책장 아래 상세 패널로 스크롤합니다.
   */
  function pick(spine: ShelfSpine) {
    if (selectedId === spine.readingId) selectedId = null;
    else void selectReading(spine.readingId);
  }

  async function selectReading(readingId: string) {
    selectedId = readingId;
    if (window.matchMedia('(max-width: 899px)').matches) {
      await tick();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .querySelector('.detail .selected')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } else if (window.matchMedia('(max-width: 1199px)').matches) {
      detailOpen = true;
    }
  }

  function editSelected() {
    if (selection)
      openDialog({ kind: 'edit', bookId: selection.spine.bookId, readingId: selection.reading.id });
  }

  function toggleBookOfYear() {
    const year = selection?.reading.year;
    if (selection && year != null) void library.toggleBookOfYear(year, selection.spine.bookId);
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

  /** Esc: 꺼낸 책을 제자리로, 서랍도 닫음. 대화 상자가 열려 있으면 대화 상자만 닫힘 */
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || dialog) return;
    detailOpen = false;
    selectedId = null;
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
      {#if router.route.name === 'shelves'}<BackupReminder />{/if}
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
        <Shelves
          {today}
          shelves={library.shelves}
          loadState={library.state}
          onaddbook={addBook}
          onpick={pick}
          onreorder={(ids) => library.reorder(ids)}
          onretry={() => library.load()}
          {selectedId}
        />
      {/if}
    </main>

    {#if withDetail}
      <DetailPanel
        {today}
        spines={thisYearSpines}
        shelves={library.shelves}
        {selection}
        open={detailOpen}
        onclose={() => (detailOpen = false)}
        onedit={editSelected}
        onbookofyear={toggleBookOfYear}
        onselectreading={(id) => void selectReading(id)}
      />
    {/if}
  </div>

  {#if dialog}
    {#key dialog.key}
      <BookDialog mode={dialog.mode} onclose={() => (dialog = null)} onchangemode={openDialog} />
    {/key}
  {/if}
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
