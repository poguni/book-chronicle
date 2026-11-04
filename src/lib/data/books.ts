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

const CHUNK = 100;

/** 여러 권을 한 번에 (CSV 가져오기·복원). 100권씩 나눠 보냅니다. */
export async function insertBooks(books: BookInsert[]): Promise<void> {
  for (let i = 0; i < books.length; i += CHUNK) {
    const { error } = await supabase.from('books').insert(books.slice(i, i + CHUNK));
    if (error) throw error;
  }
}

/**
 * 내 책을 모두 지웁니다(복원의 덮어쓰기). 기록은 외래 키로 함께 지워집니다.
 * RLS가 본인 행만 허용하므로 다른 사용자의 행에는 닿지 않습니다. Storage 파일은 부르는 쪽이 정리합니다.
 */
export async function deleteAllBooks(): Promise<void> {
  const { error } = await supabase.from('books').delete().not('id', 'is', null);
  if (error) throw error;
}

/** Storage 파일 여러 개 지우기(실패해도 책장에는 영향 없음) */
export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(COVER_BUCKET).remove(paths);
  if (error) console.warn('파일을 지우지 못했어요', error);
}

/** 방금 넣은 책들을 되돌릴 때 (가져오기 중 기록 저장 실패) */
export async function deleteBooksByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('books').delete().in('id', ids);
  if (error) throw error;
}
