/**
 * 메모(Memo) CRUD
 *
 * saveMemo 는 upsert: (concertId, category) 가 같은 메모가 있으면 덮어쓴다.
 * - category 미지정 시 '_default' 로 취급해 콘서트당 1개의 메모로 동작한다.
 */

import { db } from '../db/database';
import type { Memo } from '../types';

const DEFAULT_CATEGORY = '_default';

export async function getMemos(concertId: string): Promise<Memo[]> {
  if (!concertId) return [];
  const list = await db.memos.where('concertId').equals(concertId).toArray();
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * 메모를 저장(upsert)한다. category 가 같은 메모가 있으면 덮어쓰고,
 * 없으면 새로 만든다.
 */
export async function saveMemo(
  concertId: string,
  content: string,
  category?: string
): Promise<void> {
  if (!concertId) throw new Error('CONCERT_ID_REQUIRED');

  const cat = category ?? DEFAULT_CATEGORY;
  const now = new Date().toISOString();

  await db.transaction('rw', db.memos, async () => {
    const all = await db.memos.where('concertId').equals(concertId).toArray();
    const target = all.find(
      (m) => (m.category ?? DEFAULT_CATEGORY) === cat
    );

    if (target) {
      await db.memos.update(target.id, {
        content,
        category: category,
        updatedAt: now,
      });
    } else {
      await db.memos.add({
        id: crypto.randomUUID(),
        concertId,
        content,
        category: category,
        updatedAt: now,
      });
    }
  });
}

export async function deleteMemo(id: string): Promise<void> {
  await db.memos.delete(id);
}
