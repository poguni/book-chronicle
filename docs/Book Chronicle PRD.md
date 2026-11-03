# 북크로니클(Book Chronicle): 제품 기획서(PRD)

| 항목 | 내용 |
|---|---|
| 문서 버전 | v0.9 |
| 작성일 | 2026-11-02 (v0.9 수정: 2026-11-04) |
| 앱 이름 | **북크로니클(Book Chronicle)** |
| 한 줄 소개 | 해마다 한 겹씩 쌓이는 나의 독서 |
| 주제 | 연도별 독서 연대기 & 책장 시각화 |
| 형태 | 웹 앱(SPA), **로그인 필요, 개인 전용(사용자 1명)**, 오프라인 미지원 |
| 주 사용 환경 | **데스크톱 웹 브라우저**(16:10, 1440×900 기준). 스마트폰은 확인용으로 반응형 지원 |
| 백엔드 | **Supabase**(로그인·DB·스토리지·Edge Function). 기존 독서 앱과 **같은 Supabase 프로젝트를 쓰되 완전히 분리** |
| 도서 검색 | 알라딘 Open API(TTB 키 보유), Supabase Edge Function을 거쳐 호출 |
| 코드·배포 | **공개** GitHub 저장소, **GitHub Pages** 자동 배포 |
| 프런트엔드 | **Svelte 5** + TypeScript + Vite |
| 디자인 | 통일 레이아웃 1개 + 테마 2종(서재·종이). 상세는 `design/DESIGN.md` |
| 원 아이디어 | `app-ideas-hobbies.md`의 4-1을 "연대기·책장 시각화" 중심으로 재구성 |
| 난이도 | ★★★ |

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v0.1 | 2026-11-02 | 최초 작성 |
| v0.2 | 2026-11-02 | 앱 이름 확정. Cloudflare Workers 프록시 방식 확정, 프록시 구축 절차 추가 |
| v0.3 | 2026-11-03 | 데스크톱 우선·반응형. 통일 레이아웃 + 테마 2종. 생성형 책등, 꺼내 보기, 표지 질감 모드 추가 |
| v0.4 | 2026-11-03 | **구성 전면 변경**: Cloudflare를 빼고 GitHub(코드·배포) + Supabase(로그인·DB·스토리지·Edge Function)로 전환. 기존 독서 앱과 같은 Supabase 프로젝트를 `ringshelf` 스키마로 분리해 공유. 로그인(F0)과 RLS 추가, 오프라인 지원 제외(IndexedDB 저장 제거), 데스크톱·스마트폰 자동 공유. 프로젝트 폴더 구조(`docs/`, `design/` 등) 추가 |
| v0.5 | 2026-11-03 | UI 프레임워크 **Svelte 5 확정**. DESIGN.md v1.1·시안과 맞춤(로그인 화면, 사이드바 계정 영역, 저장·연결 상태). 폴더 구조에 `Sidebar.svelte`, `theme.ts` 추가, 전체 문구 점검 |
| v0.6 | 2026-11-03 | GitHub 저장소 **공개**로 확정. 책장에 꽂히는 연도 기준을 **완독일로 확정**하고 설정의 '한 해의 기준' 선택 항목과 `settings.year_basis` 컬럼 제거 |
| v0.7 | 2026-11-03 | 앱 이름을 **북크로니클(Book Chronicle)**로 변경. 코드 식별자를 `bookchronicle`로 통일(저장소, Supabase 스키마, 버킷, Edge Function, 백업 파일). 나이테는 디자인 모티프로 유지 |
| v0.8 | 2026-11-03 | Claude Code 작업 안내서 `CLAUDE.md`와 단계별 구현 계획 `docs/IMPLEMENTATION_PLAN.md`를 폴더 구조(9장)에 추가, 화면 문구 모음 `src/lib/i18n/ko.ts` 추가, 12장에 구현 계획 참조 추가 |
| v0.9 | 2026-11-04 | 기존 앱 분석 결과 반영(`docs/decisions/existing-app-analysis.md`): 로그인은 **이메일 + 비밀번호로 확정**, 회원 가입은 기존 앱이 쓰므로 **차단하지 않음**, Auth의 Site URL·Redirect URLs는 바꾸지 않음, 알라딘 Edge Function은 새로 만들고 **앱 주인 사용자 ID만 허용**. GitHub 저장소 이름을 `book-chronicle`로 확정(배포 주소 `/book-chronicle/`) |

## 앱 이름

**북크로니클 (Book Chronicle)**: 해마다 한 겹씩 쌓이는 나의 독서

- 의미: 처음 기획 제목인 **'독서 연대기'**를 그대로 담은 이름입니다. 해마다 한 칸씩 늘어나는 책장이 곧 나의 독서 연대기가 됩니다.
- 표기 규칙: 한글 화면에서는 "북크로니클", 영문에서는 "Book Chronicle"(띄어 씀), 코드·주소에서는 소문자 `bookchronicle`(띄어쓰기·하이픈 없음).
- 코드 식별자: GitHub 저장소 `poguni/book-chronicle`(예외적으로 하이픈 있음, 배포 주소 `https://poguni.github.io/book-chronicle/`), Supabase 스키마 `bookchronicle`, 스토리지 버킷 `bookchronicle-covers`, Edge Function `bookchronicle-aladin`, 백업 파일 `bookchronicle-backup-YYYYMMDD.json`
- 디자인 모티프: 이전 이름(나이테 책장)에서 쓰던 **나이테(동심원)**는 연도를 겹겹이 보여 주는 시각화로 계속 씁니다('연도별 나이테', '올해의 나이테').
- 이름 변경 기록: 나이테 책장(Ringshelf, v0.2~v0.6) → **북크로니클(Book Chronicle, v0.7~)**
- 검토했던 다른 후보: 북로니클(Bookronicle), 크로노셸프(Chronoshelf), 책력(Almanook), 리드라인(Readline), 한해책(Yearbook), 책등 연대기(Spine Chronicle), 해마다 서가(Yearshelf)

---

## 1. 개요

### 1.1 배경
독서 기록 앱은 많지만, 대부분 목록과 숫자(권수, 별점) 중심입니다. 몇 년치 기록이 쌓여도 "그해에 나는 어떤 책을 읽었나"를 한눈에 느끼기 어렵습니다. 실제 책장 앞에 서면 책 두께와 색깔만으로도 기억이 되살아나는데, 디지털 기록에는 그런 감각이 없습니다.

이 앱은 다음 세 가지를 결합합니다.

1. **책장 시각화**: 쪽수로 책등 두께를, 표지에서 뽑은 색과 분야별 무늬로 책등을 자동으로 만들어 연도별 책장에 꽂아 보여 줍니다.
2. **연도 비교 분석**: 권수, 쪽수, 분야 비중, 월별 추이를 여러 해에 걸쳐 겹쳐 봅니다.
3. **회고 의식**: "그해의 책"을 고르고 한 줄 회고를 남기며, 연말 회고 카드를 이미지로 내보내 공유합니다.

### 1.2 목표
- 해마다 읽은 책을 **한 칸의 책장**으로 보여 주어, 독서 이력을 시각적으로 기억하게 합니다.
- 연도 사이의 변화(많이 읽은 해, 분야가 바뀐 해, 독서가 몰린 달)를 숫자와 그래프로 비교합니다.
- 책 한 권 등록에 **10초 이내**가 걸리도록 ISBN·제목 검색으로 정보를 자동 입력합니다.
- 기존 기록(엑셀, 다른 앱)을 CSV로 가져와 첫날부터 여러 해의 책장을 채울 수 있게 합니다.
- **데스크톱에서 기록하고, 스마트폰에서는 로그인만 하면 같은 책장을 확인**할 수 있게 합니다.
- 새로운 서비스를 늘리지 않고, 이미 쓰고 있는 **GitHub와 Supabase 무료 요금제 안에서** 운영합니다.

