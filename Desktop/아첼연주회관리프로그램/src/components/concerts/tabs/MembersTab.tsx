/**
 * 단원 탭
 * - 인라인 수정: 행 우측 [수정] 버튼 → 해당 행이 입력 필드로 전환
 * - A/B/C 등급 배지: 이름 옆 클릭 시 드롭다운으로 변경
 */
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, UserPlus, Save, X } from 'lucide-react';
import type { ConcertMember, Member, MemberRole } from '../../../types';
import Modal from '../../common/Modal';
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

// ---------- A/B/C 등급 배지 ----------
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

// ---------- 인라인 수정 행 ----------
function EditableRow({
  cm,
  onSaved,
  onCancel,
  onRemove,
  onReload,
}: {
  cm: ConcertMemberFull;
  onSaved: () => void;
  onCancel: () => void;
  onRemove: (cm: ConcertMemberFull) => void;
  onReload: () => void;
}) {
  const [part, setPart] = useState(cm.part || cm.member?.part || '');
  const [role, setRole] = useState<MemberRole>(
    (cm.role as MemberRole) || cm.member?.role || '일반단원'
  );
  const [phone, setPhone] = useState(cm.member?.phone || '');
  const [fee, setFee] = useState(cm.fee ?? cm.member?.baseFee ?? 0);

  const handleSave = async () => {
    // concertMembers의 파트/역할/사례비 갱신
    await db.concertMembers.update(cm.id, { part, role, fee });
    // members DB의 연락처도 함께 갱신
    if (cm.member?.id) {
      await updateMember(cm.member.id, { phone, part, role });
    }
    showToast(`${cm.member?.name} 정보가 저장되었습니다.`);
    onSaved();
  };

  return (
    <tr className="bg-blue-50 border-l-4 border-l-[#2563eb]">
      <td className="px-4 py-2 font-medium text-gray-900 text-sm whitespace-nowrap">
        {cm.member?.name}
        <AbilityGradeBadge
          memberId={cm.member?.id ?? ''}
          grade={cm.member?.abilityGrade}
          onChanged={onReload}
        />
      </td>
      <td className="px-4 py-2 text-gray-600 text-sm">{cm.member?.instrument || '-'}</td>
      <td className="px-3 py-2">
        <input
          className="input text-xs py-1 px-2 w-28"
          value={part}
          onChange={(e) => setPart(e.target.value)}
          placeholder="파트"
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="input text-xs py-1 px-2 w-28"
          value={role}
          onChange={(e) => setRole(e.target.value as MemberRole)}
        >
          {(['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'] as MemberRole[]).map(
            (r) => <option key={r}>{r}</option>
          )}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          className="input text-xs py-1 px-2 w-28"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="연락처"
        />
      </td>
      <td className="px-4 py-2 text-center text-sm text-gray-500">
        {cm.attendanceRate != null ? `${cm.attendanceRate}%` : '-'}
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          className="input text-xs py-1 px-2 w-24 text-right"
          value={fee}
          onChange={(e) => setFee(+e.target.value)}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <button
          onClick={() => toggleReserveStatus(cm.id, !cm.isReserve).then(onSaved)}
          className={`text-xs px-2 py-0.5 rounded-full border ${
            cm.isReserve
              ? 'bg-orange-50 text-orange-600 border-orange-200'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {cm.isReserve ? '예비' : '정'}
        </button>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} className="btn-primary text-xs py-1 px-2">
            <Save size={12} /> 저장
          </button>
          <button onClick={onCancel} className="btn-secondary text-xs py-1 px-2">
            <X size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------- 읽기 전용 행 ----------
function ReadonlyRow({
  cm,
  onEdit,
  onRemove,
  onReload,
}: {
  cm: ConcertMemberFull;
  onEdit: () => void;
  onRemove: (cm: ConcertMemberFull) => void;
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
          {cm.member?.name || '(알 수 없음)'}
          <AbilityGradeBadge
            memberId={cm.member?.id ?? ''}
            grade={cm.member?.abilityGrade}
            onChanged={onReload}
          />
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.member?.instrument || '-'}</td>
      <td className="px-4 py-3">
        <span className={`badge text-xs ${partColor}`}>{part}</span>
      </td>
      <td className="px-4 py-3 text-gray-600 text-sm">{cm.role || cm.member?.role || '-'}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{cm.member?.phone || '-'}</td>
      <td className="px-4 py-3 text-center text-gray-600 text-sm">
        {cm.attendanceRate != null ? `${cm.attendanceRate}%` : '-'}
      </td>
      <td className="px-4 py-3 text-right text-gray-700 text-sm">
        {cm.fee ? `${cm.fee.toLocaleString()}원` : '-'}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => toggleReserveStatus(cm.id, !cm.isReserve).then(onReload)}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
            cm.isReserve
              ? 'bg-orange-50 text-orange-600 border-orange-200'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {cm.isReserve ? '예비' : '정'}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            className="text-xs px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          >
            수정
          </button>
          <button onClick={() => onRemove(cm)} className="text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------- 메인 탭 ----------
export default function MembersTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [concertMembers, setConcertMembers] = useState<ConcertMemberFull[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ConcertMemberFull | null>(null);
  const [reserveFilter, setReserveFilter] = useState<'전체' | '정단원' | '예비단원'>('전체');
  const [editingId, setEditingId] = useState<string | null>(null); // 현재 편집 중인 concertMember.id

  const load = async () => {
    const [cms, all] = await Promise.all([getConcertMembers(concertId), getAllMembers()]);
    setConcertMembers(cms);
    setAllMembers(all);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    await removeMemberFromConcert(removeTarget.id);
    setRemoveTarget(null);
    load();
  };

  // 파트별 집계
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

      {/* 파트별 집계 + 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(groupByPart).map(([part, mbs]) => (
          <span key={part} className="badge bg-gray-100 text-gray-600">
            {part}: {mbs.filter((m) => !m.isReserve).length}명
          </span>
        ))}
        <div className="flex-1" />
        {/* 등급 범례 */}
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
                reserveFilter === f
                  ? 'bg-[#2563eb] text-white border-[#2563eb]'
                  : 'bg-white text-gray-600 border-gray-300'
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">출석률</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">사례비</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">예비</th>
                <th className="w-28 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cm) =>
                editingId === cm.id ? (
                  <EditableRow
                    key={cm.id}
                    cm={cm}
                    onSaved={() => {
                      setEditingId(null);
                      load();
                    }}
                    onCancel={() => setEditingId(null)}
                    onRemove={setRemoveTarget}
                    onReload={load}
                  />
                ) : (
                  <ReadonlyRow
                    key={cm.id}
                    cm={cm}
                    onEdit={() => setEditingId(cm.id)}
                    onRemove={setRemoveTarget}
                    onReload={load}
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddMemberFromDB
          concertId={concertId}
          existing={concertMembers.map((cm) => cm.memberId)}
          allMembers={allMembers}
          onClose={() => setShowAdd(false)}
          onSaved={() => { load(); setShowAdd(false); }}
        />
      )}

      {showNewMember && (
        <NewMemberForm
          concertId={concertId}
          onClose={() => setShowNewMember(false)}
          onSaved={() => { load(); setShowNewMember(false); }}
        />
      )}

      {removeTarget && (
        <Modal
          title="단원 제외"
          onClose={() => setRemoveTarget(null)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setRemoveTarget(null)}>취소</button>
              <button className="btn-danger" onClick={handleRemove}>제외</button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{removeTarget.member?.name}</span> 단원을 이 연주회에서 제외하시겠습니까?
          </p>
          <p className="text-xs text-gray-500 mt-2">전체 단원 DB에서는 삭제되지 않습니다.</p>
        </Modal>
      )}
    </div>
  );
}

function AddMemberFromDB({
  concertId, existing, allMembers, onClose, onSaved,
}: {
  concertId: string; existing: string[]; allMembers: Member[];
  onClose: () => void; onSaved: () => void;
}) {
  const available = allMembers.filter((m) => !existing.includes(m.id));
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

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
    <Modal
      title="단원 DB에서 추가"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleAdd} disabled={selected.length === 0}>
            {selected.length}명 추가
          </button>
        </>
      }
    >
      {available.length === 0 ? (
        <p className="text-sm text-gray-500">추가할 수 있는 단원이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {available.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3 flex-1">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} className="rounded" />
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
    <Modal title="새 단원 추가" onClose={onClose} size="md"
      footer={<><button className="btn-secondary" onClick={onClose}>취소</button><button className="btn-primary" onClick={handleSave}>저장</button></>}
    >
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
        <div><label className="label">악기</label><input className="input" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} /></div>
        <div><label className="label">파트</label><input className="input" value={form.part} onChange={(e) => setForm((f) => ({ ...f, part: e.target.value }))} placeholder="Violin 1" /></div>
        <div>
          <label className="label">역할</label>
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as MemberRole }))}>
            {(['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'] as MemberRole[]).map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
        <div><label className="label">사례비 (원)</label><input type="number" className="input" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: +e.target.value }))} /></div>
      </div>
    </Modal>
  );
}
