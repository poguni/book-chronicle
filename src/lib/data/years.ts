import type { YearRow } from '../shelves';
import { supabase } from '../supabase';

// 연도별 회고(그해의 책, 한 줄 회고). 그해의 책 고르기는 Phase 6, 한 줄 회고는 Phase 8.
export async function listYears(): Promise<YearRow[]> {
  const { data, error } = await supabase.from('years').select('*').order('year');
  if (error) throw error;
  return data;
}

/** 그해의 책을 정합니다(빈 배열이면 해제). 행이 없으면 만들고, 한 줄 회고는 그대로 둡니다. */
export async function setBookOfYear(year: number, bookIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('years')
    .upsert({ year, book_of_year: bookIds }, { onConflict: 'user_id,year' });
  if (error) throw error;
}
