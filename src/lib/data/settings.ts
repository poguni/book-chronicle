import type { Database } from '../database.types';
import { supabase } from '../supabase';

export type SettingsRow = Database['bookchronicle']['Tables']['settings']['Row'];

/** 첫 로그인 때 settings 행을 만듭니다. 이미 있으면 그대로 둡니다. */
export async function ensureSettings(userId: string): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}

/** 내 설정 행. 아직 없으면 null */
export async function getSettings(): Promise<SettingsRow | null> {
  const { data, error } = await supabase.from('settings').select('*').limit(1);
  if (error) throw error;
  return data[0] ?? null;
}
