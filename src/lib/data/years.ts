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

/** 복원: 연도 회고 여러 개를 넣거나 고칩니다. */
export async function upsertYears(
  years: { year: number; book_of_year: string[]; one_liner: string | null }[],
): Promise<void> {
  if (years.length === 0) return;
  const { error } = await supabase.from('years').upsert(years, { onConflict: 'user_id,year' });
  if (error) throw error;
}

/** 복원의 덮어쓰기: 내 연도 회고를 모두 지웁니다(RLS로 본인 행만). */
export async function deleteAllYears(): Promise<void> {
  const { error } = await supabase.from('years').delete().not('year', 'is', null);
  if (error) throw error;
}

/** 한 줄 회고(80자) 저장. 행이 없으면 만들고, 그해의 책은 그대로 둡니다. */
export async function setOneLiner(year: number, text: string | null): Promise<void> {
  const { error } = await supabase
    .from('years')
    .upsert({ year, one_liner: text }, { onConflict: 'user_id,year' });
  if (error) throw error;
}
