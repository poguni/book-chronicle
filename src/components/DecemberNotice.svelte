<script lang="ts">
  import { ko } from '../lib/i18n/ko';
  import { library } from '../lib/library.svelte';
  import { decemberNoticeDue, shelfOf } from '../lib/stats';
  import Icon from './Icon.svelte';

  // 12월 1일 이후 앱을 열면 "올해의 책을 골라 볼까요?"를 한 번 띄웁니다(PRD F6).
  // 이미 골랐거나 올해 책이 없으면 띄우지 않고, 한 번 보여 준 해는 이 기기에 기억합니다.
  let { today }: { today: Date } = $props();
  const year = $derived(today.getFullYear());
  const key = $derived(`bookchronicle-december-${year}`);

  function seen(): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }
  let hidden = $state(seen());

  const show = $derived(
    library.state === 'ready' &&
      decemberNoticeDue(today, {
        booksThisYear: shelfOf(library.shelves, year)?.count ?? 0,
        bookOfYearChosen:
          (library.years.find((y) => y.year === year)?.book_of_year.length ?? 0) > 0,
        seen: hidden,
      }),
  );

  // 보여 준 순간 기억해 다음에 앱을 열 때는 띄우지 않음
  $effect(() => {
    if (!show) return;
    try {
      localStorage.setItem(key, '1');
    } catch {
      // 저장소를 못 쓰면 이번만
    }
  });
</script>

{#if show}
  <div class="notice" role="status">
    <Icon name="bookmark" size={16} strokeWidth={2} />
    <span>{ko.recap.decemberNotice(year)}</span>
    <a href="#/recap/{year}">{ko.recap.decemberGo}</a>
    <button type="button" onclick={() => (hidden = true)}>{ko.recap.decemberLater}</button>
  </div>
{/if}

<style>
  .notice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 14px;
    border-radius: var(--radius-m);
    background: var(--card);
    border: 1px solid var(--accent);
    font-size: 14px;
  }
  .notice :global(svg) {
    color: var(--accent);
    flex: none;
  }
  span {
    flex: 1 1 240px;
  }
  a {
    font-weight: 700;
  }
  button {
    border: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
    min-height: 32px;
  }
</style>
