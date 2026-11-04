-- 책 정보 출처에 kakao를 더합니다 (결정 0008: 알라딘 Open API가 2026-10-30에 종료되어
-- 카카오 책 검색 + 국립중앙도서관 ISBN 서지정보로 바꿈). 기존 값 aladin은 예전 기록용으로 남깁니다.
alter table bookchronicle.books drop constraint books_source_check;
alter table bookchronicle.books
  add constraint books_source_check check (source in ('aladin', 'kakao', 'csv', 'manual'));
