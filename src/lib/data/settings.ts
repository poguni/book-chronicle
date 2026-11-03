import { supabase } from '../supabase';

/** 첫 로그인 때 settings 행을 만듭니다. 이미 있으면 그대로 둡니다. */
export async function ensureSettings(userId: string): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}