### 1.3 범위에서 제외하는 것 (Non-goals)
- **오프라인 사용**(인터넷 연결이 있어야 동작합니다)
- 여러 사용자, 회원 가입, 친구·피드·댓글 같은 소셜 기능 (사용자는 1명)
- 기존 독서 앱과의 데이터 교환·공유 (같은 Supabase 프로젝트를 쓰지만 데이터는 완전히 분리)
- Cloudflare 등 GitHub·Supabase 외의 추가 서비스
- 인용문·독서 노트 중심 기능 (P2로 미룸)
- 전자책 뷰어, 도서 구매·대여 연동, AI 추천

---

## 2. 사용자와 사용 시나리오

### 2.1 주 사용자
- 앱 주인 1명. 1년에 10~100권을 읽고, 읽은 책을 남겨 두고 싶은 개인 독자
- 주로 **데스크톱 브라우저**에서 기록하고, 가끔 **스마트폰**으로 책장을 확인
- 엑셀이나 다른 앱에 몇 년치 기록이 있어 옮겨 오고 싶음

### 2.2 대표 시나리오

**시나리오 A: 책 한 권 추가 (데스크톱, 일상)**
1. 브라우저에서 앱을 엽니다. 이미 로그인되어 있어 바로 책장이 보입니다.
2. 사이드바의 "책 한 권 꽂기"를 누르고 제목 일부를 입력합니다.
3. 알라딘 검색 결과에서 책을 고르면 제목, 저자, 출판사, 쪽수, 분야, 표지가 채워지고, 표지에서 뽑은 색으로 책등 미리 보기가 나옵니다.
4. 다 읽은 날짜와 별점, 한 줄 메모를 넣고 저장하면 올해 책장 끝에 새 책등이 꽂힙니다.

**시나리오 B: 과거 기록 옮기기 (첫 사용)**
1. 엑셀에 정리해 둔 2019~2025년 독서 목록을 CSV로 저장합니다.
2. 앱에서 CSV를 불러오고, 열(제목, 저자, ISBN, 완독일)을 앱 항목에 맞춥니다.
3. 앱이 ISBN 또는 제목으로 알라딘에서 쪽수·표지·분야를 보충합니다. 못 찾은 책은 목록으로 따로 보여 줍니다.
4. 7개 연도의 책장이 한꺼번에 생깁니다.

**시나리오 C: 스마트폰으로 확인**
1. 서점에서 "이 책 읽었던가?"가 궁금해 스마트폰으로 앱 주소를 엽니다(처음 한 번만 로그인).
2. 검색창에 제목을 넣거나 연도 책장을 훑어 확인합니다. 데스크톱에서 기록한 내용이 그대로 보입니다.

**시나리오 D: 연말 회고 (12월)**
1. 2026년 책장에서 "그해의 책"을 1권 고르고, 한 줄 회고를 씁니다.
2. 연도 비교 화면에서 2025년과 겹쳐 보며 "올해는 인문 비중이 늘었다"를 확인합니다.
3. 회고 카드를 PNG로 저장해 SNS에 올립니다.

---

## 3. 전체 사용 흐름

```
[앱 열기] ─ 로그인 세션 있음? ─ 아니요 → [로그인 화면] ─┐
                    │ 예                                  │
                    ▼                                     ▼
              [책장 홈: 사이드바 · 연도별 책장 · 상세 패널]
     ┌─────────────┬──────────┴───┬──────────────┬──────────────┐
     ▼             ▼              ▼              ▼              ▼
 [책 꽂기]    [책 누르기]     [연도 비교]     [연말 회고]    [설정·가져오기·백업]
 알라딘 검색   꺼내 보기 →     지표 겹쳐 보기  그해의 책·     테마·책등 스타일
 → 저장        상세 패널 갱신                  카드 내보내기  CSV·JSON·로그아웃
```

---

## 4. 기능 요구사항

우선순위: **P0** = 첫 버전(MVP) 필수, **P1** = 첫 버전에 넣으면 좋음, **P2** = 이후 버전

### F0. 로그인 (P0) ※ v0.4 신규
- Supabase Auth로 로그인합니다. **기존 독서 앱과 같은 계정**을 씁니다.
- 로그인 방식은 **이메일 + 비밀번호**입니다(기존 앱과 같은 방식, 확정). 소셜 로그인은 넣지 않습니다.
- 로그인 세션을 브라우저에 유지해, 데스크톱·스마트폰에서 각각 한 번만 로그인하면 됩니다.
- 회원 가입 화면은 만들지 않습니다. 다만 기존 앱이 회원 가입을 쓰므로 Supabase의 회원 가입은 **막지 않습니다**(5.3). 다른 가입자가 로그인해도 RLS 때문에 자기 빈 책장만 보입니다.
- 설정에 로그아웃 버튼을 둡니다.
- 로그인하지 않은 상태에서는 로그인 화면 외에 아무 데이터도 불러오지 않습니다.

### F1. 책 추가·수정·삭제 (P0)
- 입력 항목: 제목, 저자, 출판사, 출간일, ISBN-13, 쪽수, 분야, 표지 이미지, 책등 팔레트·패턴
- 독서 기록 항목: 상태(읽는 중·완독·중단), 시작일, 완독일, 별점(0.5 단위, 5점 만점), 한 줄 메모
- 같은 책을 다시 읽으면 **독서 기록을 하나 더 추가**합니다. 책 정보는 한 번만 저장하고, 기록은 여러 개를 가질 수 있습니다.
- 책장에 꽂히는 연도는 **완독일의 연도**를 기준으로 합니다(확정, 설정으로 바꾸지 않음). 완독일이 없으면 "연도 미상" 칸에 둡니다.
- 수동 입력도 지원합니다(검색 결과가 없는 독립 출판물, 외서 등).
- 책을 삭제하면 그 책의 독서 기록과 스토리지의 표지·질감 이미지도 함께 지웁니다.

### F2. 도서 정보 자동 입력 (P0)
- **ISBN 검색**: ISBN-10 또는 ISBN-13을 입력하면 알라딘 상품 조회로 한 권을 바로 채웁니다. ISBN-10은 ISBN-13으로 변환해 저장합니다.
- **제목·저자 검색**: 알라딘 상품 검색으로 최대 20건을 보여 주고, 표지 썸네일·저자·출판사·출간 연도로 구분하게 합니다.
- 입력 후 300ms 디바운스, 최근 검색어 5개 기억
- 바코드 스캔(P1): 스마트폰에서 카메라로 ISBN 바코드를 읽습니다.
- 자동 입력된 값은 모두 사용자가 고칠 수 있습니다.
- 화면에 **"도서 DB 제공: 알라딘 인터넷서점"** 출처를 표기합니다(알라딘 API 이용 조건).

### F3. CSV 가져오기 (P0)
- UTF-8과 CP949(엑셀 기본 한글 인코딩) 파일을 모두 읽습니다. 인코딩을 자동 판별하고, 깨지면 사용자가 직접 고를 수 있게 합니다.
- **열 매핑 화면**: CSV의 열 이름을 앱 항목(제목, 저자, ISBN, 쪽수, 완독일, 별점, 메모, 분야)에 맞춥니다. 이름이 비슷하면 자동으로 맞춰 둡니다.
- 날짜 형식 자동 인식: `2025-03-14`, `2025.3.14`, `2025/03/14`, `20250314`, `2025-03`(일 없음 → 15일로 저장하고 "일 미상" 표시)
- **보충 조회**: ISBN이 있으면 ISBN으로, 없으면 "제목 + 저자"로 알라딘에서 쪽수·표지·분야를 채웁니다. 진행 막대를 보여 주고 중간에 멈출 수 있습니다.
- 미리 보기에서 행별 상태를 표시합니다: 정상, 정보 보충됨, 후보 여러 개(직접 선택), 찾지 못함
- 중복 판정: ISBN이 같거나, 제목·저자가 같으면 중복 후보로 표시하고 "건너뛰기 / 독서 기록만 추가 / 덮어쓰기" 중에서 고릅니다.
- 프리셋(P1): Goodreads 내보내기 CSV 형식을 바로 인식합니다.

