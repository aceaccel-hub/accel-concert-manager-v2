import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Edit2, Music } from 'lucide-react';
import { db } from '../../db/database';
import type { Repertoire } from '../../types';
import Modal from '../common/Modal';
import { formatNumberInput, parseFormattedNumber } from '../../utils/calculations';

export default function RepertoirePage() {
  const [items, setItems] = useState<Repertoire[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Repertoire | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Repertoire | null>(null);

  const load = async () => {
    const data = await db.repertoire.orderBy('composer').toArray();
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(m =>
    !search || m.composer.includes(search) || m.title.includes(search)
  );

  const handleDelete = async (item: Repertoire) => {
    if (!confirm(`"${item.composer} - ${item.title}"을 전체 곡목 DB에서 삭제하시겠습니까?`)) return;
    await db.repertoire.delete(item.id);
    setSelected(null);
    load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">전체 곡목 DB</h2>
            <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setEditItem(null); setShowForm(true); }}>
              <Plus size={14} /> 추가
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="input pl-8 text-xs py-1.5" placeholder="작곡가, 곡명 검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selected?.id === r.id ? 'bg-indigo-50' : ''}`}
            >
              <p className="text-xs text-gray-500">{r.composer}</p>
              <p className="text-sm font-medium text-gray-900">{r.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{r.instrumentation} {r.duration ? `· ${r.duration}분` : ''}</p>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-6 text-center text-sm text-gray-400">등록된 곡이 없습니다.</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">{selected.composer}</p>
                <h1 className="text-xl font-bold text-gray-900">{selected.title}</h1>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => { setEditItem(selected); setShowForm(true); }}>
                  <Edit2 size={12} /> 편집
                </button>
                <button className="btn-danger text-xs" onClick={() => handleDelete(selected)}>
                  <Trash2 size={12} /> 삭제
                </button>
              </div>
            </div>
            <div className="card p-5 grid grid-cols-2 gap-4">
              {[
                ['편성', selected.instrumentation || '-'],
                ['예상 시간', selected.duration ? `${selected.duration}분` : '-'],
                ['난이도', selected.difficulty || '-'],
                ['편곡', selected.arrangement || '-'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {selected.note && <div className="card p-4"><p className="text-xs text-gray-500 mb-1">비고</p><p className="text-sm text-gray-800">{selected.note}</p></div>}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Music size={48} className="mb-3 opacity-20" />
            <p>곡목을 선택하세요</p>
          </div>
        )}
      </div>

      {(showForm || editItem) && (
        <RepertoireForm item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSaved={() => { load(); setShowForm(false); setEditItem(null); }} />
      )}
    </div>
  );
}

function RepertoireForm({ item, onClose, onSaved }: { item: Repertoire | null; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({ composer: '', title: '', arrangement: '', instrumentation: '', duration: 0, difficulty: '중급' as Repertoire['difficulty'], note: '' });
  const [formattedDuration, setFormattedDuration] = useState('');

  useEffect(() => {
    if (item) {
      setForm({ composer: item.composer, title: item.title, arrangement: item.arrangement || '', instrumentation: item.instrumentation || '', duration: item.duration || 0, difficulty: item.difficulty || '중급', note: item.note || '' });
      setFormattedDuration(item.duration ? item.duration.toString() : '');
    }
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.composer || !form.title) { alert('작곡가와 곡명을 입력해 주세요.'); return; }
    const data: Repertoire = { id: item?.id || crypto.randomUUID(), ...form, createdAt: item?.createdAt || new Date().toISOString() };
    if (item) await db.repertoire.put(data);
    else await db.repertoire.add(data);
    onSaved();
  };

  return (
    <Modal title={item ? '곡목 편집' : '곡목 추가'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">작곡가 *</label><input className="input" value={form.composer} onChange={e => set('composer', e.target.value)} /></div>
        <div><label className="label">곡명 *</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} /></div>
        <div><label className="label">편곡</label><input className="input" value={form.arrangement} onChange={e => set('arrangement', e.target.value)} /></div>
        <div><label className="label">편성</label><input className="input" value={form.instrumentation} onChange={e => set('instrumentation', e.target.value)} /></div>
        <div><label className="label">예상 시간 (분)</label><input type="text" className="input" value={formattedDuration} onChange={e => { const formatted = formatNumberInput(e.target.value); setFormattedDuration(formatted); set('duration', parseFormattedNumber(formatted)); }} /></div>
        <div>
          <label className="label">난이도</label>
          <select className="input" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
            {['초급', '중급', '고급'].map(d => <option key={d}>{d}</option>)}
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
