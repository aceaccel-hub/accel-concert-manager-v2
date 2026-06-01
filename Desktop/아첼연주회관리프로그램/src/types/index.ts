/**
 * 아첼 연주회 관리 프로그램 - 도메인 타입 정의
 *
 * 모든 엔티티 인터페이스와 union type 들을 정의한다.
 * concertId 가 들어가는 엔티티는 모두 "연결(junction) 테이블"이며,
 * masters (concerts, repertoire, members, groups) 와는 분리되어 관리된다.
 */

// ---------- Union Literal Types ----------

export type ConcertStatus = '기획중' | '준비중' | '진행중' | '완료' | '취소';
export type MemberRole =
  | '악장'
  | '수석'
  | '부수석'
  | '일반단원'
  | '객원'
  | '지휘자'
  | '협연자';
export type GroupRole = '주최' | '주관' | '후원' | '협력' | '출연' | '기획';
export type RehearsalType = '섹션연습' | '합주연습' | '드레스리허설' | '기타';
export type AttendanceStatus = '출석' | '결석' | '지각' | '조퇴';
export type BudgetType = '수입' | '지출';
export type PaymentStatus = '예정' | '완료' | '취소';
export type ScoreStatus = '준비완료' | '준비중' | '미준비';
export type DocumentType =
  | '연주회기획서'
  | '체크리스트'
  | '곡목표'
  | '단원명단'
  | '리허설일정표'
  | '사회자멘트'
  | '큐시트'
  | '프로그램북원고'
  | '공지문'
  | '정산표'
  | '기타';

export type Difficulty = '초급' | '중급' | '고급';
export type MemberGrade = '정단원' | '준단원' | '객원';
export type MemberStatus = '활동중' | '휴식중' | '탈퇴';
export type GroupStatus = '운영중' | '휴식중' | '해산';
export type Evaluation = '상' | '중' | '하';

// ---------- Master Entities ----------

export interface Concert {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  place: string;
  conductor: string;
  coPerformer?: string;
  manager?: string;
  status: ConcertStatus;
  groupId?: string;
  expectedDuration?: number; // 분 단위
  progressRate: number; // 0~100, 체크리스트 진행률로 자동 갱신
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repertoire {
  id: string;
  composer: string;
  title: string;
  arrangement?: string;
  instrumentation?: string;
  duration?: number; // 분 단위
  difficulty?: Difficulty;
  scoreFile?: string;
  note?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  instrument: string;
  part?: string;
  role: MemberRole;
  phone?: string;
  email?: string;
  residentNumber?: string;
  idNumberType?: '주민등록번호' | '외국인등록번호' | '여권번호';
  nationality?: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string; // 예금주명 (본인 이외 타인 명의인 경우)
  accountHolderRelation?: string; // 예금주와의 관계
  baseFee?: number;
  grade?: MemberGrade;
  abilityGrade?: 'A' | 'B' | 'C';
  status: MemberStatus;
  joinDate?: string;
  note?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  type: string;
  representative?: string;
  manager?: string;
  phone?: string;
  email?: string;
  homepage?: string;
  address?: string;
  regularSchedule?: string;
  businessNumber?: string; // 사업자등록번호
  status: GroupStatus;
  note?: string;
  createdAt: string;
}

// ---------- Junction Entities (concertId 필수) ----------

export interface ProgramItem {
  id: string;
  concertId: string;
  repertoireId?: string;
  order: number;
  composer: string;
  title: string;
  movement?: string;
  duration?: number; // 분 단위
  soloist?: string;
  scoreStatus: ScoreStatus;
  partScoreStatus: ScoreStatus;
  partScoreDetail?: Record<string, { status: ScoreStatus; assignee?: string }>; // 파트별 악보 상태+담당자
  note?: string;
}

export interface ConcertMember {
  id: string;
  concertId: string;
  memberId: string;
  role?: string;
  part?: string;
  fee?: number;
  feeExtra?: number;
  feeDeduction?: number;
  feePaid?: boolean;
  attendanceRate?: number; // 0~100, 출석 기록 시 자동 계산
  evaluation?: Evaluation;
  isReserve: boolean;
  membershipFeePaid?: boolean; // 정기회비 수납 여부
  scorePrintingPaid?: boolean; // 악보 제본비 지출 여부
  note?: string;
}

export interface ConcertGroup {
  id: string;
  concertId: string;
  groupId: string;
  role: GroupRole;
}

export interface Rehearsal {
  id: string;
  concertId: string;
  date: string;
  time: string;
  place: string;
  type: RehearsalType;
  targetPieces?: string[];
  targetMembers?: string[];
  progressRate?: number;
  memo?: string;
  dressCode?: string; // 연주 복장(드레스 코드)
  equipmentMemo?: string; // 지참 준비물
  conductorEvaluation?: Evaluation;
  nextTask?: string;
  createdAt: string;
}

export interface RehearsalAttendance {
  id: string;
  rehearsalId: string;
  concertId: string;
  memberId: string;
  status: AttendanceStatus;
}

export interface Budget {
  id: string;
  concertId: string;
  type: BudgetType;
  category: string;
  title: string;
  plannedAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  payeeId?: string;
  memo?: string;
  createdAt: string;
}

/**
 * balance 는 계산된 값. DB에 저장하지 않는다.
 * (getBudgets 가 plannedAmount - paidAmount 로 매번 계산해 반환)
 */
export interface BudgetWithBalance extends Budget {
  balance: number;
}

export interface ConcertDocument {
  id: string;
  concertId: string;
  type: DocumentType;
  title: string;
  fileFormat?: string;
  fileUrl?: string;
  content?: string;
  createdAt: string;
}

export interface Checklist {
  id: string;
  concertId: string;
  title: string;
  isDone: boolean;
  order: number;
}

export interface Memo {
  id: string;
  concertId: string;
  content: string;
  category?: string;
  updatedAt: string;
}

// ---------- App-level Settings ----------

export interface Settings {
  baseYear: number;
  dataPath: string;
  outputFormat: 'pdf' | 'word' | 'excel';
  language: 'ko' | 'en';
  autoSaveInterval: number; // 분
  backupCycle: number; // 일
}

// ---------- Backup / Restore Shape ----------

export interface BackupBundle {
  version: number;
  exportedAt: string;
  concerts: Concert[];
  repertoire: Repertoire[];
  programItems: ProgramItem[];
  members: Member[];
  concertMembers: ConcertMember[];
  groups: Group[];
  concertGroups: ConcertGroup[];
  rehearsals: Rehearsal[];
  rehearsalAttendance: RehearsalAttendance[];
  budgets: Budget[];
  documents: ConcertDocument[];
  checklists: Checklist[];
  memos: Memo[];
}
