/**
 * 단체(Group) CRUD + 콘서트별 단체 연결(concertGroups) 관리
 *
 * removeGroupFromConcert 는 concertGroups 행만 제거. groups 마스터는 절대 삭제 금지.
 */

import { db } from '../db/database';
import type { ConcertGroup, Group, GroupRole } from '../types';

export type GroupCreateInput = Omit<Group, 'id' | 'createdAt'>;
export type GroupUpdateInput = Partial<Omit<Group, 'id' | 'createdAt'>>;

// ---------- master groups ----------

export async function getAllGroups(): Promise<Group[]> {
  const list = await db.groups.toArray();
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function createGroup(data: GroupCreateInput): Promise<string> {
  const id = crypto.randomUUID();
  const g: Group = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await db.groups.add(g);
  return id;
}

export async function updateGroup(
  id: string,
  data: GroupUpdateInput
): Promise<void> {
  await db.groups.update(id, data);
}

// ---------- per-concert groups ----------

export async function getConcertGroups(
  concertId: string
): Promise<(ConcertGroup & { group: Group })[]> {
  if (!concertId) return [];
  const junctions = await db.concertGroups
    .where('concertId')
    .equals(concertId)
    .toArray();

  const ids = junctions.map((j) => j.groupId);
  const groups = await db.groups.bulkGet(ids);

  return junctions
    .map((j, i) => {
      const g = groups[i];
      if (!g) return null;
      return { ...j, group: g };
    })
    .filter((x): x is ConcertGroup & { group: Group } => x !== null);
}

export async function addGroupToConcert(
  concertId: string,
  groupId: string,
  role: GroupRole
): Promise<void> {
  if (!concertId || !groupId) throw new Error('REQUIRED_IDS');

  const existing = await db.concertGroups
    .where('[concertId+groupId]')
    .equals([concertId, groupId])
    .first();
  if (existing) throw new Error('ALREADY_IN_CONCERT');

  const row: ConcertGroup = {
    id: crypto.randomUUID(),
    concertId,
    groupId,
    role,
  };
  await db.concertGroups.add(row);
}

/**
 * 콘서트에서 단체를 제거한다. groups 마스터 DB 는 건드리지 않는다.
 */
export async function removeGroupFromConcert(
  concertGroupId: string
): Promise<void> {
  await db.concertGroups.delete(concertGroupId);
}
