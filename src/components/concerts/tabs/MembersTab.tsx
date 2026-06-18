import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, UserPlus, Edit2 } from 'lucide-react';
import type { Concert, ConcertMember, Member, MemberRole, PositionAssignment } from '../../../types';
import Modal from '../../common/Modal';
import Combobox from '../../common/Combobox';
import { showToast } from '../../common/Toast';
import {
  getAllMembers,
  getConcertMembers,
  addMemberToConcert,
  removeMemberFromConcert,
  toggleReserveStatus,
  createMember,
  updateMember,
} from '../../../hooks/useMembers';
import { db } from '../../../db/database';
import { formatNumberInput, parseFormattedNumber } from '../../../utils/calculations';
import { normalizeInstrumentName, getInstrumentBase } from '../../../utils/normalization';
import { INSTRUMENT_OPTIONS, PART_OPTIONS_BY_INSTRUMENT, ROLE_OPTIONS } from '../../../constants/memberOptions';
import type { ConcertTabContext } from '../ConcertDetail';

type ConcertMemberFull = ConcertMember & { member: Member };

type RecentPerformance = {
  concertId: string;
  title: string;
  date: string;
  instrument: string;
  fee?: number;
};

type PositionSeatDefinition = {
  id: string;
  section: string;
  label: string;
  role: string;
  desk: number | null;
  seat: 'in' | 'out' | null;
};

const ABILITY_GRADE_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700 border-blue-200',
  B: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  C: 'bg-gray-100 text-gray-500 border-gray-200',
};

const makeRoleSeat = (section: string, role: string): PositionSeatDefinition => ({
  id: `${section}__role__${role}`,
  section,
  label: role,
  role,
  desk: null,
  seat: null,
});

const makeStringDeskSeats = (section: string, deskCount: number, withInOut = true): PositionSeatDefinition[] =>
  Array.from({ length: deskCount }, (_, i) => i + 1).flatMap((desk) => {
    if (!withInOut) {
      return [{
        id: `${section}__desk__${desk}`,
        section,
        label: `${desk}`,
        role: '단원',
        desk,
        seat: null,
      }];
    }
    return (['in', 'out'] as const).map((seat) => ({
      id: `${section}__desk__${desk}__${seat}`,
      section,
      label: `${desk} ${seat}`,
      role: '단원',
      desk,
      seat,
    }));
  });

const CONDUCTOR_POSITION_SECTION: { title: string; seats: PositionSeatDefinition[] } = {
  title: 'Conductor',
  seats: [makeRoleSeat('Conductor', '지휘자')],
};

const SOLOIST_POSITION_SECTION: { title: string; seats: PositionSeatDefinition[] } = {
  title: 'Soloist',
  seats: [makeRoleSeat('Soloist', '협연자')],
};

const ARRANGER_POSITION_SECTION: { title: string; seats: PositionSeatDefinition[] } = {
  title: 'Arranger',
  seats: [makeRoleSeat('Arranger', '편곡자')],
};

const STRING_POSITION_SECTIONS: { title: string; seats: PositionSeatDefinition[] }[] = [
  { title: '1st Violin', seats: [makeRoleSeat('1st Violin', '악장'), makeRoleSeat('1st Violin', '수석'), ...makeStringDeskSeats('1st Violin', 10)] },
  { title: '2nd Violin', seats: [makeRoleSeat('2nd Violin', '수석'), makeRoleSeat('2nd Violin', '부수석'), ...makeStringDeskSeats('2nd Violin', 10)] },
  { title: 'Viola', seats: [makeRoleSeat('Viola', '수석'), makeRoleSeat('Viola', '부수석'), ...makeStringDeskSeats('Viola', 6)] },
  { title: 'Cello', seats: [makeRoleSeat('Cello', '수석'), makeRoleSeat('Cello', '부수석'), ...makeStringDeskSeats('Cello', 6)] },
  { title: 'Double Bass', seats: [makeRoleSeat('Double Bass', '수석'), makeRoleSeat('Double Bass', '부수석'), ...makeStringDeskSeats('Double Bass', 6, false)] },
];

const OTHER_POSITION_GROUPS = [
  { title: 'Woodwind', instruments: ['Flute', 'Piccolo', 'Oboe', 'English Horn', 'Clarinet', 'Bass Clarinet', 'Bassoon', 'Contrabassoon'] },
  { title: 'Brass', instruments: ['Horn', 'Trumpet', 'Trombone', 'Tuba'] },
  { title: 'Percussion', instruments: ['Timpani', 'Percussion', 'Bass Drum', 'Cymbals', 'Side Drum', 'Triangle', 'Tambourine', 'Gong'] },
  { title: 'Keyboard / Etc', instruments: ['Piano', 'Harp', 'Organ', 'Celesta'] },
];

const OTHER_POSITION_SECTIONS: { title: string; seats: PositionSeatDefinition[] }[] = OTHER_POSITION_GROUPS.map((group) => ({
  title: group.title,
  seats: group.instruments.flatMap((instrument) =>
    [1, 2, 3].map((num) => ({
      id: `${group.title}__${instrument}__${num}`,
      section: group.title,
      label: `${instrument} ${num}`,
      role: `${instrument} ${num}`,
      desk: null,
      seat: null,
    }))
  ),
}));

const POSITION_SECTIONS = [CONDUCTOR_POSITION_SECTION, SOLOIST_POSITION_SECTION, ARRANGER_POSITION_SECTION, ...STRING_POSITION_SECTIONS, ...OTHER_POSITION_SECTIONS];
const POSITION_SEATS = POSITION_SECTIONS.flatMap((section) => section.seats);

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  Conductor: '지휘',
  Soloist: '협연',
  Arranger: '편곡',
  '1st Violin': 'Violin I',
  '2nd Violin': 'Violin II',
  Viola: 'Viola',
  Cello: 'Cello',
  'Double Bass': 'Double Bass',
};

