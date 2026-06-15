/**
 * 레퍼토리 마스터 DB CRUD
 *
 * 이 훅은 마스터 레퍼토리만 다룬다.
 * 콘서트 곡목(program items) 은 useProgram 을 사용하라.
 */

import { db } from '../db/database';
import type { Repertoire } from '../types';

export type RepertoireCreateInput = Omit<Repertoire, 'id' | 'createdAt'>;
export type RepertoireUpdateInput = Partial<Omit<Repertoire, 'id' | 'createdAt'>>;

export async function getAllRepertoire(): Promise<Repertoire[]> {
  const list = await db.repertoire.toArray();
  return list.sort((a, b) => {
    const c = a.composer.localeCompare(b.composer, 'ko');
    if (c !== 0) return c;
    return a.title.localeCompare(b.title, 'ko');
  });
}

export async function getRepertoireById(
  id: string
): Promise<Repertoire | undefined> {
  return db.repertoire.get(id);
}

export async function createRepertoire(
  data: RepertoireCreateInput
): Promise<string> {
  const id = crypto.randomUUID();
  const rep: Repertoire = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await db.repertoire.add(rep);
  return id;
}

export async function updateRepertoire(
  id: string,
  data: RepertoireUpdateInput
): Promise<void> {
  await db.repertoire.update(id, data);

  // cascade: composer/title/duration 변경 시 관련 programItems도 업데이트
  if (data.composer !== undefined || data.title !== undefined || data.duration !== undefined) {
    const items = await db.programItems.where('repertoireId').equals(id).toArray();
    if (items.length > 0) {
      const cascadeFields: Record<string, any> = {};
      if (data.composer !== undefined) cascadeFields.composer = data.composer;
      if (data.title !== undefined) cascadeFields.title = data.title;
      if (data.duration !== undefined) cascadeFields.duration = data.duration;
      await Promise.all(items.map((item) => db.programItems.update(item.id, cascadeFields)));
    }
  }
}

/**
 * 레퍼토리 마스터 삭제.
 * 호출 측은 이 행을 참조하는 programItems.repertoireId 가 dangling 이 될 수 있음에 주의.
 * (UI 에서는 보통 사용 중 여부를 먼저 확인하고 호출한다.)
 */
export async function deleteRepertoire(id: string): Promise<void> {
  await db.repertoire.delete(id);
}
