-- 책장 안 책 순서 (결정 0009): 끌어 옮겨 정한 순서. 정하지 않은 기록은 null이고 끝에 완독일순으로 꽂힙니다.
-- 기존 RLS 정책(본인 행만 읽고 고치기)이 새 열에도 그대로 적용됩니다.
alter table bookchronicle.readings
  add column shelf_position int check (shelf_position is null or shelf_position >= 0);