### F4. 연도별 책장 뷰 (P0) ※ 핵심 기능
- 연도마다 책장 한 칸(선반)을 그리고, 그해 완독한 책을 **완독일 순서**로 왼쪽부터 꽂습니다. 최신 연도가 맨 위에 옵니다.
- **책등 자동 생성** (상세 규칙은 6장)
  - 두께: 쪽수에 비례 (최소·최대 두께 제한, 책장 폭에 따라 배율 조정)
  - 높이: 판형 정보가 있으면 반영, 없으면 책마다 고정된 작은 변화를 줌
  - 무늬: 표지에서 뽑은 **3색 팔레트**와 분야별 **책등 패턴**(하드커버·페이퍼백·라벨형)으로 만든 **생성형 책등**이 기본
  - 글자: 세로쓰기로 제목(필요하면 줄임), 아래쪽에 저자. 바탕색에 맞춰 밝은 글자·어두운 글자를 자동 선택
- **꺼내 보기** (6.6): 마우스를 올리면 책이 살짝 들리고, 누르면 앞으로 빠져나오며 옆으로 돌아 **실제 표지**가 보이고, 오른쪽 상세 패널이 그 책의 기록으로 바뀝니다.
- 선반 폭을 넘으면 다음 단으로 넘깁니다(한 연도가 여러 단이 될 수 있음).
- 선반 위쪽에 연도와 그해 요약(권수, 총 쪽수, 그해의 책)을 표시합니다.
- 보기 옵션
  - 정렬: 완독일순(기본) / 색상순(무지개 책장) / 분야순 / 별점순 / 쪽수순
  - 강조: 특정 분야나 별점 4.5 이상만 진하게, 나머지는 흐리게
  - 밀도: 연도 목록 / 한 해 크게 보기 / 지난해 접기(책등 색 띠로 접어 보기)
- 그해의 책은 책등에 작은 책갈피 끈을 답니다.
- 읽는 중인 책은 선반 끝에 비스듬히 기대어 놓은 모습으로 표시합니다(P1).

### F5. 연도 비교 (P0)
- 비교할 연도를 2~5개 고릅니다(기본값: 올해와 작년).
- **지표 카드**: 권수, 총 쪽수, 평균 쪽수, 평균 별점, 가장 두꺼운 책, 가장 많이 읽은 분야. 작년 대비 증감을 화살표와 %로 표시
- **월별 그래프**: 월별 권수(또는 쪽수)를 연도별 선으로 겹쳐 봅니다. "누적" 토글로 연중 페이스를 비교합니다.
- **분야 비중**: 연도별 100% 누적 막대로 분야 구성 변화를 보여 줍니다. 상위 6개 + 기타.
- **연도별 추이**(P1): 전체 연도의 권수·쪽수 막대
- 연도 색은 밝기 차이와 선 모양(실선·점선)으로도 구분되게 합니다(색약 배려).
- 표로 보기 토글: 그래프와 같은 값을 표로 보여 줍니다.

### F6. "그해의 책"과 한 줄 회고 (P0)
- 연도마다 "그해의 책"을 1권 고릅니다(P1: 최대 3권까지 순위로).
- 한 줄 회고: 연도 전체에 대한 한 줄(최대 80자). 책별 한 줄 메모와는 별도입니다.
- 선택하지 않은 해는 별점이 가장 높은 책을 "후보"로 제안만 하고, 자동으로 정하지는 않습니다.
- 12월 1일 이후 앱을 열면 "올해의 책을 골라 볼까요?" 안내를 한 번 띄웁니다.

### F7. 연말 회고 카드 이미지 내보내기 (P0)
- 카드 구성: 연도, 그해의 책장(축소 이미지), 권수·총 쪽수·최다 분야, 그해의 책 표지와 제목, 한 줄 회고, 앱 이름 워터마크
- 크기 프리셋: 정사각형 1080×1080, 세로 1080×1350(인스타그램 피드), 스토리 1080×1920
- 테마 3종: 서재(어두움), 종이(밝음), 책등 색(그해 책등 팔레트로 만든 배경). 기본값은 현재 앱 테마
- 내보내기: PNG 저장. 스마트폰에서는 Web Share API로 바로 공유
- 표지는 Supabase Storage에서 로그인 상태로 내려받은 이미지(Blob)를 써서, 캔버스 보안 제한(CORS) 없이 그립니다.

### F8. 검색·필터 (P1)
- 전체 책 목록에서 제목·저자 검색, 분야·별점·연도 필터
- 다시 읽은 책 모아 보기
- 스마트폰 확인용으로 검색창은 화면 위쪽에 항상 둡니다.

### F9. 백업·내보내기 (P0)
- 데이터의 원본은 Supabase에 있지만, 무료 요금제는 사용자가 내려받을 수 있는 백업이 제한적이므로 **사용자가 직접 받는 백업**을 제공합니다.
- **JSON 백업**: 책, 독서 기록, 연도 회고, 설정을 한 파일로 저장(표지 이미지는 선택)
- **JSON 복원**: 덮어쓰기 또는 합치기 선택
- **CSV 내보내기**: 엑셀에서 열 수 있도록 UTF-8 BOM 포함
- 마지막 백업 후 30일이 지나면 백업을 권하는 안내를 띄웁니다.

### F10. 설정 (P0)
- **테마**: 서재(어두움) / 종이(밝음) / 시스템 설정 따름(기본). 두 테마는 기능과 배치가 같고 색·글꼴·선반 재질·장식만 다릅니다(10.3).
- **책등 스타일**: 생성형 책등(기본) / 표지 질감 모드 (6.5)
- **움직임 줄이기**: 꺼내 보기 회전 애니메이션 끄기(운영체제의 '동작 줄이기' 설정을 기본으로 따름)
- 분야 이름 바꾸기·합치기, 분야별 책등 패턴 바꾸기
- 도서 검색 연결 확인 버튼, 로그인 계정 표시, 로그아웃
- 설정은 Supabase에 저장되어 데스크톱과 스마트폰에 똑같이 적용됩니다(움직임 줄이기만 기기별 저장).

### F11. 스마트폰 확인 (P1)
- 같은 주소, 같은 계정으로 로그인하면 데스크톱과 같은 데이터가 보입니다.
- 900px 미만 화면에서는 상단 바 + 접히는 메뉴 + 책장 1단 배치(10.1).
- 홈 화면에 바로 가기를 추가할 수 있도록 웹 앱 매니페스트와 아이콘을 제공합니다. 오프라인 동작(서비스 워커 캐시)은 넣지 않습니다.

---

## 5. 시스템 구성과 Supabase 설계

### 5.1 전체 구성
```
[GitHub 저장소 book-chronicle] ──GitHub Actions──▶ [GitHub Pages: 앱 화면(정적 파일)]
                                                  │  supabase-js (공개 anon 키 + 로그인 토큰)
                                                  ▼
                          ┌──────────── Supabase 프로젝트 (기존 독서 앱과 공유) ───────────┐
                          │ Auth          : 사용자 계정(기존 앱과 공통)                    │
                          │ DB            : public 스키마 = 기존 앱 / bookchronicle 스키마 = 이 앱 │
                          │ Storage       : 기존 앱 버킷 / bookchronicle-covers 버킷            │
                          │ Edge Function : bookchronicle-aladin ──▶ 알라딘 Open API          │
                          │ Secrets       : ALADIN_TTB_KEY                                │
                          └───────────────────────────────────────────────────────────────┘
```
- 앱은 정적 파일만으로 이루어진 SPA이며, 서버 로직은 Edge Function 하나뿐입니다.
- GitHub Pages는 서버 주소 처리 기능이 없으므로 앱 안 주소는 해시 방식(`#/compare`, `#/recap/2026`)을 씁니다.

### 5.2 기존 독서 앱과 Supabase 프로젝트 공유 원칙
무료 요금제의 활성 프로젝트 수 제한(2개) 때문에 기존 독서 앱의 Supabase 프로젝트를 함께 씁니다. 두 앱은 데이터를 주고받지 않습니다.

