import { supabase } from '../supabase';
import { COVER_BUCKET } from './books';

// 표지 파일 (PRD 5.5): 비공개 버킷 {user_id}/covers/{book_id}.jpg. RLS가 본인 폴더만 허용합니다.

export function coverPath(userId: string, bookId: string): string {
  return `${userId}/covers/${bookId}.jpg`;
}

/** 표지를 올리고 경로를 돌려줍니다. 같은 경로면 덮어씁니다. */
export async function uploadCover(bookId: string, jpeg: Blob): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('login_required');
  const path = coverPath(userId, bookId);
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true, cacheControl: '86400' });
  if (error) throw error;
  return path;
}

export async function downloadCover(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(COVER_BUCKET).download(path);
  if (error) throw error;
  return data;
}
