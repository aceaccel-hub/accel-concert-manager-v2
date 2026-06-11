import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Edit2, Star } from 'lucide-react';
import { db } from '../../db/database';
import type { Member } from '../../types';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';
import { formatNumberInput, parseFormattedNumber } from '../../utils/calculations';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Member | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const load = async () => {
    const data = await db.members.orderBy('name').toArray();
    setMembers(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = members.filter(m =>
    !search || m.name.includes(search) || m.instrument.includes(search)
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.members.delete(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(null);
    load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">전체 단원 DB</h2>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus size={14} /> 추가
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="input pl-8 text-xs py-1.5" placeholder="이름, 악기 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(m => (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selected?.id === m.id ? 'bg-indigo-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    {m.name}
                    {m.role === '악장' && <Star size={12} className="text-yellow-500" fill="currentColor" />}
                  </p>
                  <p className="text-xs text-gray-500">{m.instrument} · {m.part}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-xl space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-xl font-bold text-gray-900">{selected.name}</h1>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => { setEditItem(selected); setShowForm(true); }}>
                  <Edit2 size={12} /> 편집
                </button>
                <button className="btn-danger text-xs" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 size={12} /> 삭제
                </button>
              </div>
            </div>

            <div className="card p-5 grid grid-cols-2 gap-4">
              {[
                ['악기', selected.instrument], ['파트', selected.part || '-'],
                ['역할', selected.role], ['등급', selected.grade || '-'],
                ['연락처', selected.phone || '-'], ['이메일', selected.email || '-'],
                ['상태', selected.status], ['기본 사례비', selected.baseFee ? `${selected.baseFee.toLocaleString()}원` : '-'],
                ['가입일', selected.joinDate || '-'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            단원을 선택하세요
          </div>
        )}
      </div>

      {(showForm || editItem) && (
        <MemberForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { load(); setShowForm(false); setEditItem(null); }}
        />
      )}

      {deleteTarget && (
        <Modal title="단원 삭제" onClose={() => setDeleteTarget(null)} size="sm">
          <p className="text-sm text-gray-600 mb-2">다음 단원을 전체 DB에서 삭제하시겠습니까?</p>
          <p className="font-semibold text-gray-900 mb-4">{deleteTarget.name}</p>
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">이 단원의 연주회 참여 이력도 함께 삭제됩니다.</p>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>취소</button>
            <button className="btn-danger" onClick={handleDelete}>삭제</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MemberForm({ item, onClose, onSaved }: { item: Member | null; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({
    name: '', instrument: '', part: '', role: '일반단원' as Member['role'],
    phone: '', email: '', baseFee: 0, grade: '정단원' as Member['grade'], status: '활동중' as Member['status'],
    joinDate: '', note: '',
  });
  const [formattedBaseFee, setFormattedBaseFee] = useState('');

  useEffect(() => {
    if (item) {
      setForm({ name: item.name, instrument: item.instrument, part: item.part || '', role: item.role, phone: item.phone || '', email: item.email || '', baseFee: item.baseFee || 0, grade: item.grade || '정단원', status: item.status, joinDate: item.joinDate || '', note: item.note || '' });
      setFormattedBaseFee(item.baseFee ? item.baseFee.toLocaleString() : '');
    }
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { alert('이름을 입력해 주세요.'); return; }
    const data: Member = { id: item?.id || crypto.randomUUID(), ...form, createdAt: item?.createdAt || new Date().toISOString() };
    if (item) await db.members.put(data);
    else await db.members.add(data);
    onSaved();
  };

  return (
    <Modal title={item ? '단원 편집' : '단원 추가'} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="label">악기</label><input className="input" value={form.instrument} onChange={e => set('instrument', e.target.value)} /></div>
        <div><label className="label">파트</label><input className="input" value={form.part} onChange={e => set('part', e.target.value)} placeholder="Violin 1" /></div>
        <div>
          <label className="label">역할</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="label">이메일</label><input className="input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div><label className="label">기본 사례비</label><input type="text" className="input" value={formattedBaseFee} onChange={e => { const formatted = formatNumberInput(e.target.value); setFormattedBaseFee(formatted); set('baseFee', parseFormattedNumber(formatted)); }} /></div>
        <div>
          <label className="label">등급</label>
          <select className="input" value={form.grade} onChange={e => set('grade', e.target.value)}>
            {['정단원', '준단원', '객원'].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label">상태</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {['활동중', '휴식중', '탈퇴'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="label">가입일</label><input type="date" className="input" value={form.joinDate} onChange={e => set('joinDate', e.target.value)} /></div>
        <div className="col-span-2"><label className="label">비고</label><textarea className="input h-16 resize-none" value={form.note} onChange={e => set('note', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
