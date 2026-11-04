import type { Database } from '../database.types';
import type { ReadingRow } from '../shelves';
import { supabase } from '../supabase';
import { fetchAll } from './fetchAll';

type ReadingInsert = Database['bookchronicle']['Tables']['readings']['Insert'];
type ReadingUpdate = Database['bookchronicle']['Tables']['readings']['Update'];

// readings.year는 DB가 완독일에서 계산하는 생성 열이라 앱이 넣지 않습니다(결정 0003).
export function listReadings(): Promise<ReadingRow[]> {
  return fetchAll((from, to) =>
    supabase.from('readings').select('*').order('created_at').order('id').range(from, to),
  );
}

export async function insertReading(reading: Omit<ReadingInsert, 'year'>): Promise<void> {
  const { error } = await supabase.from('readings').insert(reading);
  if (error) throw error;
}

export async function updateReading(id: string, patch: Omit<ReadingUpdate, 'year'>): Promise<void> {
  const { error } = await supabase.from('readings').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteReading(id: string): Promise<void> {
  const { error } = await supabase.from('readings').delete().eq('id', id);
  if (error) throw error;
}
