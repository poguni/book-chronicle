// 화면 문구 모음 (CLAUDE.md 7장: 한국어 존댓말, 문구는 이 파일 한곳에)

export const ko = {
  appName: '북크로니클',
  app: {
    notConfigured:
      'Supabase 연결 설정이 비어 있어요. .env 파일(배포는 저장소 Variables)을 확인해 주세요.',
  },
  nav: {
    label: '주 메뉴',
    logout: '로그아웃',
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
  login: {
    brand: '북크로니클 · BOOK CHRONICLE',
    title: '책장으로 돌아오신 걸 환영해요',
    subtitle: '기존 독서 앱과 같은 계정으로 로그인합니다.',
    email: '이메일',
    emailPlaceholder: 'name@example.com',
    password: '비밀번호',
    passwordPlaceholder: '비밀번호',
    submit: '로그인',
    submitting: '로그인하는 중…',
    errorInvalid: '이메일 또는 비밀번호를 확인해 주세요',
    errorNotConfirmed: '메일함에서 이메일 인증을 마친 뒤 다시 로그인해 주세요',
    errorNetwork: '연결을 확인해 주세요. 잠시 후 다시 시도할 수 있어요',
    errorTooMany: '시도가 많았어요. 잠시 기다린 뒤 다시 로그인해 주세요',
    errorUnknown: '로그인이 잠시 안 돼요. 잠시 후 다시 시도해 주세요',
  },
} as const;
