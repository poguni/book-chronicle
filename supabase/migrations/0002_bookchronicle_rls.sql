-- 북크로니클 권한과 RLS (PRD 5.4)
-- 원칙: 로그인한 사용자(authenticated)만, 본인 행(user_id = auth.uid())만 읽고 씁니다.
--       로그인하지 않은 사용자(anon)에게는 아무 권한도 주지 않습니다.

-- ───────── 스키마·테이블 권한 ─────────
revoke all on schema bookchronicle from public, anon;
revoke all on all tables in schema bookchronicle from public, anon;
revoke all on all functions in schema bookchronicle from public, anon;

grant usage on schema bookchronicle to authenticated, service_role;

grant select, insert, update, delete on
  bookchronicle.books,
  bookchronicle.readings,
  bookchronicle.years,
  bookchronicle.settings
to authenticated;

-- Edge Function(서비스 키)용. aladin_cache는 authenticated에게 권한을 주지 않습니다.
grant all on all tables in schema bookchronicle to service_role;

-- ───────── RLS 켜기 (모든 테이블) ─────────
alter table bookchronicle.books enable row level security;
alter table bookchronicle.readings enable row level security;
alter table bookchronicle.years enable row level security;
alter table bookchronicle.settings enable row level security;
-- 정책 없음 = authenticated·anon 모두 접근 불가, service_role만 접근
alter table bookchronicle.aladin_cache enable row level security;

-- ───────── books ─────────
create policy "본인 책만 조회" on bookchronicle.books
  for select to authenticated using (user_id = (select auth.uid()));
create policy "본인 책만 추가" on bookchronicle.books
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "본인 책만 수정" on bookchronicle.books
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "본인 책만 삭제" on bookchronicle.books
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── readings ─────────
create policy "본인 기록만 조회" on bookchronicle.readings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "본인 기록만 추가" on bookchronicle.readings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "본인 기록만 수정" on bookchronicle.readings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "본인 기록만 삭제" on bookchronicle.readings
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── years ─────────
create policy "본인 회고만 조회" on bookchronicle.years
  for select to authenticated using (user_id = (select auth.uid()));
create policy "본인 회고만 추가" on bookchronicle.years
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "본인 회고만 수정" on bookchronicle.years
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "본인 회고만 삭제" on bookchronicle.years
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────── settings ─────────
create policy "본인 설정만 조회" on bookchronicle.settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "본인 설정만 추가" on bookchronicle.settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "본인 설정만 수정" on bookchronicle.settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "본인 설정만 삭제" on bookchronicle.settings
  for delete to authenticated using (user_id = (select auth.uid()));
