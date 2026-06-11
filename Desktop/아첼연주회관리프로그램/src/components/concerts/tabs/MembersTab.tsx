import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import type { ConcertMember, Member, MemberRole } from '../../../types';
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
import type { ConcertTabContext } from '../ConcertDetail';

type ConcertMemberFull = ConcertMember & { member: Member };

const ABILITY_GRADE_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700 border-blue-200',
  B: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  C: 'bg-gray-100 text-gray-500 border-gray-200',
};

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
  const [part, setPart] = useState(cm.part || cm.member?.part || '');
  const [role, setRole] = useState<MemberRole>(
    (cm.role as MemberRole) || cm.member?.role || '일반단원'
  );
  const [phone, setPhone] = useState(cm.phone || cm.member?.phone || '');
  const [fee, setFee] = useState(cm.fee ?? cm.member?.baseFee ?? 0);
  const [bankAccount, setBankAccount] = useState(cm.bankAccount || cm.member?.bankAccount || '');
  const [residentNumber, setResidentNumber] = useState(cm.residentNumber || cm.member?.residentNumber || '');
  const [bankName, setBankName] = useState(cm.bankName || cm.member?.bankName || '');
  const [attendanceRate, setAttendanceRate] = useState(cm.attendanceRate ?? 0);

  const handleSave = async () => {
    await db.concertMembers.update(cm.id, {
      part,
      role,
      fee,
      attendanceRate,
      phone,
      residentNumber,
      bankName,
      bankAccount,
    });

    if (cm.member?.name) {
      try {
        const budgetTitle = `${cm.member.name} 사례비`;
        const budgets = await db.budgets
          .where('concertId')
          .equals(cm.concertId)
          .filter((b) => b.title === budgetTitle && b.category === '단원페이')
          .toArray();

        if (budgets.length > 0) {
          await db.budgets.update(budgets[0].id, { plannedAmount: fee });
        } else if (fee > 0) {
          await db.budgets.add({
            id: crypto.randomUUID(),
            concertId: cm.concertId,
            type: '지출',
            category: '단원페이',
            title: budgetTitle,
            plannedAmount: fee,
            paidAmount: 0,
            paymentStatus: '예정',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Budget update error:', error);
      }
    }

    showToast(`${cm.member?.name} 정보가 저장되었습니다.`);
    onSaved();
  };

  return (
    <Modal
      title={`${cm.member?.name} 수정`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleSave}>저장</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">이름</label>
            <input className="input opacity-50 cursor-not-allowed" value={cm.member?.name || ''} disabled />
          </div>
          <div>
            <label className="label">악기</label>
            <input className="input opacity-50 cursor-not-allowed" value={cm.member?.instrument || ''} disabled />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">파트</label>
            <Combobox
              category="part"
              value={part}
              onChange={setPart}
              placeholder="파트"
              defaultOptions={['Violin 1', 'Violin 2', 'Viola', 'Cello', 'Contrabass', 'Piano', 'Flute', 'Oboe', 'Clarinet', 'Bassoon']}
            />
          </div>
          <div>
            <label className="label">역할</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              {(['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'] as MemberRole[]).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">연락처</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="label">주민등록번호</label>
            <input className="input" value={residentNumber} onChange={(e) => setResidentNumber(e.target.value)} placeholder="000000-0000000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">출석률 (%)</label>
            <input type="number" className="input" value={attendanceRate} onChange={(e) => setAttendanceRate(+e.target.value)} min="0" max="100" />
          </div>
          <div>
            <label className="label">사례비 (원)</label>
            <input type="number" className="input" value={fee} onChange={(e) => setFee(+e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">은행명</label>
            <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="국민은행" />
          </div>
          <div>
            <label className="label">계좌번호</label>
            <input className="input" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="123-456-789012" />
          </div>
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
        <div className="flex items-center justify-center gap-2">
          <button onClick={onEdit} className="text-xs px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
            수정
          </button>
          <button onClick={onRemove} className="text-gray-400 hover:text-red-600">
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

  const load = async () => {
    const [cms, all] = await Promise.all([getConcertMembers(concertId), getAllMembers()]);
    setConcertMembers(cms);
    setAllMembers(all);
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

      {showAdd && (
        <AddMemberFromDB concertId={concertId} existing={concertMembers.map((cm) => cm.memberId)} allMembers={allMembers} onClose={() => setShowAdd(false)} onSaved={() => { load(); setShowAdd(false); }} />
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

function AddMemberFromDB({ concertId, existing, allMembers, onClose, onSaved }: { concertId: string; existing: string[]; allMembers: Member[]; onClose: () => void; onSaved: () => void }) {
  const available = allMembers.filter((m) => !existing.includes(m.id));
  const [selected, setSelected] = useState<string[]>([]);

  const handleAdd = async () => {
    for (const memberId of selected) {
      const m = allMembers.find((mm) => mm.id === memberId);
      if (!m) continue;
      try {
        await addMemberToConcert(concertId, memberId, { role: m.role, part: m.part, fee: m.baseFee, isReserve: false });
      } catch (e: any) {
        if (e?.message !== 'ALREADY_IN_CONCERT') throw e;
      }
    }
    onSaved();
  };

  return (
    <Modal title="단원 DB에서 추가" onClose={onClose} size="md" footer={<><button className="btn-secondary" onClick={onClose}>취소</button><button className="btn-primary" onClick={handleAdd} disabled={selected.length === 0}>{selected.length}명 추가</button></>}>
      {available.length === 0 ? (
        <p className="text-sm text-gray-500">추가할 수 있는 단원이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
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
  const [form, setForm] = useState({ name: '', instrument: '', part: '', role: '일반단원' as MemberRole, phone: '', fee: 0 });

  const handleSave = async () => {
    if (!form.name) { alert('이름을 입력해 주세요.'); return; }
    const memberId = await createMember({ name: form.name, instrument: form.instrument, part: form.part, role: form.role, phone: form.phone, grade: '정단원', status: '활동중' });
    await addMemberToConcert(concertId, memberId, { role: form.role, part: form.part, fee: form.fee, isReserve: false });
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
        <div><label className="label">사례비 (원)</label><input type="number" className="input" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: +e.target.value }))} /></div>
      </div>
    </Modal>
  );
}