// 악기 정렬 순서 (포지션 차트 기준)
const INSTRUMENT_SORT_ORDER: Record<string, number> = {
  '지휘': -1,
  'Conductor': -1,
  'Violin I': 0,
  'Violin II': 1,
  'Viola': 2,
  'V.Cello': 3,
  'C.Bass': 4,
  'Flute': 5,
  'Piccolo': 6,
  'Oboe': 7,
  'English Horn': 8,
  'Clarinet': 9,
  'Bass Clarinet': 10,
  'Bassoon': 11,
  'Contrabassoon': 12,
  'Horn': 13,
  'Trumpet': 14,
  'Trombone': 15,
  'Tuba': 16,
  'Timpani': 17,
  'Percussion': 18,
  'Piano': 19,
  'Harp': 20,
};

const getInstrumentSortIndex = (instrument: string): number => {
  const normalized = normalizeInstrumentName(instrument);
  const compact = String(instrument ?? '').trim().toLowerCase().replace(/[\s._-]+/g, '');

  if (['지휘', 'conductor'].some((value) => compact.includes(value))) return -1;
  if (['violin1', 'violini', '1stviolin', 'vn1', 'v1'].some((value) => compact.includes(value))) return 0;
  if (['violin2', 'violinii', '2ndviolin', 'vn2', 'v2'].some((value) => compact.includes(value))) return 1;
  if (['violin', 'vn', '바이올린'].some((value) => compact.includes(value))) return 0;
  if (['viola', 'va', '비올라'].some((value) => compact.includes(value))) return 2;
  if (['vcello', 'cello', 'violoncello', 'vc', '첼로'].some((value) => compact.includes(value))) return 3;
  if (['cbass', 'contrabass', 'doublebass', 'db', '더블베이스', '콘트라베이스'].some((value) => compact.includes(value))) return 4;

  return INSTRUMENT_SORT_ORDER[normalized] ?? INSTRUMENT_SORT_ORDER[instrument] ?? 999;
};

const getConcertMemberInstrument = (cm: ConcertMemberFull): string =>
  normalizeInstrumentName(cm.assignedInstrument || cm.instrument || cm.member?.instrument) || '';

const getConcertMemberPart = (cm: ConcertMemberFull): string =>
  cm.assignedPart || cm.part || cm.member?.part || '';

const ROLE_SORT_ORDER: Record<string, number> = {
  지휘자: -2,
  악장: -1,
  수석: 0,
  부수석: 1,
  일반단원: 2,
  객원: 3,
  협연자: 4,
  편곡자: 5,
  미배치: 99,
};

const getConcertMemberRole = (cm: ConcertMemberFull): string =>
  cm.assignedRole || cm.role || cm.member?.role || '';

const getRoleSortIndex = (role: string): number => ROLE_SORT_ORDER[role] ?? 50;

const sortConcertMemberFulls = (items: ConcertMemberFull[]): ConcertMemberFull[] =>
  [...items].sort((a, b) => {
    const instrumentDiff =
      getInstrumentSortIndex(getConcertMemberInstrument(a)) - getInstrumentSortIndex(getConcertMemberInstrument(b));
    if (instrumentDiff !== 0) return instrumentDiff;

    const roleDiff = getRoleSortIndex(getConcertMemberRole(a)) - getRoleSortIndex(getConcertMemberRole(b));
    if (roleDiff !== 0) return roleDiff;

    const partDiff = getConcertMemberPart(a).localeCompare(getConcertMemberPart(b), 'ko', { numeric: true });
    if (partDiff !== 0) return partDiff;

    return (a.member?.name ?? '').localeCompare(b.member?.name ?? '', 'ko');
  });

const sortMembersForSelection = (items: Member[]): Member[] =>
  [...items].sort((a, b) => {
    const instrumentDiff = getInstrumentSortIndex(a.instrument) - getInstrumentSortIndex(b.instrument);
    if (instrumentDiff !== 0) return instrumentDiff;

    const partDiff = (a.part ?? '').localeCompare(b.part ?? '', 'ko', { numeric: true });
    if (partDiff !== 0) return partDiff;

    return a.name.localeCompare(b.name, 'ko');
  });

const buildRecentPerformanceMap = (
  currentConcertId: string,
  allConcertMembers: ConcertMember[],
  concerts: Concert[]
): Map<string, RecentPerformance[]> => {
  const concertById = new Map(concerts.map((concert) => [concert.id, concert]));
  const grouped = new Map<string, RecentPerformance[]>();

  allConcertMembers.forEach((cm) => {
    if (cm.concertId === currentConcertId) return;

    const concert = concertById.get(cm.concertId);
    if (!concert) return;

    const current = grouped.get(cm.memberId) ?? [];
    current.push({
      concertId: cm.concertId,
      title: concert.title,
      date: concert.date,
      instrument: normalizeInstrumentName(cm.assignedInstrument || cm.instrument) || cm.assignedInstrument || cm.instrument || '',
      fee: cm.fee,
    });
    grouped.set(cm.memberId, current);
  });

  grouped.forEach((items, memberId) => {
    grouped.set(
      memberId,
      items
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
    );
  });

  return grouped;
};

const formatRecentPerformance = (history: RecentPerformance[] | undefined): string => {
  if (!history || history.length === 0) return '-';
  return history
    .map((item) => {
      const date = item.date ? item.date.slice(0, 10) : '날짜 미정';
      const instrument = item.instrument ? ` · ${item.instrument}` : '';
      const fee = item.fee ? ` · ${item.fee.toLocaleString()}원` : '';
      return `${date} ${item.title}${instrument}${fee}`;
    })
    .join(' / ');
};

const getPositionSectionName = (seat: PositionSeatDefinition) => {
  if (SECTION_DISPLAY_NAMES[seat.section]) return SECTION_DISPLAY_NAMES[seat.section];
  return seat.label.replace(/\s+\d+$/, '');
};

