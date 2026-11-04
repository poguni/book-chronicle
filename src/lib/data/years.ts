import type { YearRow } from '../shelves';
import { supabase } from '../supabase';

// 연도별 회고(그해의 책, 한 줄 회고). 고르기·쓰기는 Phase 6·8에서 붙입니다.
export async function listYears(): Promise<YearRow[]> {
  const { data, error } = await supabase.from('years').select('*').order('year');
  if (error) throw error;
  return data;
}