| 영역 | 기존 앱 | 북크로니클 | 원칙 |
|---|---|---|---|
| DB | `public` 스키마(기존 그대로) | **`bookchronicle` 스키마** | 기존 테이블은 읽지도 고치지도 않음. 마이그레이션은 항상 `bookchronicle.` 스키마를 명시 |
| Storage | 기존 버킷 | **`bookchronicle-covers` 버킷** | 버킷을 분리하고 정책도 따로 |
| Edge Function | 기존 함수(있다면) | **`bookchronicle-aladin`** | 이름 앞에 `bookchronicle-`를 붙여 구분. 기존 앱이 이미 알라딘 함수를 쓰면 재사용 여부 검토 |
| Auth | 공통 | 공통 | 같은 계정 사용. 설정 변경은 기존 앱 영향 확인 후 |
| 비밀 값 | 공통 저장소 | `ALADIN_TTB_KEY` | 기존 앱도 같은 키를 쓰면 하루 호출 한도를 나눠 씀 |

- `bookchronicle` 스키마는 Supabase 대시보드의 API 설정에서 **노출 스키마(Exposed schemas)**에 추가해야 앱에서 접근할 수 있습니다.
- 무료 요금제의 DB·스토리지·함수 호출 한도를 두 앱이 함께 씁니다. 이 앱의 예상 사용량(책 1,000권 기준 DB 수 MB, 표지 약 30MB)은 한도에 비해 작습니다. 최신 한도는 개발 시작 시 확인합니다.

### 5.3 인증(Auth)
- 방식: **이메일 + 비밀번호**(`signInWithPassword`, 확정). 기존 앱과 같은 계정을 씁니다.
- **Auth 설정은 바꾸지 않습니다.** 이메일 + 비밀번호 로그인은 메일 링크나 소셜 로그인처럼 앱으로 돌아오는 주소가 필요 없으므로, 기본 사이트 주소(Site URL)와 추가 리디렉션 주소(Redirect URLs)를 그대로 둡니다. 나중에 비밀번호 재설정 메일 같은 기능을 넣을 때만 Redirect URLs 추가를 검토합니다(사용자 확인 후).
- 회원 가입은 **막지 않습니다**(기존 앱이 가입과 관리자 승인 절차를 씀). 그래서 누구나 가입해 `authenticated` 역할을 얻을 수 있다고 가정하고 설계합니다.
  - DB·Storage: RLS "본인 행만"으로 앱 주인의 데이터를 보호합니다.
  - Edge Function: 앱 주인 사용자 ID만 허용합니다(5.6).
- 이메일 문구 템플릿은 두 앱 공통이므로 이 앱 때문에 바꾸지 않습니다.

### 5.4 DB 보안: RLS(행 수준 보안)
앱의 공개 키(anon key)는 브라우저 코드에 들어가 누구나 볼 수 있으므로, **보안은 로그인 + RLS로 지킵니다.**

- `bookchronicle` 스키마의 모든 테이블에 RLS를 켜고, **본인 행만** 읽고 쓰게 합니다.
- 권한은 로그인한 사용자(`authenticated`)에게만 주고, 로그인하지 않은 사용자(`anon`)에게는 주지 않습니다.

```sql
create schema if not exists bookchronicle;
grant usage on schema bookchronicle to authenticated;

-- 예: books 테이블 (다른 테이블도 같은 방식)
alter table bookchronicle.books enable row level security;
grant select, insert, update, delete on bookchronicle.books to authenticated;

create policy "본인 책만 조회" on bookchronicle.books
  for select to authenticated using (user_id = (select auth.uid()));
create policy "본인 책만 추가" on bookchronicle.books
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "본인 책만 수정" on bookchronicle.books
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "본인 책만 삭제" on bookchronicle.books
  for delete to authenticated using (user_id = (select auth.uid()));
```

- 알라딘 검색 캐시 테이블(`bookchronicle.aladin_cache`)은 RLS만 켜고 정책을 두지 않아, Edge Function(서비스 키)만 접근하게 합니다.

### 5.5 Storage: 표지와 표지 질감 이미지
- 버킷 `bookchronicle-covers`는 **비공개(private)**로 만들고, 경로 첫 단계를 사용자 ID로 둡니다.
  - 표지: `{user_id}/covers/{book_id}.jpg` (가로 최대 300px로 줄여 저장, 약 30KB)
  - 표지 질감: `{user_id}/textures/{book_id}.webp` (64×256px, 수 KB)
- 정책: 경로의 첫 폴더가 `auth.uid()`와 같을 때만 읽기·쓰기·삭제를 허용합니다.
- 앱은 로그인 상태에서 이미지를 **Blob으로 내려받아** 화면에 표시하고, 같은 Blob으로 색 추출·회고 카드를 그립니다. 그래서 캔버스 CORS 문제가 생기지 않습니다.
- 한 번 내려받은 표지는 브라우저 메모리에 두어 같은 화면 안에서 다시 내려받지 않습니다.

### 5.6 Edge Function: 알라딘 프록시 `bookchronicle-aladin`
TTB 키를 브라우저에 노출하지 않고, 알라딘 API의 CORS 제한을 피하기 위해 알라딘 호출은 모두 이 함수를 거칩니다.

| 요청 | 하는 일 | 돌려주는 값 |
|---|---|---|
| `action: "search"`, `q`, `type` | 알라딘 상품 검색(ItemSearch) | 필요한 필드만 추린 책 목록 |
| `action: "lookup"`, `isbn` | 알라딘 상품 조회(ItemLookUp) | 책 한 권(쪽수 포함) |
| `action: "importCover"`, `bookId`, `coverUrl` | 알라딘 표지를 받아 줄인 뒤 Storage `{user_id}/covers/{bookId}.jpg`에 저장 | 저장 경로 |

- **앱 주인만 호출 가능**: 함수의 JWT 검증으로 로그인한 사용자만 받고, 그 사용자 ID가 비밀 값 `BOOKCHRONICLE_OWNER_ID`와 같을 때만 처리합니다. 회원 가입이 열려 있어도(5.3) 다른 가입자는 TTB 키 한도를 쓸 수 없습니다.
- 응답에 GitHub Pages 주소와 개발 주소만 허용하는 CORS 헤더를 붙입니다.
- `coverUrl`은 알라딘 이미지 도메인만 허용합니다(아무 이미지나 중계하지 않도록).
- 검색 결과는 `bookchronicle.aladin_cache`에 24시간 캐시합니다.
- 배포: Supabase CLI로 `supabase functions deploy bookchronicle-aladin`, 비밀 값 등록은 `supabase secrets set ALADIN_TTB_KEY=... BOOKCHRONICLE_OWNER_ID=...` (값은 저장소에 올리지 않음).
- **새로 만듭니다**(확정). 기존 앱은 자기 Next.js 서버에서 알라딘을 부르고, 공유 프로젝트에는 Edge Function이 없습니다. TTB 키는 기존 앱과 같은 키를 쓰므로 하루 호출 한도를 나눠 씁니다.

### 5.7 알라딘 Open API 사용 사항
| API | 용도 | 주요 파라미터 |
|---|---|---|
| 상품 검색 `ItemSearch.aspx` | 제목·저자 검색 | `Query`, `QueryType=Title`·`Author`·`Keyword`, `MaxResults=20`, `SearchTarget=Book`, `Cover=Big`, `Output=js`, `Version=20131101` |
| 상품 조회 `ItemLookUp.aspx` | ISBN으로 한 권 조회, 쪽수 보충 | `ItemId`, `ItemIdType=ISBN13`, `Cover=Big`, `Output=js`, `Version=20131101` |

- 받아 쓰는 값: `title`, `author`, `publisher`, `pubDate`, `isbn13`, `cover`, `categoryName`, `subInfo.itemPage`(쪽수, 상품 조회에서 제공)
- 표지 크기: 공식 옵션 중 가장 큰 `Cover=Big`은 가로 약 200px입니다. 더 큰 이미지 주소는 공식 기능이 아니므로 선택 사항으로만 둡니다.
- 판형 크기 정보 제공 여부, 하루 호출 한도, 이용 약관(비상업적 이용, 출처 표기)은 개발 시작 시 확인합니다.