const getPositionLabel = (seat: PositionSeatDefinition) => seat.label;

const getCalculatedRole = (seat: PositionSeatDefinition): MemberRole => {
  if (seat.label === '지휘자') return '지휘자';
  if (seat.label === '협연자') return '협연자';
  if (seat.label === '편곡자') return '편곡자';
  if (seat.label === '악장') return '악장';
  if (seat.label === '수석') return '수석';
  if (seat.label === '부수석') return '부수석';
  return '일반단원';
};

const assignmentSeatId = (assignment: PositionAssignment) =>
  POSITION_SEATS.find(
    (seat) =>
      seat.section === assignment.section &&
      (seat.role === assignment.role || seat.label === assignment.position || seat.label === assignment.role) &&
      seat.desk === assignment.desk &&
      seat.seat === assignment.seat
  )?.id;

function AbilityGradeBadge({
  memberId,
  grade,
  onChanged,
}: {
  memberId: string;
  grade?: 'A' | 'B' | 'C';
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = async (g: 'A' | 'B' | 'C' | null) => {
    await updateMember(memberId, { abilityGrade: g ?? undefined });
    setOpen(false);
    onChanged();
    showToast(`등급이 ${g ? g + '등급으로' : '해제'}되었습니다.`);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-2 py-0.5 rounded-full border font-semibold transition-colors ${
          grade ? ABILITY_GRADE_COLORS[grade] : 'bg-gray-50 text-gray-300 border-gray-200'
        }`}
        title="클릭하여 등급 변경"
      >
        {grade ?? '—'}
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-24">
          {(['A', 'B', 'C'] as const).map((g) => (
            <button
              key={g}
              onClick={() => handleSelect(g)}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 ${
                ABILITY_GRADE_COLORS[g]
              } ${grade === g ? 'ring-1 ring-inset ring-blue-300' : ''}`}
            >
              {g}등급
            </button>
          ))}
          <button
            onClick={() => handleSelect(null)}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
          >
            등급 해제
          </button>
        </div>
      )}
    </div>
  );
}

