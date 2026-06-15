import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, UserPlus, Edit2 } from 'lucide-react';
import type { ConcertMember, Member, MemberRole, PositionAssignment } from '../../../types';
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
import type { ConcertTabContext } from '../ConcertDetail';

type ConcertMemberFull = ConcertMember & { member: Member };

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

const POSITION_SECTIONS = [...STRING_POSITION_SECTIONS, ...OTHER_POSITION_SECTIONS];
const POSITION_SEATS = POSITION_SECTIONS.flatMap((section) => section.seats);

const assignmentSeatId = (assignment: PositionAssignment) =>
  POSITION_SEATS.find(
    (seat) =>
      seat.section === assignment.section &&
      seat.role === assignment.role &&
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
    setForm({
      instrument: member?.instrument || '',
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
          <input className="input" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} />
        </div>
        <div>
          <label className="label">파트</label>
          <Combobox
            category="part"
            value={form.part}
            onChange={(value) => setForm((f) => ({ ...f, part: value }))}
            defaultOptions={['Violin 1', 'Violin 2', 'Viola', 'Cello', 'Contrabass', 'Piano', 'Flute', 'Oboe', 'Clarinet', 'Bassoon']}
          />
        </div>
        <div>
          <label className="label">역할</label>
          <Combobox
            category="role"
            value={form.role}
            onChange={(value) => setForm((f) => ({ ...f, role: value as MemberRole }))}
            defaultOptions={['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자']}
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
  onEdit,
  onRemove,
  onReload,
}: {
  cm: ConcertMemberFull;
  onEdit: () => void;
  onRemove: () => void;
  onReload: () => void;
}) {
  const partColors: Record<string, string> = {
    'Violin 1': 'bg-blue-50 text-blue-700',
    'Violin 2': 'bg-indigo-50 text-indigo-700',
    Viola: 'bg-purple-50 text-purple-700',
    Cello: 'bg-pink-50 text-pink-700',
    Bass: 'bg-rose-50 text-rose-700',
  };
  const part = cm.part || cm.member?.part || '기타';
  const partColor = partColors[part] || 'bg-gray-50 text-gray-600';

  return (
    <tr className={`hover:bg-gray-50 ${cm.isReserve ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 font-medium text-gray-900 text-sm">
        <div className="flex items-center gap-1.5">
          {cm.member?.name}
          <AbilityGradeBadge memberId={cm.member?.id ?? ''} grade={cm.member?.abilityGrade} onChanged={onReload} />
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.member?.instrument || '-'}</td>
      <td className="px-4 py-3">
        <span className={`badge text-xs ${partColor}`}>{part}</span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.role || '-'}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{cm.phone || cm.member?.phone || '-'}</td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.residentNumber || cm.member?.residentNumber || '-'}</td>
      <td className="px-4 py-3 text-center text-gray-600 text-sm">
        {cm.attendanceRate != null ? `${cm.attendanceRate}%` : '-'}
      </td>
      <td className="px-4 py-3 text-right text-gray-700 text-sm">
        {cm.fee ? `${cm.fee.toLocaleString()}원` : '-'}
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

  const load = async () => {
    const [cms, all, savedConcert] = await Promise.all([
      getConcertMembers(concertId),
      getAllMembers(),
      db.concerts.get(concertId),
    ]);
    setConcertMembers(cms);
    setAllMembers(all);
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

  const filtered = concertMembers.filter((m) => {
    if (reserveFilter === '정단원') return !m.isReserve;
    if (reserveFilter === '예비단원') return m.isReserve;
    return true;
  });

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">악기</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">파트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">연락처</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주민등록번호</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">출석률</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">사례비</th>
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
        <PositionChart
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

  const memberLabel = (cm: ConcertMemberFull) =>
    `${cm.member.name} (${cm.member.instrument || cm.part || cm.member.part || '악기 미등록'})`;

  const handleSave = async () => {
    const positionAssignments: PositionAssignment[] = POSITION_SEATS.flatMap((seat) => {
      const memberId = seatAssignments[seat.id];
      const cm = members.find((item) => item.memberId === memberId);
      if (!cm) return [];
      return [{
        musicianId: cm.memberId,
        name: cm.member.name,
        instrument: cm.member.instrument,
        section: seat.section,
        role: seat.role,
        desk: seat.desk,
        seat: seat.seat,
      }];
    });

    await db.concerts.update(concertId, {
      selectedMusicians: members.map((cm) => ({
        musicianId: cm.memberId,
        name: cm.member.name,
        instrument: cm.member.instrument,
      })),
      positionAssignments,
      updatedAt: new Date().toISOString(),
    });

    showToast('포지션 차트가 현재 연주회에 저장되었습니다.');
    onSaved();
  };

  return (
    <div className="card p-4 space-y-4 border-blue-100 bg-blue-50/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">포지션 차트</h3>
          <p className="text-xs text-gray-500 mt-1">
            선택된 단원 {members.length}명만 배치합니다. 악장/수석/부수석은 별도 역할 좌석이고, 일반 단원만 폴트 좌석에 넣어주세요.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary" onClick={onClose}>닫기</button>
          <button className="btn-primary" onClick={handleSave}>포지션 저장</button>
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
              {section.seats.map((seat) => {
                const current = seatAssignments[seat.id] ?? '';
                const selectableMembers = members.filter((cm) => !assignedMemberIds.has(cm.memberId) || cm.memberId === current);
                const isRoleSeat = seat.desk === null && (seat.role === '악장' || seat.role === '수석' || seat.role === '부수석');
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
  onClose,
  onSaved,
}: {
  concertId: string;
  existing: string[];
  allMembers: Member[];
  onClose: () => void;
  onSaved: (memberIds: string[]) => void;
}) {
  const available = allMembers.filter((m) => !existing.includes(m.id));
  const [selected, setSelected] = useState<string[]>([]);

  const handleAdd = async () => {
    const selectedMembers = selected
      .map((memberId) => allMembers.find((m) => m.id === memberId))
      .filter((m): m is Member => Boolean(m));

    for (const memberId of selected) {
      const m = allMembers.find((mm) => mm.id === memberId);
      if (!m) continue;
      try {
        await addMemberToConcert(concertId, memberId, { role: m.role, part: m.part, fee: m.baseFee, isReserve: false });
      } catch (e: any) {
        if (e?.message !== 'ALREADY_IN_CONCERT') throw e;
      }
    }

    await db.concerts.update(concertId, {
      selectedMusicians: selectedMembers.map((member) => ({
        musicianId: member.id,
        name: member.name,
        instrument: member.instrument,
      })),
      positionAssignments: [],
      updatedAt: new Date().toISOString(),
    });
    onSaved(selected);
  };

  return (
    <Modal title="단원 DB에서 선택" onClose={onClose} size="md" footer={<><button className="btn-secondary" onClick={onClose}>취소</button><button className="btn-primary" onClick={handleAdd} disabled={selected.length === 0}>단원 선택 완료</button></>}>
      {available.length === 0 ? (
        <p className="text-sm text-gray-500">추가할 수 있는 단원이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">
            이번 연주회에 참여할 단원을 먼저 선택하세요. 선택 완료 후 포지션 차트가 열립니다.
          </p>
          {available.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3 flex-1">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} className="rounded" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.instrument} · {m.part} · {m.role}</p>
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
        <div><label className="label">악기</label><input className="input" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} /></div>
        <div><label className="label">파트</label><input className="input" value={form.part} onChange={(e) => setForm((f) => ({ ...f, part: e.target.value }))} placeholder="Violin 1" /></div>
        <div><label className="label">역할</label><select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as MemberRole }))}>{(['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'] as MemberRole[]).map((r) => <option key={r}>{r}</option>)}</select></div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        <div><label className="label">사례비 (원)</label><input type="text" className="input" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: formatNumberInput(e.target.value) }))} /></div>
      </div>
    </Modal>
  );
}
