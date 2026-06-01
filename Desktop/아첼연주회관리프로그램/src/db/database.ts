/**
 * 아첼 연주회 관리 프로그램 - Dexie (IndexedDB) 스키마 정의
 *
 * 핵심 원칙:
 *  1) masters (concerts, repertoire, members, groups) 와 junction (concertId 포함) 분리
 *  2) deleteConcertCascade 는 연결 테이블만 제거하며 masters 는 절대 건드리지 않는다
 *  3) 모든 junction 조회는 concertId 기반 인덱스를 사용
 */

import Dexie, { type Table } from 'dexie';
import type {
  Concert,
  Repertoire,
  ProgramItem,
  Member,
  ConcertMember,
  Group,
  ConcertGroup,
  Rehearsal,
  RehearsalAttendance,
  Budget,
  ConcertDocument,
  Checklist,
  Memo,
  MasterItem,
  BackupBundle,
} from '../types';

class AccelDB extends Dexie {
  concerts!: Table<Concert, string>;
  repertoire!: Table<Repertoire, string>;
  programItems!: Table<ProgramItem, string>;
  members!: Table<Member, string>;
  concertMembers!: Table<ConcertMember, string>;
  groups!: Table<Group, string>;
  concertGroups!: Table<ConcertGroup, string>;
  rehearsals!: Table<Rehearsal, string>;
  rehearsalAttendance!: Table<RehearsalAttendance, string>;
  budgets!: Table<Budget, string>;
  documents!: Table<ConcertDocument, string>;
  checklists!: Table<Checklist, string>;
  memos!: Table<Memo, string>;
  masterItems!: Table<MasterItem, string>;

  constructor() {
    super('AccelConcertManager');

    this.version(1).stores({
      concerts: 'id, status, groupId, date',
      repertoire: 'id, composer, title',
      programItems: 'id, concertId, order, repertoireId',
      members: 'id, name, instrument, status',
      concertMembers: 'id, concertId, memberId, [concertId+memberId]',
      groups: 'id, name, status',
      concertGroups: 'id, concertId, groupId, [concertId+groupId]',
      rehearsals: 'id, concertId, date',
      rehearsalAttendance:
        'id, rehearsalId, concertId, memberId, [rehearsalId+memberId]',
      budgets: 'id, concertId, type',
      documents: 'id, concertId, type',
      checklists: 'id, concertId, order',
      memos: 'id, concertId',
    });

    this.version(2).stores({
      concerts: 'id, status, groupId, date',
      repertoire: 'id, composer, title',
      programItems: 'id, concertId, order, repertoireId',
      members: 'id, name, instrument, status',
      concertMembers: 'id, concertId, memberId, [concertId+memberId]',
      groups: 'id, name, status',
      concertGroups: 'id, concertId, groupId, [concertId+groupId]',
      rehearsals: 'id, concertId, date',
      rehearsalAttendance:
        'id, rehearsalId, concertId, memberId, [rehearsalId+memberId]',
      budgets: 'id, concertId, type',
      documents: 'id, concertId, type',
      checklists: 'id, concertId, order',
      memos: 'id, concertId',
      masterItems: 'id, category, value',
    });
  }
}

export const db = new AccelDB();

// ---------- Cascade Delete ----------

/**
 * 콘서트 1건과 관련된 junction 데이터를 모두 제거한다.
 *
 * 절대 삭제 금지: members, repertoire, groups 마스터 테이블의 레코드
 * (그 마스터들은 다른 콘서트에서 참조될 수 있으므로 보존)
 */
export async function deleteConcertCascade(concertId: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.concerts,
      db.programItems,
      db.concertMembers,
      db.concertGroups,
      db.rehearsals,
      db.rehearsalAttendance,
      db.budgets,
      db.documents,
      db.checklists,
      db.memos,
    ],
    async () => {
      // 1) 모든 junction 테이블에서 concertId 기준 삭제
      await db.programItems.where('concertId').equals(concertId).delete();
      await db.concertMembers.where('concertId').equals(concertId).delete();
      await db.concertGroups.where('concertId').equals(concertId).delete();
      await db.rehearsalAttendance
        .where('concertId')
        .equals(concertId)
        .delete();
      await db.rehearsals.where('concertId').equals(concertId).delete();
      await db.budgets.where('concertId').equals(concertId).delete();
      await db.documents.where('concertId').equals(concertId).delete();
      await db.checklists.where('concertId').equals(concertId).delete();
      await db.memos.where('concertId').equals(concertId).delete();

      // 2) 마지막으로 콘서트 본인 삭제
      await db.concerts.delete(concertId);

      // ※ db.members / db.repertoire / db.groups 는 절대 건드리지 않는다.
    }
  );
}

// ---------- Backup / Restore ----------