function EditModal({
  cm,
  onClose,
  onSaved,
}: {
  cm: ConcertMemberFull;
  onClose: () => void;
  onSaved: () => void;
}) {
  const member = cm.member;
  const [form, setForm] = useState({
    instrument: '',
    part: '',
    role: '일반단원' as MemberRole,
    phone: '',
    email: '',
    nationality: '',
    idNumberType: '' as '주민등록번호' | '외국인등록번호' | '여권번호' | '',
    residentNumber: '',
    fee: '',
    bankName: '',
    bankAccount: '',
    accountHolder: '',
    accountHolderRelation: '',
    attendanceRate: 0,
    grade: '정단원',
    status: '활동중',
    note: '',
  });

  useEffect(() => {
    const normalizedInstrument = normalizeInstrumentName(cm.instrument || member?.instrument);
    setForm({
      instrument: normalizedInstrument,
      part: cm.part || member?.part || '',
      role: (cm.role as MemberRole) || member?.role || '일반단원',
      phone: cm.phone || member?.phone || '',
      email: member?.email || '',
      nationality: member?.nationality || '',
      idNumberType: (member?.idNumberType || '') as '주민등록번호' | '외국인등록번호' | '여권번호' | '',
      residentNumber: cm.residentNumber || member?.residentNumber || '',
      fee: formatNumberInput(String(cm.fee ?? member?.baseFee ?? 0)),
      bankName: cm.bankName || member?.bankName || '',
      bankAccount: cm.bankAccount || member?.bankAccount || '',
      accountHolder: member?.accountHolder || '',
      accountHolderRelation: member?.accountHolderRelation || '',
      attendanceRate: cm.attendanceRate ?? 0,
      grade: member?.grade || '정단원',
      status: member?.status || '활동중',
      note: member?.note || '',
    });
  }, [cm, member]);

  const handleSave = async () => {
    // 연주회 멤버 정보 업데이트
    await db.concertMembers.update(cm.id, {
      instrument: form.instrument,
      part: form.part,
      role: form.role,
      fee: parseFormattedNumber(form.fee),
      attendanceRate: form.attendanceRate,
      phone: form.phone,
      residentNumber: form.residentNumber,
      bankName: form.bankName,
      bankAccount: form.bankAccount,
    });

    // 멤버 기본 정보 업데이트
    if (member) {
      await updateMember(member.id, {
        instrument: form.instrument,
        part: form.part,
        role: form.role,
        phone: form.phone,
        email: form.email,
        nationality: form.nationality,
        idNumberType: form.idNumberType,
        residentNumber: form.residentNumber,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        accountHolder: form.accountHolder,
        accountHolderRelation: form.accountHolderRelation,
        baseFee: parseFormattedNumber(form.fee),
        grade: form.grade,
        status: form.status,
        note: form.note,
      });
    }

    // 예산 업데이트
    if (member?.name) {
      try {
        const budgetTitle = `${member.name} 사례비`;
        const budgets = await db.budgets
          .where('concertId')
          .equals(cm.concertId)
          .filter((b) => b.title === budgetTitle && b.category === '단원페이')
          .toArray();

        if (budgets.length > 0) {
          await db.budgets.update(budgets[0].id, { plannedAmount: form.fee });
        } else if (form.fee > 0) {
          await db.budgets.add({
            id: crypto.randomUUID(),
            concertId: cm.concertId,
            type: '지출',
            category: '단원페이',
            title: budgetTitle,
            plannedAmount: form.fee,
            paidAmount: 0,
            paymentStatus: '예정',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Budget update error:', error);
      }
    }

    showToast(`${member?.name} 정보가 저장되었습니다.`);
    onSaved();
  };

  return (
    <Modal
      title={`${member?.name} 수정`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleSave}>저장</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 기본 정보 */}
        <div>
          <label className="label">이름</label>
          <input className="input opacity-50 cursor-not-allowed" value={member?.name || ''} disabled />
        </div>
        <div>
          <label className="label">악기</label>
          <Combobox
            category="instrument"
            value={form.instrument}
            onChange={(value) => setForm((f) => ({ ...f, instrument: value, part: '' }))}
            defaultOptions={INSTRUMENT_OPTIONS}
          />
        </div>
        <div>
          <label className="label">파트</label>
          {(() => {
            const instrumentBase = getInstrumentBase(form.instrument);
            const partOptions = PART_OPTIONS_BY_INSTRUMENT[instrumentBase] || [];
            const isDisabled = partOptions.length === 0;
            return (
              <Combobox
                category="part"
                value={form.part}
                onChange={(value) => setForm((f) => ({ ...f, part: value }))}
                defaultOptions={partOptions}
                disabled={isDisabled}
              />
            );
          })()}
        </div>
        <div>
          <label className="label">역할</label>
          <Combobox
            category="role"
            value={form.role}
            onChange={(value) => setForm((f) => ({ ...f, role: value as MemberRole }))}
            defaultOptions={ROLE_OPTIONS}
          />
        </div>

        {/* 연락처 정보 */}
        <div>
          <label className="label">연락처</label>
          <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
        </div>
        <div>
          <label className="label">이메일</label>
          <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="example@email.com" />
        </div>

        {/* 신분증 정보 */}
        <div>
          <label className="label">신분증 유형</label>
          <Combobox
            category="idNumberType"
            value={form.idNumberType}
            onChange={(value) => setForm((f) => ({ ...f, idNumberType: value as '주민등록번호' | '외국인등록번호' | '여권번호' | '' }))}
            defaultOptions={['주민등록번호', '외국인등록번호', '여권번호']}
          />
        </div>
        <div>
          <label className="label">신분증 번호</label>
          <input className="input" value={form.residentNumber} onChange={(e) => setForm((f) => ({ ...f, residentNumber: e.target.value }))} placeholder="000000-0000000" />
        </div>

        {/* 국적 */}
        <div>
          <label className="label">국적</label>
          <input className="input" value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} placeholder="한국" />
        </div>

        {/* 연주회 특화 정보 */}
        <div>
          <label className="label">출석률 (%)</label>
          <input type="number" className="input" value={form.attendanceRate} onChange={(e) => setForm((f) => ({ ...f, attendanceRate: +e.target.value }))} min="0" max="100" />
        </div>

        {/* 사례비 정보 */}
        <div>
          <label className="label">사례비 (원)</label>
          <input type="text" className="input" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: formatNumberInput(e.target.value) }))} />
        </div>
        <div>
          <label className="label">은행명</label>
          <input className="input" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="국민은행" />
        </div>
        <div>
          <label className="label">계좌번호</label>
          <input className="input" value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} placeholder="123-456-789012" />
        </div>
        <div>
          <label className="label">예금주명 (본인 이외)</label>
          <input className="input" value={form.accountHolder} onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))} />
        </div>
        <div>
          <label className="label">예금주와의 관계</label>
          <input className="input" value={form.accountHolderRelation} onChange={(e) => setForm((f) => ({ ...f, accountHolderRelation: e.target.value }))} />
        </div>

        {/* 상태 정보 */}
        <div>
          <label className="label">등급</label>
          <Combobox
            category="grade"
            value={form.grade}
            onChange={(value) => setForm((f) => ({ ...f, grade: value }))}
            defaultOptions={['정단원', '준단원', '객원']}
          />
        </div>
        <div>
          <label className="label">상태</label>
          <Combobox
            category="status"
            value={form.status}
            onChange={(value) => setForm((f) => ({ ...f, status: value }))}
            defaultOptions={['활동중', '휴식중', '탈퇴']}
          />
        </div>

        {/* 비고 */}
        <div className="col-span-2">
          <label className="label">비고</label>
          <textarea className="input h-20 resize-none" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}

