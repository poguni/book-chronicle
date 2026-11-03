// 화면 문구 모음 (CLAUDE.md 7장: 한국어 존댓말, 문구는 이 파일 한곳에)

export const ko = {
  appName: '북크로니클',
  nav: {
    label: '주 메뉴',
  },
  pages: {
    shelves: '책장',
    compare: '연도 비교',
    recap: '연말 회고',
    list: '전체 목록',
    import: '가져오기·백업',
    settings: '설정',
    login: '로그인',
  },
  recapOfYear: (year: number) => `${year}년 연말 회고`,
  placeholder: '이 화면은 곧 채워질 예정이에요.',
} as const;