### 5.8 분야 매핑
알라딘 `categoryName`은 `국내도서>소설/시/희곡>한국소설>2000년대 이후 한국소설`처럼 계층으로 옵니다.

- 2번째 단계(예: `소설/시/희곡`, `인문학`, `경제경영`, `과학`)를 앱의 **기본 분야**로 씁니다.
- 1번째 단계가 `외국도서`면 2번째 단계 앞에 "외서" 표시를 붙입니다.
- 사용자는 설정에서 분야 이름을 바꾸거나 합칠 수 있습니다.
- 원래 `categoryName` 전체는 따로 저장해, 나중에 매핑 규칙을 바꿔도 다시 계산할 수 있게 합니다.

### 5.9 호출 안정성
- 요청 시간 제한 8초, 실패 시 1회 재시도. 실패하면 "검색이 잠시 안 돼요. 직접 입력할 수 있어요" 안내와 수동 입력 전환
- CSV 보충 조회는 동시에 2건씩, 요청 사이 200ms 간격
- Edge Function의 첫 호출 지연(콜드 스타트)을 고려해 검색창에 입력을 시작하면 미리 가벼운 호출로 깨워 둡니다(P1).

---

## 6. 책장 시각화 규칙

화면에 그리는 방법(색, 글꼴, 치수, 애니메이션)은 `design/DESIGN.md`에 정리하고, 이 장은 **데이터에서 책등을 만드는 규칙**을 다룹니다.

### 6.1 책등 두께
```
두께(px) = clamp(최소 8, 최대 9cqw, 쪽수 × 0.019cqw)   ※ cqw = 책장 폭의 1%
```
- 1440px 화면에서 300쪽 → 약 40px
- 쪽수를 모르면 분야 평균 쪽수, 그것도 없으면 280쪽으로 가정하고 책등에 점선 테두리를 둘러 "추정값"임을 표시합니다.
- 판형 두께(mm) 정보가 있으면 쪽수 대신 그 값을 씁니다.

### 6.2 책등 높이
- 기본 높이: 선반 높이의 80~95% 사이
- 판형 세로 길이(mm)가 있으면 그 비율대로, 없으면 책 ID로 만든 고정 난수로 ±8% 변화를 줍니다.

### 6.3 표지 팔레트 추출 (3색)
1. 표지 이미지를 64×64로 줄여 캔버스에 그립니다.
2. 흰색·검은색에 가까운 픽셀(밝기 5% 미만, 95% 초과)과 채도가 아주 낮은 테두리 픽셀을 제외합니다.
3. 남은 픽셀을 **k-평균(k=5)**으로 묶고 다음 세 색을 고릅니다.
   - **바탕색(base)**: "픽셀 수 × (0.5 + 채도)" 점수가 가장 높은 묶음
   - **띠색(band)**: 바탕색과 밝기 차이가 가장 큰 묶음(명암비 2:1 이상 우선)
   - **강조색(accent)**: 나머지 중 채도가 가장 높은 묶음. 없으면 띠색을 조금 밝게 또는 어둡게 바꿔 만듦
4. 결과가 거의 무채색이면 무채색 그대로 씁니다.
5. 추출은 Web Worker에서 돌려 화면이 멈추지 않게 하고, 결과는 `books.spine`에 저장해 다시 계산하지 않습니다.
6. 사용자는 책 편집 화면에서 후보 5색을 보고 세 색을 각각 바꿀 수 있습니다.

### 6.4 생성형 책등 패턴 (기본 책등)
| 패턴 | 생김새 | 기본 분야 |
|---|---|---|
| **하드커버(hardcover)** | 바탕색 위 위·아래 끝 근처에 가는 띠 두 줄씩(강조색, 금박 느낌), 아래쪽에 출판사 자리 사각 표시 | 인문, 역사, 과학, 사회, 경제경영 |
| **페이퍼백(paperback)** | 위쪽 18%를 띠색 블록으로 칠하고, 그 아래 바탕색에 제목, 맨 아래 강조색 가는 줄 | 소설/시/희곡, 장르소설 |
| **라벨형(label)** | 바탕색 가운데에 밝은 띠색 라벨 상자를 두고 그 안에 제목 | 에세이, 예술, 자기계발, 기타 |

- 분야별 기본 패턴은 설정에서 바꿀 수 있고, 책마다 따로 지정할 수도 있습니다.
- 모든 패턴 공통: 옅은 종이·천 질감과 좌우 가장자리 밝기 차이로 둥근 책등 느낌을 줍니다.
- 그해의 책은 책갈피 끈(테마의 장식색)을 아래로 늘어뜨립니다.
- 무작위 요소는 모두 책 ID로 만든 고정 난수를 써서 항상 같은 책등이 나오게 합니다.

### 6.5 표지 질감 모드 (설정에서 선택)
- 책등 바탕에 **표지 이미지를 크게 늘리고 흐리게(blur) 처리한 그림**을 깔고, 그 위에 바탕색을 35~50% 덧칠해 제목이 잘 읽히게 합니다.
- 책을 등록할 때 앱이 Canvas로 **64×256px 흐림 이미지(WebP)**를 만들어 Storage `{user_id}/textures/{book_id}.webp`에 저장합니다. 질감 모드를 처음 켤 때 질감 이미지가 없는 책은 한 번에 만들어 둡니다.
- 표지가 없는 책은 생성형 책등으로 자동 대체합니다.

### 6.6 꺼내 보기 상호작용
| 상태 | 동작 |
|---|---|
| 마우스 올림·키보드 포커스 | 책이 위로 8px 들림, 그림자 진해짐 |
| 누름(선택) | 책이 위로 들리며 앞으로 나오고 Y축으로 약 60° 돌아 **표지 면**이 보임. 상세 패널이 이 책으로 바뀜 |
| 다른 책 누름·Esc | 이전 책은 제자리로 돌아감 |
| 움직임 줄이기 켜짐 | 회전 없이 들림 + 테두리 강조만 |

- 표지 면에는 Storage의 표지 이미지를 씁니다. 표지가 없으면 팔레트로 만든 간이 표지(제목·저자 조판)를 보여 줍니다.
- 책은 CSS 3D로 **책등 면 + 표지 면** 두 면을 가진 상자로 만듭니다.

### 6.7 글자 색과 가독성
- 글자가 놓이는 바탕(패턴에 따라 바탕색 또는 라벨색)과 밝은·어두운 글자색의 명암비를 계산해 더 높은 쪽(WCAG 4.5:1 이상 목표)을 씁니다.
- 제목은 세로쓰기(`writing-mode: vertical-rl`). 책등이 14px 미만이면 제목을 숨기고 상세 패널에서만 보여 줍니다.

### 6.8 그리기 방식
- 생성형 책등은 HTML 요소와 CSS로 그립니다(테마 즉시 반영, 클릭·포커스·스크린 리더 지원).
- 표지 질감 모드의 흐림 그림만 미리 만든 이미지(6.5)를 씁니다.
- 회고 카드 이미지는 같은 데이터를 Canvas에 다시 그려 PNG로 만듭니다.

---

## 7. 데이터 모델

### 7.1 테이블 구성 (`bookchronicle` 스키마)
모든 테이블에 `user_id uuid not null default auth.uid() references auth.users on delete cascade`와 5.4의 RLS 정책을 둡니다.

| 테이블 | 기본 키 | 주요 인덱스·제약 | 내용 |
|---|---|---|---|
| `books` | `id uuid` | `(user_id, isbn13)` 고유, `(user_id, title)` | 책 정보(한 권당 1행) |
| `readings` | `id uuid` | `(user_id, year)`, `book_id` 외래 키(책 삭제 시 함께 삭제) | 독서 기록(한 책에 여러 행 가능) |
| `years` | `(user_id, year)` | | 연도별 회고(그해의 책, 한 줄 회고) |
| `settings` | `user_id` | | 사용자 설정(테마, 책등 스타일, 분야·패턴 매핑) |
| `aladin_cache` | `key text` | `saved_at` | 알라딘 응답 캐시(Edge Function 전용, `user_id` 없음) |

### 7.2 컬럼

