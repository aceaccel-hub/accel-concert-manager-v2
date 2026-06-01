/**
 * 단원 CRUD + 콘서트별 단원 연결(concertMembers) 관리
 *
 * removeMemberFromConcert: concertMembers 행만 제거. members 마스터는 절대 삭제 금지.
 */

import { db } from '../db/database';
import type { ConcertMember, Member } from '../types';

export type MemberCreateInput = Omit<Member, 'id' | 'createdAt'>;
export type MemberUpdateInput = Partial<Omit<Member, 'id' | 'createdAt'>>;

export type ConcertMemberCreateInput = Omit<
  ConcertMember,
  'id' | 'concertId' | 'memberId' | 'isReserve'
> & {
  isReserve?: boolean;
};

// ---------- master members ----------

export async function getAllMembers(): Promise<Member[]> {
  const list = await db.members.toArray();
  return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function createMember(data: MemberCreateInput): Promise<string> {
  const id = crypto.randomUUID();
  const member: Member = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await db.members.add(member);
  return id;
}

export async function updateMember(
  id: string,
  data: MemberUpdateInput
): Promise<void> {
  await db.members.update(id, data);
}

// ---------- per-concert members ----------

/**
 * 콘서트에 연결된 단원들을 마스터 정보까지 join 해 반환.
 * 마스터가 사라진 dangling junction 행은 결과에서 제외한다.
 */
export async function getConcertMembers(
  concertId: string
): Promise<(ConcertMember & { member: Member })[]> {
  if (!concertId) return [];
  const junctions = await db.concertMembers
    .where('concertId')
    .equals(concertId)
    .toArray();

  const ids = junctions.map((j) => j.memberId);
  const members = await db.members.bulkGet(ids);

  return junctions
    .map((j, i) => {
      const m = members[i];
      if (!m) return null;
      return { ...j, member: m };
    })
    .filter((x): x is ConcertMember & { member: Member } => x !== null);
}

/**
 * 콘서트에 단원을 추가한다. (concertMembers junction insert)
 * 이미 추가된 경우 'ALREADY_IN_CONCERT' throw.
 */
export async function addMemberToConcert(
  concertId: string,
  memberId: string,
  data: ConcertMemberCreateInput = {}
): Promise<void> {
  if (!concertId || !memberId) throw new Error('REQUIRED_IDS');

  const existing = await db.concertMembers
    .where('[concertId+memberId]')
    .equals([concertId, memberId])
    .first();
  if (existing) throw new Error('ALREADY_IN_CONCERT');

  const row: ConcertMember = {
    id: crypto.randomUUID(),
    concertId,
    memberId,
    role: data.role,
    part: data.part,
    fee: data.fee,
    attendanceRate: data.attendanceRate,
    evaluation: data.evaluation,
    isReserve: data.isReserve ?? false,
    note: data.note,
  };
  await db.concertMembers.add(row);
}

/**
 * 콘서트에서 단원을 빼낸다.
 * members 마스터 DB 는 절대 삭제하지 않는다.
 */
export async function removeMemberFromConcert(
  concertMemberId: string
): Promise<void> {
  await db.concertMembers.delete(concertMemberId);
}

export async function toggleReserveStatus(
  concertMemberId: string,
  isReserve: boolean
): Promise<void> {
  await db.concertMembers.update(concertMemberId, { isReserve });
}
