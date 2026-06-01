/**
 * 연습(rehearsals) + 출석(rehearsalAttendance) 관리
 *
 * - recordAttendance 는 upsert (rehearsalId+memberId 기준).
 * - 출석 기록 시 해당 단원의 attendanceRate 를 자동으로 다시 계산해 저장한다.
 *   계산식: '출석'/'지각' 으로 한 횟수 / 전체 출석 기록 횟수.
 *   (지각은 출석으로 인정, 조퇴와 결석은 미출석으로 본다.)
 * - 연습 삭제 시 그 연습의 모든 출석 기록도 함께 정리한다.
 */

import { db } from '../db/database';
import type {
  AttendanceStatus,
  Rehearsal,
  RehearsalAttendance,
} from '../types';
import { calcProgressRate } from '../utils/calculations';

export type RehearsalCreateInput = Omit<
  Rehearsal,
  'id' | 'concertId' | 'createdAt'
>;

export type RehearsalUpdateInput = Partial<
  Omit<Rehearsal, 'id' | 'concertId' | 'createdAt'>
>;

// ---------- Rehearsals ----------

export async function getRehearsals(concertId: string): Promise<Rehearsal[]> {
  if (!concertId) return [];
  const list = await db.rehearsals.where('concertId').equals(concertId).toArray();
  return list.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

export async function createRehearsal(
  concertId: string,
  data: RehearsalCreateInput
): Promise<string> {
  if (!concertId) throw new Error('CONCERT_ID_REQUIRED');
  const id = crypto.randomUUID();
  const r: Rehearsal = {
    ...data,
    id,
    concertId,
    createdAt: new Date().toISOString(),
  };
  await db.rehearsals.add(r);
  return id;
}

export async function updateRehearsal(
  id: string,
  data: RehearsalUpdateInput
): Promise<void> {
  await db.rehearsals.update(id, data);
}

/**
 * 연습 삭제 시 해당 연습의 출석 기록을 정리하고 영향받은 단원의 출석률을 즉시 재계산한다.
 */
export async function deleteRehearsal(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.rehearsals,
    db.rehearsalAttendance,
    db.concertMembers,
    async () => {
      // 삭제 전 영향받는 단원 목록과 concertId 확보
      const rehearsal = await db.rehearsals.get(id);
      const affected = await db.rehearsalAttendance
        .where('rehearsalId')
        .equals(id)
        .toArray();
      const memberIds = [...new Set(affected.map((a) => a.memberId))];

      // 출석 기록 및 연습 삭제
      await db.rehearsalAttendance.where('rehearsalId').equals(id).delete();
      await db.rehearsals.delete(id);

      // 영향받은 단원들의 출석률 즉시 재계산
      if (rehearsal) {
        for (const memberId of memberIds) {
          const rate = await calcAttendanceRateInternal(memberId, rehearsal.concertId);
          const cm = await db.concertMembers
            .where('[concertId+memberId]')
            .equals([rehearsal.concertId, memberId])
            .first();
          if (cm) await db.concertMembers.update(cm.id, { attendanceRate: rate });
        }
      }
    }
  );
}

// ---------- Attendance ----------

export async function getAttendance(
  rehearsalId: string
): Promise<RehearsalAttendance[]> {
  if (!rehearsalId) return [];
  return db.rehearsalAttendance.where('rehearsalId').equals(rehearsalId).toArray();
}

/**
 * 출석 기록을 upsert 한다. (rehearsalId + memberId 가 키)
 * 이후 해당 단원의 attendanceRate 를 자동으로 갱신한다.
 */
export async function recordAttendance(
  rehearsalId: string,
  concertId: string,
  memberId: string,
  status: AttendanceStatus
): Promise<void> {
  if (!rehearsalId || !concertId || !memberId) {
    throw new Error('REQUIRED_IDS');
  }

  await db.transaction(
    'rw',
    db.rehearsalAttendance,
    db.concertMembers,
    db.rehearsals,
    async () => {
      const existing = await db.rehearsalAttendance
        .where('[rehearsalId+memberId]')
        .equals([rehearsalId, memberId])
        .first();

      if (existing) {
        await db.rehearsalAttendance.update(existing.id, { status });
      } else {
        await db.rehearsalAttendance.add({
          id: crypto.randomUUID(),
          rehearsalId,
          concertId,
          memberId,
          status,
        });
      }

      // 출석률 재계산
      const rate = await calcAttendanceRateInternal(memberId, concertId);

      const cm = await db.concertMembers
        .where('[concertId+memberId]')
        .equals([concertId, memberId])
        .first();
      if (cm) {
        await db.concertMembers.update(cm.id, { attendanceRate: rate });
      }
    }
  );
}

/**
 * 해당 콘서트 내에서 단원의 출석률(0~100) 을 반환한다.
 * - 분모: 그 단원에 대해 기록된 모든 출석 행
 * - 분자: '출석' 또는 '지각' 인 행
 */
export async function getAttendanceRate(
  memberId: string,
  concertId: string
): Promise<number> {
  if (!memberId || !concertId) return 0;
  return calcAttendanceRateInternal(memberId, concertId);
}

/**
 * 해당 연주회의 곡별 연습 횟수를 집계한다.
 * targetPieces 배열에 포함된 programItemId 기준으로 카운트한다.
 * @returns Record<programItemId, count>
 */
export async function getRehearsalCountPerPiece(
  concertId: string
): Promise<Record<string, number>> {
  if (!concertId) return {};
  const rehearsals = await db.rehearsals
    .where('concertId')
    .equals(concertId)
    .toArray();

  const counts: Record<string, number> = {};
  for (const r of rehearsals) {
    for (const pieceId of r.targetPieces ?? []) {
      counts[pieceId] = (counts[pieceId] ?? 0) + 1;
    }
  }
  return counts;
}

async function calcAttendanceRateInternal(
  memberId: string,
  concertId: string
): Promise<number> {
  const rows = await db.rehearsalAttendance
    .where('concertId')
    .equals(concertId)
    .filter((r) => r.memberId === memberId)
    .toArray();

  if (rows.length === 0) return 0;
  const present = rows.filter(
    (r) => r.status === '출석' || r.status === '지각'
  ).length;
  return calcProgressRate(present, rows.length);
}
