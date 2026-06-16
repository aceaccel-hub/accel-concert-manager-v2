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

  const member = await db.members.get(memberId);
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
    // 포지션 차트에서 배치될 때까지 미배치 상태
    isAssigned: false,
  };
  await db.concertMembers.add(row);

  // 자동으로 단원페이 지출 항목 생성
  const memberFee = (data.fee && data.fee > 0) ? data.fee : (member?.baseFee ?? 0);
  console.log('Adding member fee:', { name: member?.name, fee: memberFee, baseFee: member?.baseFee, dataFee: data.fee });
  if (member?.name) {
    try {
      await db.budgets.add({
        id: crypto.randomUUID(),
        concertId,
        type: '지출',
        category: '단원페이',
        title: `${member.name} 사례비`,
        plannedAmount: memberFee,
        paidAmount: 0,
        paymentStatus: '예정',
        createdAt: new Date().toISOString(),
      });
      console.log(`Budget created for ${member.name}: ${memberFee}원`);
    } catch (error) {
      console.error('Failed to create budget for member:', error);
    }
  } else {
    console.log('Skipped budget creation: member name missing', { memberFee, memberName: member?.name });
  }
}

/**
 * 콘서트에서 단원을 빼낸다.
 * members 마스터 DB 는 절대 삭제하지 않는다.
 * 해당 단원의 사례비 지출 항목도 함께 삭제한다.
 */
export async function removeMemberFromConcert(
  concertMemberId: string
): Promise<void> {
  const cm = await db.concertMembers.get(concertMemberId);
  if (cm) {
    const member = await db.members.get(cm.memberId);
    // 해당 단원의 사례비 지출 항목 삭제
    if (member?.name) {
      const budgets = await db.budgets
        .where('concertId')
        .equals(cm.concertId)
        .filter(b => b.title === `${member.name} 사례비` && b.category === '단원페이')
        .toArray();
      for (const b of budgets) {
        await db.budgets.delete(b.id);
      }
    }
  }
  await db.concertMembers.delete(concertMemberId);
}

export async function toggleReserveStatus(
  concertMemberId: string,
  isReserve: boolean
): Promise<void> {
  await db.concertMembers.update(concertMemberId, { isReserve });
}