```sql
-- books
id uuid primary key default gen_random_uuid(),
user_id uuid not null default auth.uid(),
isbn13 text,
title text not null,
author text,
publisher text,
pub_date date,
pages int,
pages_estimated boolean not null default false,
category_raw text,              -- 알라딘 categoryName 전체
category text,                  -- 앱 분야
size jsonb,                     -- {"w":140,"h":205,"d":15} (mm), 없으면 null
spine jsonb not null,           -- {"palette":{"base":"#7A3B2E","band":"#E8E2D6","accent":"#C9A45C"},
                                --  "candidates":["#7A3B2E",...], "pattern":"paperback"|null, "manual":false}
cover_path text,                -- Storage 경로 {user_id}/covers/{id}.jpg
texture_path text,              -- Storage 경로 {user_id}/textures/{id}.webp
source text not null default 'manual',   -- aladin | csv | manual
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()

-- readings
id uuid primary key default gen_random_uuid(),
user_id uuid not null default auth.uid(),
book_id uuid not null references bookchronicle.books(id) on delete cascade,
status text not null check (status in ('reading','finished','dropped')),
started_at date,
finished_at date,
date_approx boolean not null default false,  -- 일 미상 등
year int,                                    -- 완독일(finished_at)의 연도. 완독일이 없으면 null(연도 미상)
rating numeric(2,1) check (rating between 0 and 5),
note text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()

-- years
user_id uuid not null default auth.uid(),
year int not null,
book_of_year uuid[] not null default '{}',   -- P1에서 최대 3권
one_liner text check (char_length(one_liner) <= 80),
updated_at timestamptz not null default now(),
primary key (user_id, year)

-- settings
user_id uuid primary key default auth.uid(),
theme text not null default 'system',          -- system | study | paper
spine_style text not null default 'generated', -- generated | texture
category_map jsonb not null default '{}',
pattern_map jsonb not null default '{}',
last_backup_at timestamptz,
updated_at timestamptz not null default now()
```

### 7.3 백업 파일 형식
```js
{
  app: "bookchronicle",
  schemaVersion: 1,
  exportedAt: "2026-12-31T23:00:00+09:00",
  books: [...], readings: [...], years: [...], settings: {...},
  covers: { "<book_id>": "data:image/jpeg;base64,..." }   // 선택 사항
}
```
- 복원 시 `user_id`는 현재 로그인한 사용자로 바꿔 넣습니다.
- `schemaVersion`이 낮으면 변환 함수를 차례로 적용합니다.

---

## 8. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 빌드 | Vite | 빠른 개발 서버, 정적 파일 빌드 |
| UI | **Svelte 5 (확정)** | 상호작용 화면이 많아 코드가 짧아지고(`$state`·`$derived`), 빌드 결과물이 가벼움 |
| 언어 | TypeScript | 데이터 구조가 많아 타입 검사가 도움이 됨 |
| 백엔드 | Supabase(Auth, Postgres, Storage, Edge Functions) | 기존에 쓰던 서비스, 추가 가입 불필요 |
| 클라이언트 | `@supabase/supabase-js` v2 | 로그인·DB·Storage·함수 호출 |
| 타입 | `supabase gen types` | DB 스키마에서 TypeScript 타입 자동 생성 |
| Edge Function | Deno(TypeScript) | Supabase Edge Functions 기본 실행 환경 |
| 그래프 | Chart.js | 선·막대·누적 막대 지원 |
| CSV | Papa Parse | 따옴표·줄바꿈 포함 CSV 안정 처리 |
| 인코딩 | `TextDecoder('euc-kr')` | 브라우저 내장으로 CP949 읽기 |
| 바코드(P1) | `BarcodeDetector` + ZXing 대체 | 스마트폰 ISBN 스캔 |
| 이미지 | Canvas API | 팔레트 추출, 표지 질감 이미지, 회고 카드 |
| 테마 | CSS 사용자 정의 속성(디자인 토큰) + `data-theme` | 테마 2종을 같은 컴포넌트로 지원 |
| 책등 3D | CSS 3D 변환 | 꺼내 보기 상호작용, 라이브러리 불필요 |
| 배포 | GitHub Pages + GitHub Actions | 익숙한 방식, 무료, HTTPS |
| DB 변경 관리 | Supabase CLI 마이그레이션 | 스키마 변경을 파일로 기록·재현 |
| 테스트 | Vitest, Playwright | 계산 로직 단위 테스트, 주요 흐름 E2E |

---

## 9. 프로젝트 폴더 구조

새 GitHub 저장소 `book-chronicle`은 아래 구조로 만듭니다(로컬 폴더 이름은 `Book Chronicle`). **문서는 `docs/`, 디자인 파일은 `design/`**에 둡니다.

```
bookchronicle/
├── docs/                         # 기획·문서
│   ├── PRD.md                    # 이 문서 (원본)
│   ├── PRD.html                  # 이 문서의 HTML 버전
│   ├── IMPLEMENTATION_PLAN.md    # 단계별(Phase) 구현 계획과 체크리스트
│   └── decisions/                # 결정 기록, 기존 앱 분석 메모 등 (필요할 때 추가)
├── design/                       # 디자인
│   ├── DESIGN.md                 # 디자인 가이드
│   ├── mockup-study.html         # 시안 · 서재 테마
│   └── mockup-paper.html         # 시안 · 종이 테마
├── src/                          # 앱 소스
│   ├── main.ts
│   ├── App.svelte                # 앱 셸(사이드바 · 본문 · 상세 패널), 해시 라우팅
│   ├── pages/                    # 화면 단위
│   │   ├── Login.svelte
│   │   ├── Shelves.svelte        # 책장 홈
│   │   ├── Compare.svelte        # 연도 비교
│   │   ├── Recap.svelte          # 연말 회고 카드
│   │   ├── Import.svelte         # CSV 가져오기
│   │   └── Settings.svelte       # 설정·백업
│   ├── components/               # 재사용 부품
│   │   ├── Sidebar.svelte · Shelf.svelte · Book.svelte · DetailPanel.svelte
│   │   ├── AddBookDialog.svelte · YearRings.svelte · MonthBars.svelte
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts           # Supabase 클라이언트
│   │   ├── auth.ts               # 로그인 상태
│   │   ├── theme.ts              # 테마·책등 스타일 적용(data-theme, data-spine)
│   │   ├── i18n/ko.ts            # 화면 문구 모음
│   │   ├── data/                 # books · readings · years · settings 읽기/쓰기
│   │   ├── aladin.ts             # Edge Function 호출
│   │   ├── spine/                # palette.ts · patterns.ts · texture.ts
│   │   ├── stats.ts              # 연도별 통계 계산
│   │   ├── csv.ts                # CSV 읽기·매핑·날짜 인식
│   │   └── backup.ts             # JSON 백업·복원
│   ├── workers/
│   │   └── palette.worker.ts     # 표지 팔레트 추출
│   └── styles/
│       ├── tokens.css            # 공통 토큰
│       └── themes.css            # 서재 · 종이 테마 값
├── public/
│   ├── manifest.webmanifest      # 홈 화면 바로 가기용(오프라인 캐시 없음)
│   └── icons/
├── supabase/
│   ├── config.toml
│   ├── migrations/               # 0001_bookchronicle_schema.sql, 0002_rls.sql, 0003_storage.sql ...
│   └── functions/
│       └── bookchronicle-aladin/
│           └── index.ts          # 알라딘 프록시
├── tests/                        # Vitest 단위 테스트, Playwright E2E
├── .github/
│   └── workflows/
│       └── deploy.yml            # main에 올리면 빌드 후 GitHub Pages 배포
├── .env.example                  # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (실제 .env는 올리지 않음)
├── .gitignore
├── CLAUDE.md                     # Claude Code 작업 안내서(먼저 읽을 문서·명령·규칙)
├── index.html
├── package.json · vite.config.ts · svelte.config.js · tsconfig.json
└── README.md                     # 실행·배포 방법
```

- 현재 아이디어 저장소의 파일은 새 저장소를 만들 때 다음처럼 옮깁니다.

