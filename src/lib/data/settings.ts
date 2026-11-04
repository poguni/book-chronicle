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

type SettingsUpdate = Database['bookchronicle']['Tables']['settings']['Update'];

/** 내 설정 고치기 (백업 시각, 복원한 설정) */
export async function updateSettings(userId: string, patch: SettingsUpdate): Promise<void> {
  const { error } = await supabase.from('settings').update(patch).eq('user_id', userId);
  if (error) throw error;
}

/** 지금 로그인한 사용자의 설정 고치기 (테마·책등 스타일·무늬 매핑) */
export async function updateMySettings(patch: SettingsUpdate): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('login_required');
  await updateSettings(userId, patch);
}
