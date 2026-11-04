import type { Database } from '../database.types';
import type { BookRow } from '../shelves';
import { supabase } from '../supabase';
import { fetchAll } from './fetchAll';

type BookInsert = Database['bookchronicle']['Tables']['books']['Insert'];
type BookUpdate = Database['bookchronicle']['Tables']['books']['Update'];

export const COVER_BUCKET = 'bookchronicle-covers';

export function listBooks(): Promise<BookRow[]> {
  return fetchAll((from, to) =>
    supabase.from('books').select('*').order('created_at').order('id').range(from, to),
  );
}

export async function insertBook(book: BookInsert): Promise<void> {
  const { error } = await supabase.from('books').insert(book);
  if (error) throw error;
}

export async function updateBook(id: string, patch: BookUpdate): Promise<void> {
  const { error } = await supabase.from('books').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * 책을 지웁니다. 독서 기록은 외래 키(on delete cascade)로 함께 지워지고,
 * Storage의 표지·질감 이미지는 여기서 지웁니다(PRD F1).
 */
export async function deleteBook(
  book: Pick<BookRow, 'id' | 'cover_path' | 'texture_path'>,
): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', book.id);
  if (error) throw error;

  const paths = [book.cover_path, book.texture_path].filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(COVER_BUCKET).remove(paths);
    // 책 기록은 이미 지워졌으므로 실패해도 화면에는 알리지 않고 남깁니다(파일만 남음).
    if (storageError) console.warn('표지 파일을 지우지 못했어요', storageError);
  }
}
