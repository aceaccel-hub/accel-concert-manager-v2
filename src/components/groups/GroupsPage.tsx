import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
import type { Group } from '../../types';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Group | null>(null);

  const load = async () => { const data = await db.groups.orderBy('name').toArray(); setGroups(data); };
  useEffect(() => { load(); }, []);

  const filtered = groups.filter(g => !search || g.name.includes(search));

  const handleDelete = async (g: Group) => {
    if (!confirm(`"${g.name}"을 삭제하시겠습니까?`)) return;
    await db.groups.delete(g.id);
    setSelected(null); load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">전체 단체 DB</h2>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus size={14} /> 추가
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="input pl-8 text-xs py-1.5" placeholder="단체명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(g => (
            <div key={g.id} onClick={() => setSelected(g)} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selected?.id === g.id ? 'bg-indigo-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-500">{g.type}</p>
                </div>
                <StatusBadge status={g.status} />
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
                <button className="btn-secondary text-xs" onClick={() => { setEditItem(selected); setShowForm(true); }}><Edit2 size={12} /> 편집</button>
                <button className="btn-danger text-xs" onClick={() => handleDelete(selected)}><Trash2 size={12} /> 삭제</button>
              </div>
            </div>
            <div className="card p-5 grid grid-cols-2 gap-4">
              {[['유형', selected.type], ['대표자', selected.representative || '-'], ['담당자', selected.manager || '-'], ['연락처', selected.phone || '-'], ['이메일', selected.email || '-'], ['홈페이지', selected.homepage || '-'], ['상태', selected.status]].map(([l, v]) => (
                <div key={l}><p className="text-xs text-gray-500">{l}</p><p className="text-sm font-medium text-gray-900 mt-0.5">{v}</p></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">단체를 선택하세요</div>
        )}
      </div>

      {(showForm || editItem) && (
        <GroupForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSaved={() => { load(); setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function GroupForm({ item, onClose, onSaved }: { item: Group | null; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({ name: '', type: '', representative: '', manager: '', phone: '', email: '', homepage: '', status: '운영중' as Group['status'], note: '' });
  useEffect(() => { if (item) setForm({ name: item.name, type: item.type, representative: item.representative || '', manager: item.manager || '', phone: item.phone || '', email: item.email || '', homepage: item.homepage || '', status: item.status, note: item.note || '' }); }, []);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { alert('단체명을 입력해 주세요.'); return; }
    if (item && !confirm('이 단체 정보는 다른 연주회에서도 사용 중일 수 있습니다. 수정하시겠습니까?')) return;
    const data: Group = { id: item?.id || crypto.randomUUID(), ...form, createdAt: item?.createdAt || new Date().toISOString() };
    if (item) await db.groups.put(data);
    else await db.groups.add(data);
    onSaved();
  };

  return (
    <Modal title={item ? '단체 편집' : '단체 추가'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">단체명 *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="label">유형</label><input className="input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="오케스트라, 합창단" /></div>
        <div><label className="label">대표자</label><input className="input" value={form.representative} onChange={e => set('representative', e.target.value)} /></div>
        <div><label className="label">담당자</label><input className="input" value={form.manager} onChange={e => set('manager', e.target.value)} /></div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="label">이메일</label><input className="input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div className="col-span-2"><label className="label">홈페이지</label><input className="input" value={form.homepage} onChange={e => set('homepage', e.target.value)} /></div>
        <div>
          <label className="label">상태</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {['운영중', '휴식중', '해산'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="label">비고</label><textarea className="input h-16 resize-none" value={form.note} onChange={e => set('note', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