function MemberRow({
  cm,
  recentHistory,
  onEdit,
  onRemove,
  onReload,
}: {
  cm: ConcertMemberFull;
  recentHistory?: RecentPerformance[];
  onEdit: () => void;
  onRemove: () => void;
  onReload: () => void;
}) {
  const partColors: Record<string, string> = {
    'Violin 1': 'bg-blue-50 text-blue-700',
    'Violin I': 'bg-blue-50 text-blue-700',
    'Violin 2': 'bg-indigo-50 text-indigo-700',
    'Violin II': 'bg-indigo-50 text-indigo-700',
    Viola: 'bg-purple-50 text-purple-700',
    Cello: 'bg-pink-50 text-pink-700',
    Bass: 'bg-rose-50 text-rose-700',
    'Double Bass': 'bg-rose-50 text-rose-700',
  };

  // 표시 우선순위: 포지션 저장값 > 미배치 > 기존 DB 값
  const instrumentValue = cm.assignedInstrument || cm.member?.instrument;
  const instrument = normalizeInstrumentName(instrumentValue) || '-';
  const part = cm.isAssigned ? (cm.assignedPart || '-') : '미배치';
  const role = cm.isAssigned ? (cm.assignedRole || '-') : '미배치';
  const seat = cm.isAssigned ? (cm.assignedSeat || '-') : '미배치';
  const partColor = partColors[part] || (part === '미배치' ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-600');

  return (
    <tr className={`hover:bg-gray-50 ${cm.isReserve ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 font-medium text-gray-900 text-sm">
        <div className="flex items-center gap-1.5">
          {cm.member?.name}
          <AbilityGradeBadge memberId={cm.member?.id ?? ''} grade={cm.member?.abilityGrade} onChanged={onReload} />
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge text-xs ${partColor}`}>
          {instrument === '-' && part === '미배치' ? '미배치' : `${instrument} - ${part}`}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{role}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{seat}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{cm.phone || cm.member?.phone || '-'}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.residentNumber || cm.member?.residentNumber || '-'}</td>
      <td className="px-4 py-3 text-center text-gray-600 text-sm">
        {cm.attendanceRate != null ? `${cm.attendanceRate}%` : '-'}
      </td>
      <td className="px-4 py-3 text-right text-gray-700 text-sm">
        {cm.fee ? `${cm.fee.toLocaleString()}원` : '-'}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs max-w-[260px]">
        <span className="line-clamp-2" title={formatRecentPerformance(recentHistory)}>
          {formatRecentPerformance(recentHistory)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.bankName || cm.member?.bankName || '-'}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.bankAccount || cm.member?.bankAccount || '-'}</td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => toggleReserveStatus(cm.id, !cm.isReserve).then(onReload)}
          className={`text-xs px-2 py-0.5 rounded-full border ${
            cm.isReserve ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {cm.isReserve ? '예비' : '정'}
        </button>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex gap-2 justify-center">
          <button onClick={onEdit} className="text-gray-400 hover:text-blue-600" title="수정">
            <Edit2 size={14} />
          </button>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-600" title="삭제">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function MembersTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [concertMembers, setConcertMembers] = useState<ConcertMemberFull[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ConcertMemberFull | null>(null);
  const [reserveFilter, setReserveFilter] = useState<'전체' | '정단원' | '예비단원'>('전체');
  const [editTarget, setEditTarget] = useState<ConcertMemberFull | null>(null);
  const [showPositionChart, setShowPositionChart] = useState(false);
  const [positionMemberIds, setPositionMemberIds] = useState<string[]>([]);
  const [recentPerformanceMap, setRecentPerformanceMap] = useState<Map<string, RecentPerformance[]>>(new Map());

  const load = async () => {
    const [cms, all, savedConcert, allConcertMembers, concerts] = await Promise.all([
      getConcertMembers(concertId),
      getAllMembers(),
      db.concerts.get(concertId),
      db.concertMembers.toArray(),
      db.concerts.toArray(),
    ]);
    setConcertMembers(cms);
    setAllMembers(all);
    setRecentPerformanceMap(buildRecentPerformanceMap(concertId, allConcertMembers, concerts));
    const savedMemberIds = savedConcert?.selectedMusicians?.map((m) => m.musicianId) ?? [];
    if (savedMemberIds.length > 0) {
      setPositionMemberIds(savedMemberIds);
    }
    return cms;
  };

  useEffect(() => {
    load();
  }, [concertId]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    await removeMemberFromConcert(removeTarget.id);
    setRemoveTarget(null);
    load();
  };

  const groupByPart: Record<string, ConcertMemberFull[]> = {};
  concertMembers.forEach((cm) => {
    const part = cm.part || cm.member?.part || '기타';
    if (!groupByPart[part]) groupByPart[part] = [];
    groupByPart[part].push(cm);
  });

  const regularCount = concertMembers.filter((m) => !m.isReserve).length;
  const reserveCount = concertMembers.filter((m) => m.isReserve).length;

  const filtered = sortConcertMemberFulls(
    concertMembers.filter((m) => {
      if (reserveFilter === '정단원') return !m.isReserve;
      if (reserveFilter === '예비단원') return m.isReserve;
      return true;
    })
  );

  const positionMembers = concertMembers.filter((cm) => {
    const targetIds = positionMemberIds.length > 0 ? positionMemberIds : concertMembers.map((m) => m.memberId);
    return targetIds.includes(cm.memberId);
  });

  const openPositionChart = () => {
    if (positionMemberIds.length === 0) {
      setPositionMemberIds(concertMembers.map((cm) => cm.memberId));
    }
    setShowPositionChart(true);
  };

  const handleMembersSelected = async (memberIds: string[]) => {
    setPositionMemberIds(memberIds);
    await load();
    setShowAdd(false);
    setShowPositionChart(true);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">단원 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            정단원 {regularCount}명 · 예비단원 {reserveCount}명
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowNewMember(true)}>
            <Plus size={14} /> 새 단원 추가
          </button>
          <button className="btn-secondary" onClick={openPositionChart} disabled={concertMembers.length === 0}>
            포지션 차트
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={14} /> DB에서 불러오기
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(groupByPart).map(([part, mbs]) => (
          <span key={part} className="badge bg-gray-100 text-gray-600">
            {part}: {mbs.filter((m) => !m.isReserve).length}명
          </span>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mr-2">
          {(['A', 'B', 'C'] as const).map((g) => (
            <span key={g} className={`px-2 py-0.5 rounded-full border font-semibold ${ABILITY_GRADE_COLORS[g]}`}>
              {g}
            </span>
          ))}
          <span>등급 클릭하여 변경</span>
        </div>
        <div className="flex gap-1">
          {(['전체', '정단원', '예비단원'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setReserveFilter(f)}
              className={`text-xs px-3 py-1 rounded-lg border ${
                reserveFilter === f ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">⭐ 포지션 차트 후 → 정렬 보기로</p>
        <p className="mt-1 text-xs text-amber-800">
          아래 단원 목록은 DB에서 가져온 뒤 Vn → Va → Vc → DB 순서로 정렬되며, 각 단원의 최근 연주 이력도 함께 표시됩니다.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p>등록된 단원이 없습니다.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름 · 등급</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">배치 (악기-파트)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">포지션</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">연락처</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주민등록번호</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">출석률</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">사례비</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">최근 이력</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">은행명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">계좌번호</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">예비</th>
                <th className="w-32 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cm) => (
                <MemberRow
                  key={cm.id}
                  cm={cm}
                  recentHistory={recentPerformanceMap.get(cm.memberId)}
                  onEdit={() => setEditTarget(cm)}
                  onRemove={() => setRemoveTarget(cm)}
                  onReload={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPositionChart && positionMembers.length > 0 && (
        <PositionChartModal
          concertId={concertId}
          members={positionMembers}
          onClose={() => setShowPositionChart(false)}
          onSaved={load}
        />
      )}

      {showAdd && (
        <AddMemberFromDB
          concertId={concertId}
          existing={concertMembers.map((cm) => cm.memberId)}
          allMembers={allMembers}
          recentPerformanceMap={recentPerformanceMap}
          onClose={() => setShowAdd(false)}
          onSaved={handleMembersSelected}
        />
      )}

      {showNewMember && <NewMemberForm concertId={concertId} onClose={() => setShowNewMember(false)} onSaved={() => { load(); setShowNewMember(false); }} />}

      {removeTarget && (
        <Modal title="단원 제외" onClose={() => setRemoveTarget(null)} size="sm" footer={<><button className="btn-secondary" onClick={() => setRemoveTarget(null)}>취소</button><button className="btn-danger" onClick={handleRemove}>제외</button></>}>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{removeTarget.member?.name}</span> 단원을 이 연주회에서 제외하시겠습니까?
          </p>
          <p className="text-xs text-gray-500 mt-2">전체 단원 DB에서는 삭제되지 않습니다.</p>
        </Modal>
      )}

      {editTarget && <EditModal cm={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); load(); }} />}
    </div>
  );
}