| 현재 파일 | 새 위치 |
|---|---|
| `prd-reading-chronicle.md` / `.html` | `docs/PRD.md` / `docs/PRD.html` |
| `bookchronicle/CLAUDE.md` | `CLAUDE.md` (저장소 루트) |
| `bookchronicle/IMPLEMENTATION_PLAN.md` | `docs/IMPLEMENTATION_PLAN.md` |
| `bookchronicle/DESIGN.md` | `design/DESIGN.md` |
| `bookchronicle/design-mockup-study.html` | `design/mockup-study.html` |
| `bookchronicle/design-mockup-paper.html` | `design/mockup-paper.html` |

- **실제 파일 이름(v0.9)**: 위 표와 달리 PRD는 `docs/Book Chronicle PRD.md`·`.html`, 시안은 `design/design-mockup-study.html`·`design-mockup-paper.html`라는 이름을 그대로 씁니다. 다른 문서에서 `docs/PRD.md`, `design/mockup-*.html`이라고 부르면 이 파일들을 가리킵니다.

- **비밀 값 규칙**: 저장소에는 Supabase 공개 키(anon key)와 주소만 들어갈 수 있습니다(공개되어도 되는 값). **서비스 키(service_role)와 TTB 키는 절대 저장소에 넣지 않고** Supabase 비밀 값과 GitHub Actions Secrets에만 둡니다.

---

## 10. 화면 구성

### 10.1 레이아웃 (데스크톱 우선)
기준 화면은 **1440×900(16:10)**입니다. 가운데에 좁은 기둥을 세우지 않고 화면 폭 전체를 세 영역으로 나눠 씁니다.

```
┌──────────┬───────────────────────────────────────┬──────────────┐
│ 사이드바  │ 상단: 제목·올해 요약·검색·정렬            │ 상세 패널     │
│ 232px    │                                        │ 360~440px    │
│ 로고      │ 2026 책장 ─────────────────────────────  │ 선택한 책     │
│ 책 꽂기   │ 2025 책장 ─────────────────────────────  │ (표지·기록)   │
│ 메뉴      │ 2024 책장 ─────────────────────────────  │ 올해 한눈에   │
│ 연도 띠   │            (남는 폭을 모두 사용)          │ 올해의 나이테 │
│ 계정·저장 │                                        │              │
└──────────┴───────────────────────────────────────┴──────────────┘
```

| 화면 폭 | 배치 |
|---|---|
| 1200px 이상 | 사이드바 + 책장 + 상세 패널 3단 |
| 900~1199px | 사이드바 + 책장 2단, 상세 패널은 오른쪽에서 밀려 나오는 서랍 |
| 900px 미만(스마트폰) | 상단 바(로고·메뉴 버튼) + 검색 + 책장 1단. 메뉴(계정 영역 포함)는 버튼으로 펼침. 상세 패널은 책장 아래로 내려가고, 책을 누르면 그 위치로 스크롤 |

### 10.2 화면 목록
| 화면 | 주요 요소 |
|---|---|
| 로그인 | 작은 책장 그림, 환영 문구, 이메일·비밀번호 입력(기존 앱과 같은 방식), 로그인 버튼, 테마 적용. 회원 가입 링크 없음(DESIGN 7.4) |
| 책장 홈 | 연도별 선반(최신 연도가 위), 각 선반의 권수·쪽수·그해의 책, 상단 올해 요약·검색·정렬, 오른쪽 상세 패널 |
| 연도 책장 상세 | 한 해 크게 보기, 그해의 책, 한 줄 회고 입력란, "회고 카드 만들기" 버튼 |
| 상세 패널 | 표지, 제목·저자, 쪽수·완독일·분야, 독서 기록 목록(재독 포함), 별점, 메모, 책등 팔레트·패턴 바꾸기 |
| 책 꽂기(대화 상자) | 검색창(ISBN·제목), 결과 목록, 책등 미리 보기, 날짜·별점·메모, 바코드 버튼(P1), 수동 입력 전환 |
| 연도 비교 | 연도 선택 칩, 지표 카드, 월별 그래프(누적 토글), 분야 비중 막대, 표로 보기 |
| 회고 카드 편집기 | 미리 보기, 크기 프리셋, 테마, 포함 항목 체크, 저장·공유 버튼 |
| CSV 가져오기 | 파일 선택 → 인코딩 확인 → 열 매핑 → 보충 조회 진행 → 미리 보기·중복 처리 → 가져오기 |
| 설정·백업 | 테마, 책등 스타일, 움직임 줄이기, 분야 관리, 검색 연결 확인, JSON 백업·복원, CSV 내보내기, 계정·로그아웃 |

### 10.3 테마
두 테마는 **기능, 정보, 배치가 완전히 같고** 겉모습만 다릅니다.

| 항목 | 서재 (Study, 어두움) | 종이 (Paper, 밝음) |
|---|---|---|
| 바탕 | 짙은 호두나무 갈색 | 아이보리 종이색 |
| 강조색 | 황동 | 남색 잉크 |
| 제목 글꼴 | 나눔명조 | 함렛 |
| 선반 | 호두나무 선반 + 어두운 뒤판 | 자작나무 벽 선반(뒤판 없음) |
| 책갈피 끈 | 황동색 | 남색 |

- 색·글꼴·재질은 디자인 토큰(CSS 변수)으로 분리하고, `data-theme="study"` / `data-theme="paper"`로 바꿉니다.
- 기본값은 "시스템 설정 따름"입니다.

---

## 11. 비기능 요구사항

| 항목 | 기준 |
|---|---|
| 성능 | 책 1,000권(10년치) 기준 로그인 후 책장 홈 첫 표시 2초 이내, 스크롤 60fps 목표. 표지는 화면에 보이는 책부터 내려받음 |
| 네트워크 | 인터넷 연결 필요. 연결이 끊기면 "연결을 확인해 주세요" 안내를 띄우고, 입력 중인 내용은 지우지 않음 |
| 보안 | 로그인 필수, 모든 테이블·버킷 RLS, Edge Function은 앱 주인만 호출, 서비스 키·TTB 키는 저장소·브라우저에 두지 않음 |
| 개인정보 | 독서 기록은 본인 Supabase 프로젝트에만 저장하고, RLS로 본인만 접근. 알라딘에는 검색어·ISBN만 전달 |
| 접근성 | 책등은 키보드로 이동 가능(좌우 화살표, Enter로 꺼내 보기), 스크린 리더용 라벨, 그래프는 표 대체 제공, `prefers-reduced-motion`이면 회전 애니메이션 끔 |
| 화면 | 1440×900 기준 설계, 1280~2560px에서 빈 여백 없이 확장, 390px 스마트폰에서 확인용으로 동작 |
| 호환성 | 데스크톱 최신 Chrome, Edge, Safari, Firefox(주 환경). 모바일 Safari(iOS 16.4 이상), Chrome, Samsung Internet |
| 운영 비용 | GitHub 무료, Supabase 무료 요금제 범위(기존 앱과 공유) |
| 국제화 | v1은 한국어 UI. 문자열은 한곳에 모아 둠 |

---

## 12. 개발 단계 (마일스톤)

마일스톤을 더 잘게 나눈 Phase 0~9의 작업 목록과 완료 기준은 `docs/IMPLEMENTATION_PLAN.md`에 있습니다.

### M0. 준비
- 기존 독서 앱 분석: 알라딘 호출 방식, 로그인 방식, 회원 가입 사용 여부, 사용 중인 스키마·버킷·함수 이름 확인
- 새 GitHub 저장소 `book-chronicle` 생성(9장 폴더 구조), 문서·디자인 파일 옮기기
- Supabase: `bookchronicle` 스키마·테이블·RLS·버킷 마이그레이션, 노출 스키마 추가(Auth 설정은 바꾸지 않음)
- **완료 기준**: 로그인한 계정으로 `bookchronicle.books`에 행을 넣고 읽을 수 있고, 로그아웃 상태에서는 읽을 수 없음

