import Dexie, { type Table } from 'dexie';
import type {
  Concert, Repertoire, ProgramItem, Member, ConcertMember,
  Group, ConcertGroup, Rehearsal, RehearsalAttendance,
  Budget, Document, Checklist, Memo
} from '../types';

class AccelDB extends Dexie {
  concerts!: Table<Concert>;
  repertoire!: Table<Repertoire>;
  programItems!: Table<ProgramItem>;
  members!: Table<Member>;
  concertMembers!: Table<ConcertMember>;
  groups!: Table<Group>;
  concertGroups!: Table<ConcertGroup>;
  rehearsals!: Table<Rehearsal>;
  rehearsalAttendance!: Table<RehearsalAttendance>;
  budgets!: Table<Budget>;
  documents!: Table<Document>;
  checklists!: Table<Checklist>;
  memos!: Table<Memo>;

  constructor() {
    super('AccelConcertManager');
    this.version(1).stores({
      concerts: 'id, status, groupId, date',
      repertoire: 'id, composer, title',
      programItems: 'id, concertId, order',
      members: 'id, name, instrument, status',
      concertMembers: 'id, concertId, memberId',
      groups: 'id, name, status',
      concertGroups: 'id, concertId, groupId',
      rehearsals: 'id, concertId, date',
      rehearsalAttendance: 'id, rehearsalId, concertId, memberId',
      budgets: 'id, concertId, type',
      documents: 'id, concertId, type',
      checklists: 'id, concertId, order',
      memos: 'id, concertId',
    });
  }
}

export const db = new AccelDB();

// 샘플 데이터 초기화
export async function initSampleData() {
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
    { id: memberId1, name: '이바이올린', instrument: '바이올린', part: 'Violin 1', role: '악장', phone: '010-1111-2222', grade: '정단원', status: '활동중', createdAt: now },
    { id: memberId2, name: '박첼로', instrument: '첼로', part: 'Cello', role: '수석', phone: '010-3333-4444', grade: '정단원', status: '활동중', createdAt: now },
    { id: memberId3, name: '최비올라', instrument: '비올라', part: 'Viola', role: '일반단원', phone: '010-5555-6666', grade: '정단원', status: '활동중', createdAt: now },
  ]);

  await db.concertMembers.bulkAdd([
    { id: crypto.randomUUID(), concertId: concertId1, memberId: memberId1, role: '악장', part: 'Violin 1', fee: 300000, isReserve: false },
    { id: crypto.randomUUID(), concertId: concertId1, memberId: memberId2, role: '수석', part: 'Cello', fee: 250000, isReserve: false },
    { id: crypto.randomUUID(), concertId: concertId1, memberId: memberId3, role: '일반단원', part: 'Viola', fee: 200000, isReserve: false },
  ]);

  const repId1 = crypto.randomUUID();
  const repId2 = crypto.randomUUID();

  await db.repertoire.bulkAdd([
    { id: repId1, composer: 'Vivaldi', title: 'The Four Seasons', instrumentation: '바이올린 협주곡', duration: 45, difficulty: '고급', createdAt: now },
    { id: repId2, composer: 'Mozart', title: 'Symphony No.40 in G minor', instrumentation: '오케스트라', duration: 30, difficulty: '고급', createdAt: now },
  ]);

  await db.programItems.bulkAdd([
    { id: crypto.randomUUID(), concertId: concertId1, repertoireId: repId1, order: 1, composer: 'Vivaldi', title: 'The Four Seasons', movement: '봄, 여름, 가을, 겨울', duration: 45, soloist: '박협연', scoreStatus: '준비완료', partScoreStatus: '준비중' },
    { id: crypto.randomUUID(), concertId: concertId1, repertoireId: repId2, order: 2, composer: 'Mozart', title: 'Symphony No.40 in G minor', duration: 30, scoreStatus: '준비완료', partScoreStatus: '준비완료' },
  ]);

  await db.rehearsals.bulkAdd([
    { id: crypto.randomUUID(), concertId: concertId1, date: '2026-06-15', time: '14:00', place: '연습실 A', type: '합주연습', targetPieces: ['Vivaldi - Four Seasons'], progressRate: 60, createdAt: now },
    { id: crypto.randomUUID(), concertId: concertId1, date: '2026-06-29', time: '14:00', place: '연습실 A', type: '합주연습', targetPieces: ['Mozart - Symphony No.40'], progressRate: 0, createdAt: now },
  ]);

  await db.budgets.bulkAdd([
    { id: crypto.randomUUID(), concertId: concertId1, type: '수입', category: '티켓판매', title: '티켓 판매 수익', plannedAmount: 5000000, paidAmount: 0, paymentStatus: '예정', createdAt: now },
    { id: crypto.randomUUID(), concertId: concertId1, type: '지출', category: '대관료', title: '예술의전당 대관료', plannedAmount: 2000000, paidAmount: 2000000, paymentStatus: '완료', createdAt: now },
    { id: crypto.randomUUID(), concertId: concertId1, type: '지출', category: '지휘자사례비', title: '지휘자 사례비', plannedAmount: 1000000, paidAmount: 0, paymentStatus: '예정', payeeId: memberId1, createdAt: now },
    { id: crypto.randomUUID(), concertId: concertId1, type: '지출', category: '단원사례비', title: '단원 사례비', plannedAmount: 800000, paidAmount: 0, paymentStatus: '예정', createdAt: now },
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
  ]);

  await db.memos.add({
    id: crypto.randomUUID(),
    concertId: concertId1,
    content: '- 지휘자 미팅: 6월 1일 예정\n- 포스터 디자인 시안 요청 중\n- 악보 추가 주문 필요',
    updatedAt: now,
  });

  await db.concertGroups.add({
    id: crypto.randomUUID(),
    concertId: concertId1,
    groupId,
    role: '주최',
  });
}
