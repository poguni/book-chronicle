-- 북크로니클 표지 버킷과 정책 (PRD 5.5)
-- 비공개 버킷. 경로 첫 폴더가 본인 사용자 ID일 때만 읽기·쓰기·삭제를 허용합니다.
--   표지: {user_id}/covers/{book_id}.jpg · 표지 질감: {user_id}/textures/{book_id}.webp
-- storage.objects는 기존 앱과 함께 쓰는 테이블이므로, 모든 정책을 bucket_id로 한정하고 이름 앞에 bookchronicle을 붙입니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bookchronicle-covers',
  'bookchronicle-covers',
  false,
  1048576, -- 1MB (표지는 300px로 줄여 약 30KB)
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do nothing;

create policy "bookchronicle 본인 표지만 조회" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bookchronicle-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "bookchronicle 본인 폴더에만 올리기" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bookchronicle-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "bookchronicle 본인 표지만 바꾸기" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'bookchronicle-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'bookchronicle-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "bookchronicle 본인 표지만 지우기" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bookchronicle-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
