# 0010. 제목 글꼴을 고운 돋움으로

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |
| 근거 | 앱 주인 요청: 제목(큰 제목·중간 제목 등)에 쓰던 나눔명조(서재)·함렛(종이)을 두 테마 모두 Gowun Dodum(고운 돋움)으로 |

- `--font-display`를 두 테마 모두 `'Gowun Dodum', 'Noto Sans KR', sans-serif`로 바꿨습니다(`src/styles/themes.css`). Google Fonts에서 불러옵니다(`index.html`). 나눔명조·함렛은 더 불러오지 않습니다.
- 고운 돋움은 굵기가 400 하나뿐입니다. `--display-weight`를 400으로 두고, 이 글꼴을 쓰는 `<b>`(요약 숫자, 사이드바·상세 패널 숫자, 표지 면 제목)도 400으로 맞춰 브라우저가 억지로 굵게 그리지 않게 했습니다. 크기와 색으로 위계를 나눕니다.
- 본문(Noto Sans KR)과 책등 제목(Pretendard, 결정 0009)은 그대로입니다.
- 시안 HTML(`design/design-mockup-*.html`)은 처음 시안 기록으로 그대로 둡니다. 화면 구현의 글꼴 기준은 이 결정과 DESIGN 3장입니다.
