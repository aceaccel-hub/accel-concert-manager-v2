export type ConcertStatus = '기획중' | '준비중' | '진행중' | '완료' | '취소';
export type MemberRole = '악장' | '수석' | '부수석' | '일반단원' | '객원' | '지휘자' | '협연자';
export type GroupRole = '주최' | '주관' | '후원' | '협력' | '출연' | '기획';
export type RehearsalType = '섹션연습' | '합주연습' | '드레스리허설' | '기타';
export type AttendanceStatus = '출석' | '결석' | '지각' | '조퇴';
export type BudgetType = '수입' | '지출';
export type PaymentStatus = '예정' | '완료' | '취소';
export type ScoreStatus = '준비완료' | '준비중' | '미준비';
export type DocumentType =
  | '연주회기획서' | '체크리스트' | '곡목표' | '단원명단'
  | '리허설일정표' | '사회자멘트' | '큐시트' | '프로그램북원고'
  | '공지문' | '정산표' | '기타';

export interface Concert {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  conductor: string;
  coPerformer?: string;
  manager?: string;
  status: ConcertStatus;
  groupId?: string;
  expectedDuration?: number;
  progressRate: number;
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
  duration?: number;
  difficulty?: '초급' | '중급' | '고급';
  scoreFile?: string;
  note?: string;
  createdAt: string;
}

export interface ProgramItem {
  id: string;
  concertId: string;
  repertoireId?: string;
  order: number;
  composer: string;
  title: string;
  movement?: string;
  duration?: number;
  soloist?: string;
  scoreStatus: ScoreStatus;
  partScoreStatus: ScoreStatus;
  note?: string;
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
  bankAccount?: string;
  bankName?: string;
  baseFee?: number;
  grade?: '정단원' | '준단원' | '객원';
  status: '활동중' | '휴식중' | '탈퇴';
  joinDate?: string;
  note?: string;
  createdAt: string;
}

export interface ConcertMember {
  id: string;
  concertId: string;
  memberId: string;
  role?: string;
  part?: string;
  fee?: number;
  attendanceRate?: number;
  evaluation?: '상' | '중' | '하';
  isReserve: boolean;
  note?: string;
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
  status: '운영중' | '휴식중' | '해산';
  note?: string;
  createdAt: string;
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
  conductorEvaluation?: '상' | '중' | '하';
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

export interface Document {
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
  updatedAt: string;
}

export interface Settings {
  baseYear: number;
  dataPath: string;
  outputFormat: 'pdf' | 'word' | 'excel';
  language: 'ko' | 'en';
  autoSaveInterval: number;
  backupCycle: number;
  maskResidentNumber: boolean;
  maskBankAccount: boolean;
}
