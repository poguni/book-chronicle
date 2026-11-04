# 0008. 알라딘 Open API 종료 → 카카오 책 검색 + 국립중앙도서관 ISBN 서지정보

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |
| 근거 | Phase 5 배포 후 점검에서 알라딘이 `errorCode 999` "www.aladin.co.kr 도메인을 통한 OpenAPI서비스는 종료되었습니다"를 돌려줌. 알라딘 Open API는 2026-10-30에 종료됨(알라딘 고객센터 공지). 앱 주인이 "카카오 + 국립중앙도서관"을 고름 |

## 무엇을 어디서 받나
| 정보 | 출처 | 비고 |
|---|---|---|
| 제목·저자 검색(최대 20건) | 카카오 책 검색 `GET https://dapi.kakao.com/v3/search/book` | 헤더 `Authorization: KakaoAK {REST 키}`. 하루 무료 한도 3만 건(카카오 쿼터 문서) |
| 제목·저자·출판사·출간일·ISBN·표지 | 카카오 | 표지는 썸네일 주소 안의 원본(`fname`, `t1.daumcdn.net`)을 씀 |
| 쪽수·KDC 분류 | 국립중앙도서관 ISBN 서지정보 `https://www.nl.go.kr/seoji/SearchApi.do` | `cert_key`(회원 가입 → 신청 → 담당자 승인). `PAGE`("332 p." 같은 글자)에서 숫자를 읽음 |

- ISBN 조회(`lookup`)는 카카오(`target=isbn`)와 국립중앙도서관을 함께 불러 합칩니다. 국립중앙도서관 키가 아직 없거나 실패하면 카카오 정보만 돌려줍니다(쪽수는 비어 있고, 분야 평균으로 추정해 그림).
- 국립중앙도서관 JSON의 바깥 구조는 공식 문서에 없어서, `docs` 배열이 있으면 그것을, 없으면 첫 배열을 씁니다. 배포 후 `npm run check:books`로 실제 응답을 확인합니다.
- 판형(`books.size`)은 두 출처 모두 mm 단위로 주지 않아 저장하지 않습니다(null).

## 분야 고르기 (결정 0006의 24개 분야)
1. 제목 낱말이 먼저: 교육평가, 교육심리, 파이썬, 바이브 코딩, 데이터 분석(빅데이터·머신러닝), 통계
2. KDC 분류번호: 004·005 IT & 컴퓨터, 05 학술지, 31 통계학, 32 주식 & 경제, 3 사회과학, 413 통계학, 41 수학, 43 화학, 47~49 생명과학, 4·5 과학, 66 사진 & 카메라, 69 취미, 73 일본어, 74 영어, 7 언어, 98 여행, 1·2·9 인문
3. 맞는 것이 없으면 KDC 주류 이름(예: 8 → "문학", 6 → "예술")을 직접 입력값으로
- `category_raw`에는 `KDC 813.7`처럼 분류번호를 저장해, 나중에 규칙을 바꿔도 다시 계산할 수 있게 합니다.

## 바뀐 이름·값
- Edge Function: `bookchronicle-aladin` → **`bookchronicle-books`**. 예전 함수는 지웁니다(사용자 확인 후).
- 비밀 값: `ALADIN_TTB_KEY` → **`KAKAO_REST_API_KEY`**, **`NLK_CERT_KEY`**. `BOOKCHRONICLE_OWNER_ID`는 그대로. 예전 키는 지웁니다(사용자 확인 후).
- 표지 중계 허용 호스트: `search1.kakaocdn.net`, `t1.daumcdn.net`, `seoji.nl.go.kr`, `www.nl.go.kr`. 넘겨 보내기(redirect)는 이 호스트 안에서만 두 번까지 따라갑니다.
- `books.source`에 `kakao`를 더했습니다(마이그레이션 `0004`). `aladin`은 예전 값으로 남깁니다.
- 캐시 표 `aladin_cache`는 이름만 그대로 두고 함께 씁니다(키 앞에 `kakao:`, `books:`).
- 앱 파일: `src/lib/aladin.ts` → `bookApi.ts`, `aladinMap.ts` → `bookMap.ts`. 출처 표기: "도서 정보: 카카오 책 검색 · 국립중앙도서관".
- 점검 스크립트: `npm run check:books`.

## 기존 독서 앱에 대한 메모
기존 앱(DeliciousLibrary)도 알라딘 `ItemLookUp`을 부르므로 같은 오류가 납니다. 실패하면 Open Library로 대신 찾게 되어 있어 겉으로는 동작하지만, 국내 책 정보가 빠질 수 있습니다. 이 저장소에서는 기존 앱을 고치지 않습니다.

## PRD에 반영할 것 (제안)
PRD 5.6·5.7(알라딘 함수·API 표), F2의 출처 표기, 6.1·6.2의 판형 활용, 6.3 표지 출처를 이 결정에 맞춰 고칩니다.
