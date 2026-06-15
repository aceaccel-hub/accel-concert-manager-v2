/**
 * 체크리스트 CRUD
 *
 * - toggleChecklist / createChecklist / deleteChecklist 모두 호출 후
 *   해당 콘서트의 progressRate (완료 항목 비율) 를 자동 갱신한다.
 */

import { db } from '../db/database';
import type { Checklist } from '../types';
import { calcProgressRate } from '../utils/calculations';

export async function getChecklists(concertId: string): Promise<Checklist[]> {
  if (!concertId) return [];
  const list = await db.checklists.where('concertId').equals(concertId).toArray();
  return list.sort((a, b) => a.order - b.order);
}

export async function toggleChecklist(
  id: string,
  isDone: boolean
): Promise<void> {
  await db.transaction('rw', db.checklists, db.concerts, async () => {
    await db.checklists.update(id, { isDone });
    const target = await db.checklists.get(id);
    if (target) await refreshConcertProgress(target.concertId);
  });
}

export async function createChecklist(
  concertId: string,
  title: string
): Promise<void> {
  if (!concertId) throw new Error('CONCERT_ID_REQUIRED');

  await db.transaction('rw', db.checklists, db.concerts, async () => {
    const items = await db.checklists.where('concertId').equals(concertId).toArray();
    const nextOrder =
      items.length === 0 ? 1 : Math.max(...items.map((c) => c.order)) + 1;
    await db.checklists.add({
      id: crypto.randomUUID(),
      concertId,
      title,
      isDone: false,
      order: nextOrder,
    });
    await refreshConcertProgress(concertId);
  });
}

export async function deleteChecklist(id: string): Promise<void> {
  await db.transaction('rw', db.checklists, db.concerts, async () => {
    const target = await db.checklists.get(id);
    await db.checklists.delete(id);
    if (target) await refreshConcertProgress(target.concertId);
  });
}

// ---------- internal ----------

async function refreshConcertProgress(concertId: string): Promise<void> {
  const items = await db.checklists.where('concertId').equals(concertId).toArray();
  const done = items.filter((c) => c.isDone).length;
  const rate = calcProgressRate(done, items.length);
  await db.concerts.update(concertId, {
    progressRate: rate,
    updatedAt: new Date().toISOString(),
  });
}
