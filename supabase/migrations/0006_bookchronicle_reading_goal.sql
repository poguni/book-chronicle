-- 연도별 목표 권수 (결정 0016): 정하지 않은 해는 null. 1~1000권.
-- 기존 RLS 정책(본인 회고만 조회·추가·수정·삭제)이 새 열에도 그대로 적용됩니다.
alter table bookchronicle.years
  add column reading_goal int check (reading_goal is null or reading_goal between 1 and 1000);
