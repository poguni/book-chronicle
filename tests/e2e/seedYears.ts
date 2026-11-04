// E2E용 여러 해 책장 (연도 비교·회고)
const T = '2025-01-01T00:00:00Z';
const CATS = ['소설', '인문', '과학', '에세이', '역사', '경제', '시', '여행', null];
const COLORS = ['#2F4F6F', '#8C3B2E', '#3E5C3A', '#C9A45C', '#5B8DB8', '#E9E1CF', '#4B3F72'];

export function yearsSeed(perYear: Record<number, number>) {
  const books: Record<string, unknown>[] = [];
  const readings: Record<string, unknown>[] = [];
  for (const [y, n] of Object.entries(perYear)) {
    for (let i = 0; i < n; i++) {
      const id = `b-${y}-${i}`;
      books.push({
        id,
        user_id: 'u',
        title: `${y}년 책 ${i + 1}`,
        author: `저자 ${i + 1}`,
        publisher: null,
        pub_date: null,
        isbn13: null,
        pages: 180 + ((i * 53) % 400),
        pages_estimated: false,
        category: CATS[(i + Number(y)) % CATS.length],
        category_raw: null,
        size: null,
        spine: {
          palette: { base: COLORS[i % COLORS.length], band: '#E9E1CF', accent: '#C9A45C' },
        },
        cover_path: null,
        texture_path: null,
        source: 'manual',
        created_at: T,
        updated_at: T,
      });
      readings.push({
        id: `r-${y}-${i}`,
        user_id: 'u',
        book_id: id,
        status: 'finished',
        started_at: null,
        finished_at: `${y}-${String(((i * 5) % 12) + 1).padStart(2, '0')}-10`,
        date_approx: false,
        year: Number(y),
        rating: [3, 4, 4.5, 5, 3.5][i % 5],
        note: null,
        shelf_position: null,
        created_at: T,
        updated_at: T,
      });
    }
  }
  return { books, readings };
}
