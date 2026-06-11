import { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, Star, Check, X, Pencil, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { db } from '../../../db/database';
import type { ConcertMember, Member } from '../../../types';
import Modal from '../../common/Modal';
import { formatNumberInput, parseFormattedNumber } from '../../../utils/calculations';

interface Props { concertId: string; }
type CMFull = ConcertMember & { member?: Member };

const partColors: Record<string, string> = {
  'Violin 1': 'bg-blue-50 text-blue-700',
  'Violin 2': 'bg-indigo-50 text-indigo-700',
  'Viola': 'bg-purple-50 text-purple-700',
  'Cello': 'bg-pink-50 text-pink-700',
  'Bass': 'bg-rose-50 text-rose-700',
  '기타': 'bg-gray-50 text-gray-700',
};

const gradeConfig = {
  A: { label: 'A', bg: 'bg-indigo-600 text-white', hover: 'hover:bg-indigo-700' },
  B: { label: 'B', bg: 'bg-emerald-500 text-white', hover: 'hover:bg-emerald-600' },
  C: { label: 'C', bg: 'bg-gray-400 text-white', hover: 'hover:bg-gray-500' },
};

export default function MembersTab({ concertId }: Props) {
  const [concertMembers, setConcertMembers] = useState<CMFull[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ConcertMember & Pick<Member, 'phone'>>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const cms = await db.concertMembers.where('concertId').equals(concertId).toArray();
    const members = await db.members.toArray();
    setAllMembers(members);
    const sorted = cms
      .map((cm, idx) => ({ ...cm, order: cm.order ?? idx + 1 }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setConcertMembers(sorted.map(cm => ({ ...cm, member: members.find(m => m.id === cm.memberId) })));
  };

  useEffect(() => { load(); }, [concertId]);

  /* ── DnD ── */
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = concertMembers.findIndex(i => i.id === active.id);
    const newIdx = concertMembers.findIndex(i => i.id === over.id);
    const reordered = arrayMove(concertMembers, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx + 1 }));
    setConcertMembers(reordered);
    await Promise.all(reordered.map(cm => {
      const { member: _m, ...cmData } = cm;
      return db.concertMembers.put(cmData);
    }));
    toast.success('단원 순서가 변경되었습니다.');
  };

  /* ── Actions ── */
  const handleRemove = async (id: string) => {
    if (!confirm('이 단원을 연주회에서 제외하시겠습니까?\n전체 단원 DB에서는 삭제되지 않습니다.')) return;
    await db.concertMembers.delete(id);
    load();
  };

  const toggleReserve = async (cm: CMFull) => {
    const { member: _m, ...cmData } = cm;
    await db.concertMembers.put({ ...cmData, isReserve: !cm.isReserve });
    load();
  };

  const handleGradeChange = async (cm: CMFull, grade: 'A' | 'B' | 'C' | undefined) => {
    const { member: _m, ...cmData } = cm;
    await db.concertMembers.put({ ...cmData, concertGrade: grade });
    setConcertMembers(prev => prev.map(c => c.id === cm.id ? { ...c, concertGrade: grade } : c));
    toast.success(`${cm.member?.name} 단원을 ${grade ?? '미지정'} 등급으로 변경했습니다.`);
  };

  const startEdit = (cm: CMFull) => {
    setEditingId(cm.id);
    setEditForm({ part: cm.part || cm.member?.part || '', role: cm.role || cm.member?.role || '', fee: cm.fee, phone: cm.member?.phone || '' });
  };

  const saveEdit = async (cm: CMFull) => {
    const { member: _m, ...cmData } = cm;
    await db.concertMembers.put({ ...cmData, part: editForm.part as string, role: editForm.role as string, fee: editForm.fee });
    if (cm.member && editForm.phone !== undefined) {
      await db.members.put({ ...cm.member, phone: editForm.phone as string });
    }
    setEditingId(null);
    load();
    toast.success('단원 정보가 저장되었습니다.');
  };

  const groupByPart: Record<string, CMFull[]> = {};
  concertMembers.forEach(cm => {
    const part = cm.part || cm.member?.part || '기타';
    if (!groupByPart[part]) groupByPart[part] = [];
    groupByPart[part].push(cm);
  });

  const regularCount = concertMembers.filter(m => !m.isReserve).length;
  const reserveCount = concertMembers.filter(m => m.isReserve).length;
  const activeCm = concertMembers.find(i => i.id === activeId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">단원 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">정단원 {regularCount}명 · 예비단원 {reserveCount}명 · 핸들(⠿)을 드래그해 순서 변경</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowNewMember(true)}><Plus size={14} /> 새 단원</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><UserPlus size={14} /> DB에서 추가</button>
        </div>
      </div>

      {/* 파트별 집계 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupByPart).map(([part, mbs]) => (
          <span key={part} className={`badge ${partColors[part] || 'bg-gray-50 text-gray-700'}`}>
            {part}: {mbs.filter(m => !m.isReserve).length}명
          </span>
        ))}
      </div>

      {concertMembers.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">등록된 단원이 없습니다. 단원을 추가해 주세요.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">등급</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">파트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">연락처</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">출석률</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">사례비</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">예비</th>
                <th className="w-20 px-3 py-3 text-center text-xs font-medium text-gray-500">수정</th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={concertMembers.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-gray-100">
                  {concertMembers.map(cm => (
                    <SortableMemberRow
                      key={cm.id}
                      cm={cm}
                      isDragging={activeId === cm.id}
                      editingId={editingId}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      onEdit={startEdit}
                      onSave={saveEdit}
                      onCancel={() => setEditingId(null)}
                      onRemove={handleRemove}
                      onToggleReserve={toggleReserve}
                      onGradeChange={handleGradeChange}
                    />
                  ))}
                </tbody>
              </SortableContext>
              <DragOverlay>
                {activeCm && (
                  <table className="w-full text-sm bg-white shadow-2xl rounded-xl opacity-95">
                    <tbody>
                      <tr className="bg-indigo-50">
                        <td className="w-8 px-2 py-3 text-indigo-400"><GripVertical size={16} /></td>
                        <td className="px-4 py-3 font-medium text-gray-900">{activeCm.member?.name}</td>
                        <td className="px-4 py-3 text-gray-500">{activeCm.part || activeCm.member?.part || '-'}</td>
                        <td colSpan={7}></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </DragOverlay>
            </DndContext>
          </table>
        </div>
      )}

      {showAdd && (
        <AddMemberFromDB concertId={concertId} existing={concertMembers.map(cm => cm.memberId)} allMembers={allMembers} onClose={() => setShowAdd(false)} onSaved={() => { load(); setShowAdd(false); }} />
      )}
      {showNewMember && (
        <NewMemberForm concertId={concertId} onClose={() => setShowNewMember(false)} onSaved={() => { load(); setShowNewMember(false); }} />
      )}
    </div>
  );
}

/* ── Sortable Row ── */
function SortableMemberRow({ cm, isDragging, editingId, editForm, setEditForm, onEdit, onSave, onCancel, onRemove, onToggleReserve, onGradeChange }: {
  cm: CMFull; isDragging: boolean; editingId: string | null;
  editForm: Partial<ConcertMember & Pick<Member, 'phone'>>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<ConcertMember & Pick<Member, 'phone'>>>>;
  onEdit: (cm: CMFull) => void; onSave: (cm: CMFull) => void; onCancel: () => void;
  onRemove: (id: string) => void; onToggleReserve: (cm: CMFull) => void;
  onGradeChange: (cm: CMFull, g: 'A' | 'B' | 'C' | undefined) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cm.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const isEditing = editingId === cm.id;
  const [formattedFee, setFormattedFee] = useState(() => editForm.fee ? editForm.fee.toLocaleString() : '');

  return (
    <tr ref={setNodeRef} style={style} className={`${cm.isReserve ? 'opacity-60' : ''} ${isEditing ? 'bg-indigo-50/40' : 'hover:bg-gray-50'} ${isDragging ? 'bg-indigo-50' : ''}`}>
      {/* 드래그 핸들 */}
      <td className="px-2 py-3">
        <div
          {...attributes} {...listeners}
          className={`text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex justify-center ${isEditing ? 'pointer-events-none opacity-30' : ''}`}
          title="드래그해서 순서 변경"
        >
          <GripVertical size={16} />
        </div>
      </td>

      {/* 이름 */}
      <td className="px-4 py-3 font-medium text-gray-900">
        <div className="flex items-center gap-1">
          {cm.member?.name || '(알 수 없음)'}
          {cm.member?.role === '악장' && <Star size={11} className="text-yellow-500" fill="currentColor" />}
        </div>
      </td>

      {/* 등급 */}
      <td className="px-4 py-3">
        <GradeSelector grade={cm.concertGrade} onChange={g => onGradeChange(cm, g)} />
      </td>

      {/* 파트 */}
      <td className="px-4 py-3">
        {isEditing ? (
          <input className="input text-xs py-1 w-28" value={editForm.part as string} onChange={e => setEditForm(f => ({ ...f, part: e.target.value }))} placeholder="Violin 1" />
        ) : (
          <span className={`badge text-xs ${partColors[cm.part || cm.member?.part || '기타'] || 'bg-gray-50 text-gray-600'}`}>
            {cm.part || cm.member?.part || '-'}
          </span>
        )}
      </td>

      {/* 역할 */}
      <td className="px-4 py-3 text-gray-600">
        {isEditing ? (
          <select className="input text-xs py-1 w-28" value={editForm.role as string} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
            {['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'].map(r => <option key={r}>{r}</option>)}
          </select>
        ) : (cm.role || cm.member?.role || '-')}
      </td>

      {/* 연락처 */}
      <td className="px-4 py-3 text-gray-500 text-xs">
        {isEditing ? (
          <input className="input text-xs py-1 w-32" value={editForm.phone as string} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
        ) : (cm.member?.phone || '-')}
      </td>

      <td className="px-4 py-3 text-center text-gray-600">{cm.attendanceRate != null ? `${cm.attendanceRate}%` : '-'}</td>

      {/* 사례비 */}
      <td className="px-4 py-3 text-right text-gray-700">
        {isEditing ? (
          <input type="text" className="input text-xs py-1 w-24 text-right" value={formattedFee} onChange={e => { const formatted = formatNumberInput(e.target.value); setFormattedFee(formatted); setEditForm(f => ({ ...f, fee: parseFormattedNumber(formatted) })); }} />
        ) : (cm.fee ? `${cm.fee.toLocaleString()}원` : '-')}
      </td>

      {/* 예비 토글 */}
      <td className="px-4 py-3 text-center">
        <button onClick={() => onToggleReserve(cm)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${cm.isReserve ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
          {cm.isReserve ? '예비' : '정'}
        </button>
      </td>

      {/* 수정/저장 */}
      <td className="px-3 py-3 text-center">
        {isEditing ? (
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => onSave(cm)} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" title="저장"><Check size={13} /></button>
            <button onClick={onCancel} className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300" title="취소"><X size={13} /></button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => onEdit(cm)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" title="수정"><Pencil size={13} /></button>
            <button onClick={() => onRemove(cm.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="제외"><Trash2 size={13} /></button>
          </div>
        )}
      </td>
    </tr>
  );
}

/* ── Grade Selector ── */
function GradeSelector({ grade, onChange }: { grade?: 'A' | 'B' | 'C'; onChange: (g: 'A' | 'B' | 'C' | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = grade ? gradeConfig[grade] : null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className={`inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-bold transition-colors border ${cfg ? `${cfg.bg} border-transparent` : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'}`} title="등급 변경">
        {grade ?? '—'}
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 flex gap-1">
          {(['A', 'B', 'C'] as const).map(g => (
            <button key={g} onClick={() => { onChange(g); setOpen(false); }} className={`w-8 h-7 rounded-lg text-xs font-bold transition-colors ${gradeConfig[g].bg} ${gradeConfig[g].hover}`}>{g}</button>
          ))}
          {grade && (
            <button onClick={() => { onChange(undefined); setOpen(false); }} className="w-8 h-7 rounded-lg text-xs text-gray-400 hover:bg-gray-100" title="등급 해제">✕</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modal: DB에서 추가 ── */
function AddMemberFromDB({ concertId, existing, allMembers, onClose, onSaved }: {
  concertId: string; existing: string[]; allMembers: Member[]; onClose: () => void; onSaved: () => void;
}) {
  const available = allMembers.filter(m => !existing.includes(m.id));
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const handleAdd = async () => {
    const currentCount = existing.length;
    await Promise.all(selected.map((memberId, i) => {
      const m = allMembers.find(m => m.id === memberId)!;
      return db.concertMembers.add({ id: crypto.randomUUID(), concertId, memberId, role: m.role, part: m.part, fee: m.baseFee, isReserve: false, order: currentCount + i + 1 });
    }));
    toast.success(`단원 ${selected.length}명이 추가되었습니다.`);
    onSaved();
  };
  return (
    <Modal title="단원 DB에서 추가" onClose={onClose} size="md">
      {available.length === 0 ? <p className="text-sm text-gray-500">추가할 수 있는 단원이 없습니다.</p> : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {available.map(m => (
            <label key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} className="rounded" />
              <div><p className="text-sm font-medium text-gray-900">{m.name}</p><p className="text-xs text-gray-500">{m.instrument} · {m.part} · {m.role}</p></div>
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleAdd} disabled={selected.length === 0}>{selected.length}명 추가</button>
      </div>
    </Modal>
  );
}

/* ── Modal: 새 단원 ── */
function NewMemberForm({ concertId, onClose, onSaved }: { concertId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', instrument: '', part: '', role: '일반단원' as Member['role'], phone: '', fee: 0 });
  const [formattedFee, setFormattedFee] = useState('');
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    if (!form.name) { toast.error('이름을 입력해 주세요.'); return; }
    const memberId = crypto.randomUUID();
    await db.members.add({ id: memberId, ...form, grade: '정단원', status: '활동중', createdAt: new Date().toISOString() });
    const count = await db.concertMembers.where('concertId').equals(concertId).count();
    await db.concertMembers.add({ id: crypto.randomUUID(), concertId, memberId, role: form.role, part: form.part, fee: form.fee, isReserve: false, order: count + 1 });
    toast.success(`${form.name} 단원이 추가되었습니다.`);
    onSaved();
  };
  return (
    <Modal title="새 단원 추가" onClose={onClose} size="md">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="label">악기</label><input className="input" value={form.instrument} onChange={e => set('instrument', e.target.value)} /></div>
        <div><label className="label">파트</label><input className="input" value={form.part} onChange={e => set('part', e.target.value)} placeholder="Violin 1" /></div>
        <div><label className="label">역할</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="label">사례비 (원)</label><input type="text" className="input" value={formattedFee} onChange={e => { const formatted = formatNumberInput(e.target.value); setFormattedFee(formatted); set('fee', parseFormattedNumber(formatted)); }} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