function PositionChartModal({
  concertId,
  members,
  onClose,
  onSaved,
}: {
  concertId: string;
  members: ConcertMemberFull[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [seatAssignments, setSeatAssignments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    db.concerts.get(concertId).then((concert) => {
      if (!mounted) return;
      const saved = concert?.positionAssignments ?? [];
      const next: Record<string, string> = {};
      saved.forEach((assignment) => {
        if (!members.some((cm) => cm.memberId === assignment.musicianId)) return;
        const seatId = assignmentSeatId(assignment);
        if (seatId) next[seatId] = assignment.musicianId;
      });
      setSeatAssignments(next);
    });
    return () => {
      mounted = false;
    };
  }, [concertId, members]);

  const assignedMemberIds = new Set(Object.values(seatAssignments));
  const unassigned = members.filter((cm) => !assignedMemberIds.has(cm.memberId));
  const assignedCount = assignedMemberIds.size;

  const handleSeatChange = (seatId: string, memberId: string) => {
    setSeatAssignments((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([currentSeatId, currentMemberId]) => {
        if (memberId && currentMemberId === memberId && currentSeatId !== seatId) {
          delete next[currentSeatId];
        }
      });
      if (memberId) {
        next[seatId] = memberId;
      } else {
        delete next[seatId];
      }
      return next;
    });
  };

  const memberLabel = (cm: ConcertMemberFull) => {
    const instrumentValue = cm.member.instrument || cm.part || cm.member.part;
    const normalizedInstrument = normalizeInstrumentName(instrumentValue) || '악기 미등록';
    return `${cm.member.name} (${normalizedInstrument})`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const positionAssignments: PositionAssignment[] = POSITION_SEATS.flatMap((seat) => {
        const memberId = seatAssignments[seat.id];
        const cm = members.find((item) => item.memberId === memberId);
        if (!cm) return [];
        const sectionName = getPositionSectionName(seat);
        const role = getCalculatedRole(seat);
        const position = getPositionLabel(seat);
        return [{
          musicianId: cm.memberId,
          name: cm.member.name,
          instrument: sectionName,
          part: sectionName,
          position,
          section: seat.section,
          role,
          desk: seat.desk,
          seat: seat.seat,
        }];
      });

      await db.transaction('rw', db.concerts, db.concertMembers, async () => {
        await db.concerts.update(concertId, {
          selectedMusicians: members.map((cm) => ({
            musicianId: cm.memberId,
            name: cm.member.name,
            instrument: cm.member.instrument,
          })),
          positionAssignments,
          updatedAt: new Date().toISOString(),
        });

        const assignmentByMemberId = new Map(positionAssignments.map((assignment) => [assignment.musicianId, assignment]));
        await Promise.all(members.map((cm) => {
          const assignment = assignmentByMemberId.get(cm.memberId);
          return db.concertMembers.update(cm.id, assignment
            ? {
                assignedInstrument: assignment.instrument,
                assignedPart: assignment.part ?? assignment.instrument,
                assignedRole: assignment.role,
                assignedSeat: assignment.position,
                isAssigned: true,
              }
            : {
                assignedInstrument: undefined,
                assignedPart: undefined,
                assignedRole: undefined,
                assignedSeat: undefined,
                isAssigned: false,
              });
        }));
      });

      showToast('포지션 차트가 단원관리에 반영되었습니다.');
      onSaved();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="포지션 차트 - 무대 배치"
      onClose={onClose}
      size="full"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>닫기</button>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : '포지션 저장'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          선택된 단원 {members.length}명 중 {assignedCount}명이 배치되었습니다. 지휘자, 협연자, 악장, 수석, 부수석은 전용 좌석에 배치하고 나머지 단원은 폴트 좌석에 넣어주세요.
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-700 px-4 py-3 text-center text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Stage</p>
          <p className="text-sm font-semibold">무대 앞 / 객석 방향 기준</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-0 lg:self-start">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">미배치 단원</p>
                <p className="text-xs text-gray-400">{unassigned.length}명 남음</p>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                {assignedCount}/{members.length}
              </span>
            </div>

            {unassigned.length === 0 ? (
              <p className="mt-4 text-xs text-gray-400">모든 선택 단원이 배치되었습니다.</p>
            ) : (
              <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                {unassigned.map((cm) => (
                  <div key={cm.memberId} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-800">{cm.member.name}</p>
                    <p className="text-xs text-gray-500">{memberLabel(cm).replace(`${cm.member.name} `, '')}</p>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <div className="space-y-4">
            {POSITION_SECTIONS.map((section) => {
              const isConductorSection = section.title === 'Conductor';
              const isSoloistSection = section.title === 'Soloist';
              const isFeaturedSection = isConductorSection || isSoloistSection;
              return (
                <div key={section.title} className={`rounded-xl border bg-white overflow-hidden ${isFeaturedSection ? 'border-amber-200 shadow-sm' : 'border-gray-200'}`}>
                  <div className={`px-4 py-2 border-b ${isFeaturedSection ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-sm font-semibold ${isFeaturedSection ? 'text-amber-800' : 'text-gray-800'}`}>
                      {isConductorSection ? '지휘자' : isSoloistSection ? '협연자' : section.title}
                    </p>
                    {isConductorSection && (
                      <p className="mt-0.5 text-xs text-amber-700">오케스트라 앞 중앙 지휘자 자리입니다.</p>
                    )}
                    {isSoloistSection && (
                      <p className="mt-0.5 text-xs text-amber-700">협연자 또는 독주자를 별도로 배치하는 자리입니다.</p>
                    )}
                  </div>
                  <div className={`grid gap-3 p-4 ${isFeaturedSection ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'}`}>
                    {section.seats.map((seat) => {
                      const current = seatAssignments[seat.id] ?? '';
                      const selectableMembers = members.filter((cm) => !assignedMemberIds.has(cm.memberId) || cm.memberId === current);
                      const isRoleSeat = seat.desk === null && (seat.role === '지휘자' || seat.role === '협연자' || seat.role === '악장' || seat.role === '수석' || seat.role === '부수석');
                      return (
                        <label
                          key={seat.id}
                          className={`block rounded-lg border p-2 transition-colors ${
                            seat.role === '지휘자' || seat.role === '협연자'
                              ? 'border-amber-200 bg-amber-50/80'
                              : isRoleSeat
                                ? 'border-blue-200 bg-blue-50/60'
                                : 'border-gray-200'
                          }`}
                        >
                          <span className="block text-xs font-semibold text-gray-600 mb-1">{seat.label}</span>
                          <select
                            className="input text-sm py-1.5"
                            value={current}
                            onChange={(e) => handleSeatChange(seat.id, e.target.value)}
                          >
                            <option value="">미배치</option>
                            {selectableMembers.map((cm) => (
                              <option key={cm.memberId} value={cm.memberId}>
                                {memberLabel(cm)}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PositionChart({
  concertId,
  members,
  onClose,
  onSaved,
}: {
  concertId: string;
  members: ConcertMemberFull[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [seatAssignments, setSeatAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    db.concerts.get(concertId).then((concert) => {
      if (!mounted) return;
      const saved = concert?.positionAssignments ?? [];
      const next: Record<string, string> = {};
      saved.forEach((assignment) => {
        if (!members.some((cm) => cm.memberId === assignment.musicianId)) return;
        const seatId = assignmentSeatId(assignment);
        if (seatId) next[seatId] = assignment.musicianId;
      });
      setSeatAssignments(next);
    });
    return () => {
      mounted = false;
    };
  }, [concertId, members]);

  const assignedMemberIds = new Set(Object.values(seatAssignments));
  const unassigned = members.filter((cm) => !assignedMemberIds.has(cm.memberId));

  const handleSeatChange = (seatId: string, memberId: string) => {
    setSeatAssignments((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([currentSeatId, currentMemberId]) => {
        if (memberId && currentMemberId === memberId && currentSeatId !== seatId) {
          delete next[currentSeatId];
        }
      });
      if (memberId) {
        next[seatId] = memberId;
      } else {
        delete next[seatId];
      }
      return next;
    });
  };

  const memberLabel = (cm: ConcertMemberFull) => {
    const instrumentValue = cm.member.instrument || cm.part || cm.member.part;
    const normalizedInstrument = normalizeInstrumentName(instrumentValue) || '악기 미등록';
    return `${cm.member.name} (${normalizedInstrument})`;
  };

  const handleSave = async () => {
    const positionAssignments: PositionAssignment[] = POSITION_SEATS.flatMap((seat) => {
      const memberId = seatAssignments[seat.id];
      const cm = members.find((item) => item.memberId === memberId);
      if (!cm) return [];
      const sectionName = getPositionSectionName(seat);
      const role = getCalculatedRole(seat);
      const position = getPositionLabel(seat);
      return [{
        musicianId: cm.memberId,
        name: cm.member.name,
        instrument: sectionName,
        part: sectionName,
        position,
        section: seat.section,
        role,
        desk: seat.desk,
        seat: seat.seat,
      }];
    });

    await db.transaction('rw', db.concerts, db.concertMembers, async () => {
      await db.concerts.update(concertId, {
        selectedMusicians: members.map((cm) => ({
          musicianId: cm.memberId,
          name: cm.member.name,
          instrument: cm.member.instrument,
        })),
        positionAssignments,
        updatedAt: new Date().toISOString(),
      });

      const assignmentByMemberId = new Map(positionAssignments.map((assignment) => [assignment.musicianId, assignment]));
      await Promise.all(members.map((cm) => {
        const assignment = assignmentByMemberId.get(cm.memberId);
        return db.concertMembers.update(cm.id, assignment
          ? {
              assignedInstrument: assignment.instrument,
              assignedPart: assignment.part ?? assignment.instrument,
              assignedRole: assignment.role,
              assignedSeat: assignment.position,
              isAssigned: true,
            }
          : {
              assignedInstrument: undefined,
              assignedPart: undefined,
              assignedRole: undefined,
              assignedSeat: undefined,
              isAssigned: false,
            });
      }));
    });

    showToast('포지션 차트가 단원관리에 반영되었습니다.');
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        <p>선택된 단원 {members.length}명만 배치합니다. 지휘자/협연자/악장/수석/부수석은 별도 역할 좌석이고, 일반 단원만 폴트 좌석에 넣어주세요.</p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2">미배치 단원</p>
        {unassigned.length === 0 ? (
          <p className="text-xs text-gray-400">모든 선택 단원이 배치되었습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unassigned.map((cm) => (
              <span key={cm.memberId} className="badge bg-gray-100 text-gray-600">
                {memberLabel(cm)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {POSITION_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-800">{section.title}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {section.seats.map((seat) => {
                const current = seatAssignments[seat.id] ?? '';
                const selectableMembers = members.filter((cm) => !assignedMemberIds.has(cm.memberId) || cm.memberId === current);
                const isRoleSeat = seat.desk === null && (seat.role === '지휘자' || seat.role === '협연자' || seat.role === '악장' || seat.role === '수석' || seat.role === '부수석');
                return (
                  <label key={seat.id} className={`block rounded-lg border p-2 ${isRoleSeat ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200'}`}>
                    <span className="block text-xs font-semibold text-gray-600 mb-1">{seat.label}</span>
                    <select
                      className="input text-sm py-1.5"
                      value={current}
                      onChange={(e) => handleSeatChange(seat.id, e.target.value)}
                    >
                      <option value="">미배치</option>
                      {selectableMembers.map((cm) => (
                        <option key={cm.memberId} value={cm.memberId}>
                          {memberLabel(cm)}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddMemberFromDB({
  concertId,
  existing,
  allMembers,
  recentPerformanceMap,
  onClose,
  onSaved,
}: {
  concertId: string;
  existing: string[];
  allMembers: Member[];
  recentPerformanceMap: Map<string, RecentPerformance[]>;
  onClose: () => void;
  onSaved: (memberIds: string[]) => void;
}) {
  const available = sortMembersForSelection(allMembers.filter((m) => !existing.includes(m.id)));
  const [selected, setSelected] = useState<string[]>([]);

  const handleAdd = async () => {
    const positionMemberIds = Array.from(new Set([...existing, ...selected]));
    const positionMembers = positionMemberIds
      .map((memberId) => allMembers.find((m) => m.id === memberId))
      .filter((m): m is Member => Boolean(m));
    const currentConcert = await db.concerts.get(concertId);

    for (const memberId of selected) {
      const m = allMembers.find((mm) => mm.id === memberId);
      if (!m) continue;
      try {
        await addMemberToConcert(concertId, memberId, { fee: m.baseFee, isReserve: false });
      } catch (e: any) {
        if (e?.message !== 'ALREADY_IN_CONCERT') throw e;
      }
    }

    await db.concerts.update(concertId, {
      selectedMusicians: positionMembers.map((member) => ({
        musicianId: member.id,
        name: member.name,
        instrument: member.instrument,
      })),
      positionAssignments: (currentConcert?.positionAssignments ?? []).filter((assignment) =>
        positionMemberIds.includes(assignment.musicianId)
      ),
      updatedAt: new Date().toISOString(),
    });
    onSaved(positionMemberIds);
  };

  return (
    <Modal title="단원 DB에서 선택" onClose={onClose} size="md" footer={<><button className="btn-secondary" onClick={onClose}>취소</button><button className="btn-primary" onClick={handleAdd} disabled={selected.length === 0}>단원 선택 완료</button></>}>
      {available.length === 0 ? (
        <p className="text-sm text-gray-500">추가할 수 있는 단원이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">
            이번 연주회에 참여할 단원을 먼저 선택하세요. Vn → Va → Vc → DB 순서로 정렬되어 있고, 선택 완료 후 포지션 차트가 열립니다.
          </p>
          {available.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3 flex-1">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} className="rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{normalizeInstrumentName(m.instrument) || m.instrument} · {m.part || '-'} · {m.role}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    최근 이력: {formatRecentPerformance(recentPerformanceMap.get(m.id))}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">{m.baseFee ? `${m.baseFee.toLocaleString()}원` : '미등록'}</p>
                <p className="text-xs text-gray-400">기본 사례비</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

function NewMemberForm({ concertId, onClose, onSaved }: { concertId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', instrument: '', part: '', role: '일반단원' as MemberRole, phone: '', fee: '' });

  const handleSave = async () => {
    if (!form.name) { alert('이름을 입력해 주세요.'); return; }
    const memberId = await createMember({ name: form.name, instrument: form.instrument, part: form.part, role: form.role, phone: form.phone, grade: '정단원', status: '활동중' });
    await addMemberToConcert(concertId, memberId, { role: form.role, part: form.part, fee: parseFormattedNumber(form.fee), isReserve: false });
    onSaved();
  };

  return (
    <Modal title="새 단원 추가" onClose={onClose} size="md" footer={<><button className="btn-secondary" onClick={onClose}>취소</button><button className="btn-primary" onClick={handleSave}>저장</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div>
          <label className="label">악기</label>
          <Combobox
            category="instrument"
            value={form.instrument}
            onChange={(value) => setForm((f) => ({ ...f, instrument: value, part: '' }))}
            defaultOptions={INSTRUMENT_OPTIONS}
          />
        </div>
        <div>
          <label className="label">파트</label>
          {(() => {
            const instrumentBase = getInstrumentBase(form.instrument);
            const partOptions = PART_OPTIONS_BY_INSTRUMENT[instrumentBase] || [];
            const isDisabled = partOptions.length === 0;
            return (
              <Combobox
                category="part"
                value={form.part}
                onChange={(value) => setForm((f) => ({ ...f, part: value }))}
                defaultOptions={partOptions}
                disabled={isDisabled}
              />
            );
          })()}
        </div>
        <div>
          <label className="label">역할</label>
          <Combobox
            category="role"
            value={form.role}
            onChange={(value) => setForm((f) => ({ ...f, role: value as MemberRole }))}
            defaultOptions={ROLE_OPTIONS}
          />
        </div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        <div><label className="label">사례비 (원)</label><input type="text" className="input" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: formatNumberInput(e.target.value) }))} /></div>
      </div>
    </Modal>
  );
}
