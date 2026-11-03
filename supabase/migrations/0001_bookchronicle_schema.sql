-- 북크로니클 스키마와 테이블 (PRD 7장)
-- 규칙: bookchronicle 스키마만 다룹니다. public 스키마와 기존 앱 자원은 건드리지 않습니다.

create schema if not exists bookchronicle;

-- updated_at 자동 갱신 트리거 함수
create or replace function bookchronicle.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────── books: 책 정보(한 권당 1행) ─────────
create table bookchronicle.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  isbn13 text check (isbn13 is null or isbn13 ~ '^[0-9]{13}$'),
  title text not null check (char_length(title) between 1 and 500),
  author text,
  publisher text,
  pub_date date,
  pages int check (pages is null or pages > 0),
  pages_estimated boolean not null default false,
  category_raw text,               -- 알라딘 categoryName 전체
  category text,                   -- 앱 분야
  size jsonb,                      -- {"w":140,"h":205,"d":15} (mm)
  spine jsonb not null,            -- {"palette":{"base","band","accent"},"candidates":[],"pattern":null,"manual":false}
  cover_path text,                 -- {user_id}/covers/{id}.jpg
  texture_path text,               -- {user_id}/textures/{id}.webp
  source text not null default 'manual' check (source in ('aladin', 'csv', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- readings가 "같은 사용자의 책"만 가리키게 하는 복합 외래 키용
  unique (id, user_id)
);

create unique index books_user_isbn13_key on bookchronicle.books (user_id, isbn13);
create index books_user_title_idx on bookchronicle.books (user_id, title);

create trigger books_set_updated_at
  before update on bookchronicle.books
  for each row execute function bookchronicle.set_updated_at();

-- ───────── readings: 독서 기록(한 책에 여러 행) ─────────
create table bookchronicle.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id uuid not null,
  status text not null check (status in ('reading', 'finished', 'dropped')),
  started_at date,
  finished_at date,
  date_approx boolean not null default false,   -- 일 미상 등
  -- 책장 연도 = 완독일의 연도(확정). 완독일이 없으면 null(연도 미상). 직접 넣지 않고 자동 계산합니다.
  year int generated always as (extract(year from finished_at)::int) stored,
  rating numeric(2, 1) check (rating is null or (rating between 0 and 5 and rating * 2 = trunc(rating * 2))),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 다른 사용자의 책을 가리키지 못하게 (book_id, user_id)로 묶어 참조합니다. 책을 지우면 기록도 지워집니다.
  foreign key (book_id, user_id) references bookchronicle.books (id, user_id) on delete cascade
);

create index readings_user_year_idx on bookchronicle.readings (user_id, year);
create index readings_book_id_idx on bookchronicle.readings (book_id);

create trigger readings_set_updated_at
  before update on bookchronicle.readings
  for each row execute function bookchronicle.set_updated_at();

-- ───────── years: 연도별 회고 ─────────
create table bookchronicle.years (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  year int not null check (year between 1900 and 2200),
  book_of_year uuid[] not null default '{}' check (cardinality(book_of_year) <= 3),
  one_liner text check (char_length(one_liner) <= 80),
  updated_at timestamptz not null default now(),
  primary key (user_id, year)
);

create trigger years_set_updated_at
  before update on bookchronicle.years
  for each row execute function bookchronicle.set_updated_at();

-- ───────── settings: 사용자 설정 ─────────
create table bookchronicle.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('system', 'study', 'paper')),
  spine_style text not null default 'generated' check (spine_style in ('generated', 'texture')),
  category_map jsonb not null default '{}',
  pattern_map jsonb not null default '{}',
  last_backup_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on bookchronicle.settings
  for each row execute function bookchronicle.set_updated_at();

-- ───────── aladin_cache: 알라딘 응답 캐시(Edge Function 전용) ─────────
create table bookchronicle.aladin_cache (
  key text primary key,
  value jsonb not null,
  saved_at timestamptz not null default now()
);

create index aladin_cache_saved_at_idx on bookchronicle.aladin_cache (saved_at);