/**
 * 모든 테이블을 한 번에 직렬화해 백업 번들로 반환한다.
 */
export async function exportAllData(): Promise<BackupBundle> {
  const [
    concerts,
    repertoire,
    programItems,
    members,
    concertMembers,
    groups,
    concertGroups,
    rehearsals,
    rehearsalAttendance,
    budgets,
    documents,
    checklists,
    memos,
  ] = await Promise.all([
    db.concerts.toArray(),
    db.repertoire.toArray(),
    db.programItems.toArray(),
    db.members.toArray(),
    db.concertMembers.toArray(),
    db.groups.toArray(),
    db.concertGroups.toArray(),
    db.rehearsals.toArray(),
    db.rehearsalAttendance.toArray(),
    db.budgets.toArray(),
    db.documents.toArray(),
    db.checklists.toArray(),
    db.memos.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    concerts,
    repertoire,
    programItems,
    members,
    concertMembers,
    groups,
    concertGroups,
    rehearsals,
    rehearsalAttendance,
    budgets,
    documents,
    checklists,
    memos,
  };
}

/**
 * 백업 번들로 모든 테이블을 복원한다. (기존 데이터 전체 교체)
 *
 * 트랜잭션 내에서 모든 테이블을 clear 한 뒤 bulkAdd 로 채워 넣는다.
 */
export async function importAllData(bundle: BackupBundle): Promise<void> {
  if (!bundle || bundle.version !== 1) {
    throw new Error('INVALID_BACKUP_VERSION');
  }

  await db.transaction(
    'rw',
    [
      db.concerts,
      db.repertoire,
      db.programItems,
      db.members,
      db.concertMembers,
      db.groups,
      db.concertGroups,
      db.rehearsals,
      db.rehearsalAttendance,
      db.budgets,
      db.documents,
      db.checklists,
      db.memos,
    ],
    async () => {
      await Promise.all([
        db.concerts.clear(),
        db.repertoire.clear(),
        db.programItems.clear(),
        db.members.clear(),
        db.concertMembers.clear(),
        db.groups.clear(),
        db.concertGroups.clear(),
        db.rehearsals.clear(),
        db.rehearsalAttendance.clear(),
        db.budgets.clear(),
        db.documents.clear(),
        db.checklists.clear(),
        db.memos.clear(),
      ]);

      await Promise.all([
        db.concerts.bulkAdd(bundle.concerts ?? []),
        db.repertoire.bulkAdd(bundle.repertoire ?? []),
        db.programItems.bulkAdd(bundle.programItems ?? []),
        db.members.bulkAdd(bundle.members ?? []),
        db.concertMembers.bulkAdd(bundle.concertMembers ?? []),
        db.groups.bulkAdd(bundle.groups ?? []),
        db.concertGroups.bulkAdd(bundle.concertGroups ?? []),
        db.rehearsals.bulkAdd(bundle.rehearsals ?? []),
        db.rehearsalAttendance.bulkAdd(bundle.rehearsalAttendance ?? []),
        db.budgets.bulkAdd(bundle.budgets ?? []),
        db.documents.bulkAdd(bundle.documents ?? []),
        db.checklists.bulkAdd(bundle.checklists ?? []),
        db.memos.bulkAdd(bundle.memos ?? []),
      ]);
    }
  );
}

// ---------- Sample Seed ----------

/**
 * 비어 있을 때 한 번만 샘플 데이터를 채워준다.
 */
export async function initSampleData(): Promise<void> {
  const count = await db.concerts.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  const groupId = crypto.randomUUID();
  const concertId1 = crypto.randomUUID();
  const concertId2 = crypto.randomUUID();
  const memberId1 = crypto.randomUUID();
  const memberId2 = crypto.randomUUID();
  const memberId3 = crypto.randomUUID();

  await db.groups.add({
    id: groupId,
    name: '아첼 체임버 오케스트라',
    type: '오케스트라',
    representative: '심우림',
    phone: '010-0000-0000',
    status: '운영중',
    createdAt: now,
  });

  await db.concerts.bulkAdd([
    {
      id: concertId1,
      title: '제48회 아첼 정기연주회',
      date: '2026-08-15',
      time: '19:30',
      place: '예술의전당 콘서트홀',
      conductor: '김지휘',
      coPerformer: '박협연',
      manager: '이담당',
      status: '준비중',
      groupId,
      expectedDuration: 120,
      progressRate: 45,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: concertId2,
      title: '제47회 아첼 신년음악회',
      date: '2026-01-10',
      time: '18:00',
      place: '세종문화회관 소극장',
      conductor: '김지휘',
      status: '완료',
      groupId,
      expectedDuration: 90,
      progressRate: 100,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.members.bulkAdd([
    {
      id: memberId1,
      name: '이바이올린',
      instrument: '바이올린',
      part: 'Violin 1',
      role: '악장',
      phone: '010-1111-2222',
      grade: '정단원',
      status: '활동중',
      createdAt: now,
    },
    {
      id: memberId2,
      name: '박첼로',
      instrument: '첼로',
      part: 'Cello',
      role: '수석',
      phone: '010-3333-4444',
      grade: '정단원',
      status: '활동중',
      createdAt: now,
    },
    {
      id: memberId3,
      name: '최비올라',
      instrument: '비올라',
      part: 'Viola',
      role: '일반단원',
      phone: '010-5555-6666',
      grade: '정단원',
      status: '활동중',
      createdAt: now,
    },
  ]);

  await db.concertMembers.bulkAdd([
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      memberId: memberId1,
      role: '악장',
      part: 'Violin 1',
      fee: 300000,
      isReserve: false,
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      memberId: memberId2,
      role: '수석',
      part: 'Cello',
      fee: 250000,
      isReserve: false,
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      memberId: memberId3,
      role: '일반단원',
      part: 'Viola',
      fee: 200000,
      isReserve: false,
    },
  ]);

  const repId1 = crypto.randomUUID();
  const repId2 = crypto.randomUUID();

  await db.repertoire.bulkAdd([
    {
      id: repId1,
      composer: 'Vivaldi',
      title: 'The Four Seasons',
      instrumentation: '바이올린 협주곡',
      duration: 45,
      difficulty: '고급',
      createdAt: now,
    },
    {
      id: repId2,
      composer: 'Mozart',
      title: 'Symphony No.40 in G minor',
      instrumentation: '오케스트라',
      duration: 30,
      difficulty: '고급',
      createdAt: now,
    },
  ]);

  await db.programItems.bulkAdd([
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      repertoireId: repId1,
      order: 1,
      composer: 'Vivaldi',
      title: 'The Four Seasons',
      movement: '봄, 여름, 가을, 겨울',
      duration: 45,
      soloist: '박협연',
      scoreStatus: '준비완료',
      partScoreStatus: '준비중',
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      repertoireId: repId2,
      order: 2,
      composer: 'Mozart',
      title: 'Symphony No.40 in G minor',
      duration: 30,
      scoreStatus: '준비완료',
      partScoreStatus: '준비완료',
    },
  ]);

  await db.rehearsals.bulkAdd([
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      date: '2026-06-15',
      time: '14:00',
      place: '연습실 A',
      type: '합주연습',
      targetPieces: ['Vivaldi - Four Seasons'],
      progressRate: 60,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      date: '2026-06-29',
      time: '14:00',
      place: '연습실 A',
      type: '합주연습',
      targetPieces: ['Mozart - Symphony No.40'],
      progressRate: 0,
      createdAt: now,
    },
  ]);

  await db.budgets.bulkAdd([
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      type: '수입',
      category: '티켓판매',
      title: '티켓 판매 수익',
      plannedAmount: 5000000,
      paidAmount: 0,
      paymentStatus: '예정',
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      type: '지출',
      category: '대관료',
      title: '예술의전당 대관료',
      plannedAmount: 2000000,
      paidAmount: 2000000,
      paymentStatus: '완료',
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      type: '지출',
      category: '지휘자사례비',
      title: '지휘자 사례비',
      plannedAmount: 1000000,
      paidAmount: 0,
      paymentStatus: '예정',
      payeeId: memberId1,
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      concertId: concertId1,
      type: '지출',
      category: '단원사례비',
      title: '단원 사례비',
      plannedAmount: 800000,
      paidAmount: 0,
      paymentStatus: '예정',
      createdAt: now,
    },
  ]);

  await db.checklists.bulkAdd([
    { id: crypto.randomUUID(), concertId: concertId1, title: '장소 예약 완료', isDone: true, order: 1 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '곡목 확정', isDone: true, order: 2 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '악보 준비 완료', isDone: false, order: 3 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '단원 섭외 완료', isDone: true, order: 4 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '연습 일정 확정', isDone: false, order: 5 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '포스터 제작 완료', isDone: false, order: 6 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '프로그램북 제작 완료', isDone: false, order: 7 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '홍보 시작', isDone: false, order: 8 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '리허설 완료', isDone: false, order: 9 },
    { id: crypto.randomUUID(), concertId: concertId1, title: '정산 완료', isDone: false, order: 10 },
  ]);

  await db.memos.add({
    id: crypto.randomUUID(),
    concertId: concertId1,
    content:
      '- 지휘자 미팅: 6월 1일 예정\n- 포스터 디자인 시안 요청 중\n- 악보 추가 주문 필요',
    updatedAt: now,
  });

  await db.concertGroups.add({
    id: crypto.randomUUID(),
    concertId: concertId1,
    groupId,
    role: '주최',
  });
}