### M1. 로그인과 기본 책장 (MVP)
- Vite + Svelte 5 + supabase-js 프로젝트 구성, 로그인 화면, GitHub Pages 자동 배포
- 데스크톱 3단 레이아웃과 디자인 토큰 구조, 서재 테마 먼저 적용
- 수동 입력으로 책 추가·수정·삭제, 연도별 책장(생성형 책등 패턴 3종, 수동 팔레트)
- **완료 기준**: 배포된 주소에서 로그인해 직접 입력한 30권이 3개 연도 책장에 꽂혀 보이고, 스마트폰에서 같은 책장이 보임

### M2. 도서 검색과 표지
- Edge Function `bookchronicle-aladin` 배포, TTB 키 비밀 값 등록, ISBN·제목 검색
- 표지 Storage 저장(`importCover`), 3색 팔레트 자동 추출(Web Worker), 분야 매핑
- 꺼내 보기 상호작용(실제 표지로 돌아서기)
- **완료 기준**: 제목 검색으로 10초 안에 한 권 등록, 생성형 책등이 표지와 어울리고, 누르면 실제 표지가 보임

### M3. CSV 가져오기와 백업
- 인코딩 판별, 열 매핑, 보충 조회, 중복 처리
- JSON 백업·복원, CSV 내보내기
- **완료 기준**: 200행 CSV를 가져와 10분 안에 정리 완료

### M4. 연도 비교와 회고
- 지표 카드, 월별(누적) 그래프, 분야 비중 막대
- 그해의 책, 한 줄 회고, 회고 카드 PNG 내보내기·공유
- **완료 기준**: 연말 회고 카드를 만들어 휴대폰 사진첩에 저장

### M5. 다듬기
- 종이 테마 추가와 테마 전환(시스템 설정 따름), 표지 질감 모드, 움직임 줄이기
- 900px 미만 반응형(상단 바, 접히는 메뉴), 900~1199px 상세 서랍
- 정렬·강조 옵션, 지난해 접기, 홈 화면 바로 가기 매니페스트
- P1 기능(바코드 스캔, Goodreads 프리셋, 읽는 중 표시)
- **완료 기준**: 두 테마 × 세 화면 폭(1440·1024·390px)에서 주요 화면 점검 통과

---

## 13. 위험 요소와 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| RLS 설정 실수 | 기록 노출·삭제 | 모든 테이블·버킷 RLS 필수, 마이그레이션에 정책 포함, 로그아웃 상태 접근 차단 테스트를 M0 완료 기준에 포함 |
| 기존 앱과 프로젝트 공유로 인한 간섭 | 기존 앱 장애 | `bookchronicle` 스키마·버킷·함수 이름 분리, 기존 테이블 수정 금지, Auth 설정(사이트 주소·가입 허용)은 기존 앱 영향 확인 후 변경 |
| 무료 요금제 한도를 두 앱이 공유 | 용량·호출 초과 | 표지를 300px로 줄여 저장, 검색 캐시, 사용량을 대시보드에서 월 1회 확인 |
| 무료 프로젝트 비활성 일시 정지 | 앱 접속 불가 | 두 앱이 함께 쓰므로 활동이 잦음. 정지되면 대시보드에서 재개. 정지 기준은 개발 시작 시 확인 |
| 알라딘 하루 호출 한도 공유(같은 TTB 키) | 검색 중단 | 결과 캐시, CSV 보충 조회 속도 제한, 필요하면 이 앱 전용 TTB 키 발급 |
| 회원 가입이 열려 있음(기존 앱이 사용) | 다른 가입자가 함수 호출·저장 공간 사용 | RLS로 데이터 분리, Edge Function은 앱 주인 사용자 ID만 허용(5.6) |
| 서비스 키·TTB 키가 저장소에 올라감 | 전체 데이터·키 도용 | `.env` gitignore, 키는 Supabase 비밀 값·GitHub Secrets에만, 유출 시 즉시 재발급 |
| 공개 저장소로 코드가 공개됨 | 비밀 값 유출 위험 | 공개되어도 되는 값(Supabase 주소·anon 키)만 저장소에 둠(9장 비밀 값 규칙). 커밋 전 `.env` 포함 여부 확인, GitHub 비밀 값 검사(secret scanning) 켜기 |
| Edge Function 첫 호출 지연 | 검색이 느리게 느껴짐 | 검색창 입력 시 미리 깨우기, 결과 캐시 |
| 알라딘 표지 해상도가 낮음(가로 약 200px) | 꺼내 보기 표지가 흐릿함 | 표지 면 크기를 이미지 해상도에 맞춰 제한 |
| 표지 질감 모드에서 제목이 안 읽힘 | 가독성 저하 | 바탕색 덧칠과 명암비 계산, 필요하면 라벨 상자 자동 추가 |
| 쪽수 정보 누락 | 책등 두께 부정확 | 분야 평균으로 추정하고 점선 표시, 사용자가 수정 |
| CSV 형식이 제각각 | 가져오기 실패 | 열 매핑 화면, 날짜 형식 여러 개 지원, 행별 오류 표시 |

---

## 14. 성공 지표 (개인 사용 기준)

- 책 한 권 등록에 걸리는 시간: 평균 10초 이내
- 과거 기록 가져오기: 200권을 10분 안에 모두 책장에 꽂기
- 자동 생성 책등(팔레트·패턴)을 그대로 쓰는 비율: 80% 이상
- 데스크톱에서 기록한 책이 스마트폰에서 바로 보임
- 1년 동안 매달 1회 이상 앱 사용, 연말 회고 카드 1회 이상 내보내기
- 데이터 손실 0건(JSON 백업으로 언제든 복원 가능)

---

## 15. 결정된 사항과 남은 확인 사항

### 15.1 결정된 사항 (v0.8)
- 앱 이름: **북크로니클 (Book Chronicle)**
- 주 사용 환경: 데스크톱 웹 브라우저(16:10), 스마트폰은 반응형 확인용
- 디자인: 통일 레이아웃 1개(사이드바·책장·상세 패널) + 테마 2종(서재·종이)
- 책등: 생성형 책등이 기본, 꺼내 보기로 실제 표지 표시, 표지 질감 모드는 설정에서 선택
- 코드·배포: **공개 GitHub 저장소 + GitHub Pages**. Cloudflare는 쓰지 않음
- 한 해의 기준: **완독일**(책은 완독일의 연도 책장에 꽂힘, 완독일이 없으면 "연도 미상" 칸)
- 백엔드: **Supabase(로그인·DB·스토리지·Edge Function)**, 기존 독서 앱과 같은 프로젝트를 `bookchronicle` 스키마로 분리해 사용
- 로그인: 필요(사용자 1명, 기존 앱과 같은 계정), RLS로 본인 데이터만 접근
- 오프라인 지원: 하지 않음
- 폴더 구조: 문서는 `docs/`, 디자인은 `design/` (9장)
- UI 프레임워크: **Svelte 5** + TypeScript + Vite
- 로그인 방식: **이메일 + 비밀번호**(v0.9)
- 회원 가입: **막지 않음**(기존 앱이 사용). Auth 설정(Site URL·Redirect URLs)은 바꾸지 않음(v0.9)
- 알라딘 Edge Function: 새로 만들고 앱 주인 사용자 ID만 허용(v0.9)
- 세부 결정 기록: `docs/decisions/0001-initial-decisions.md`, `docs/decisions/existing-app-analysis.md`

### 15.2 아직 결정할 사항
- 회고 카드에 넣을 기본 항목, 분야별 기본 책등 패턴(6.4 제안) 유지 여부

### 15.3 개발 시작 시 확인할 사항
- ~~기존 독서 앱 분석~~ → 완료(v0.9, `docs/decisions/existing-app-analysis.md`)
- Supabase 무료 요금제의 최신 한도(DB·Storage·Edge Function 호출)와 비활성 일시 정지 기준
- 알라딘 API 하루 호출 한도, 이용 약관(출처 표기 방식), `Cover=Big` 표지의 실제 해상도
- 상품 조회 API에서 쪽수(`itemPage`)와 판형 크기 정보가 실제로 오는지
- iOS Safari에서 Web Share API로 PNG 파일 공유가 되는지
