import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react';
import { db } from '../../../db/database';
import type { ProgramItem, Repertoire } from '../../../types';
import Modal from '../../common/Modal';
import StatusBadge from '../../common/StatusBadge';

interface Props { concertId: string; }

export default function ProgramTab({ concertId }: Props) {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ProgramItem | null>(null);

  const load = async () => {
    const data = await db.programItems.where('concertId').equals(concertId).sortBy('order');
    setItems(data);
  };

  useEffect(() => { load(); }, [concertId]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 곡을 연주회 목록에서 제거하시겠습니까?\n전체 곡목 DB에서는 삭제되지 않습니다.')) return;
    await db.programItems.delete(id);
    load();
  };

  const moveItem = async (idx: number, dir: 'up' | 'down') => {
    const newItems = [...items];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newItems.length) return;
    [newItems[idx], newItems[target]] = [newItems[target], newItems[idx]];
    const updated = newItems.map((item, i) => ({ ...item, order: i + 1 }));
    await Promise.all(updated.map(item => db.programItems.put(item)));
    setItems(updated);
  };

  const totalDuration = items.reduce((s, p) => s + (p.duration || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">곡목 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">총 {items.length}곡 · 예상 {totalDuration}분</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 곡 추가
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p>등록된 곡목이 없습니다. 곡을 추가해 주세요.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">작곡가</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">곡명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">악장</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">협연자</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">시간</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">악보</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">파트보</th>
                <th className="w-20 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 text-gray-500 font-medium">{item.order}</td>
                  <td className="px-4 py-3 text-gray-700">{item.composer}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.movement || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.soloist || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{item.duration ? `${item.duration}분` : '-'}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={item.scoreStatus} /></td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={item.partScoreStatus} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp size={14} /></button>
                      <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown size={14} /></button>
                      <button onClick={() => setEditItem(item)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editItem) && (
        <ProgramItemForm
          concertId={concertId}
          item={editItem}
          nextOrder={items.length + 1}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={() => { load(); setShowAdd(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ProgramItemForm({ concertId, item, nextOrder, onClose, onSaved }: {
  concertId: string; item: ProgramItem | null; nextOrder: number;
  onClose: () => void; onSaved: () => void;
}) {
  const [repertoire, setRepertoire] = useState<Repertoire[]>([]);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [form, setForm] = useState({
    composer: '', title: '', movement: '', duration: 0, soloist: '',
    scoreStatus: '준비중' as ProgramItem['scoreStatus'],
    partScoreStatus: '준비중' as ProgramItem['partScoreStatus'],
    note: '',
  });

  useEffect(() => {
    db.repertoire.toArray().then(setRepertoire);
    if (item) {
      setForm({
        composer: item.composer, title: item.title, movement: item.movement || '',
        duration: item.duration || 0, soloist: item.soloist || '',
        scoreStatus: item.scoreStatus, partScoreStatus: item.partScoreStatus, note: item.note || '',
      });
    }
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSelectRep = (repId: string) => {
    const rep = repertoire.find(r => r.id === repId);
    if (rep) setForm(f => ({ ...f, composer: rep.composer, title: rep.title, duration: rep.duration || 0 }));
  };

  const handleSave = async () => {
    if (!form.composer || !form.title) { alert('작곡가와 곡명을 입력해 주세요.'); return; }
    const data: ProgramItem = {
      id: item?.id || crypto.randomUUID(),
      concertId,
      repertoireId: item?.repertoireId,
      order: item?.order || nextOrder,
      ...form,
    };
    if (item) await db.programItems.put(data);
    else await db.programItems.add(data);
    onSaved();
  };

  return (
    <Modal title={item ? '곡목 편집' : '곡 추가'} onClose={onClose} size="lg">
      {!item && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('new')} className={`btn ${mode === 'new' ? 'btn-primary' : 'btn-secondary'} text-xs`}>직접 입력</button>
          <button onClick={() => setMode('existing')} className={`btn ${mode === 'existing' ? 'btn-primary' : 'btn-secondary'} text-xs`}>곡목 DB에서 선택</button>
        </div>
      )}
      {mode === 'existing' && !item && (
        <div className="mb-4">
          <label className="label">곡목 선택</label>
          <select className="input" onChange={e => handleSelectRep(e.target.value)}>
            <option value="">선택하세요</option>
            {repertoire.map(r => <option key={r.id} value={r.id}>{r.composer} - {r.title}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">작곡가 *</label>
          <input className="input" value={form.composer} onChange={e => set('composer', e.target.value)} />
        </div>
        <div>
          <label className="label">곡명 *</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className="label">악장/부제</label>
          <input className="input" value={form.movement} onChange={e => set('movement', e.target.value)} />
        </div>
        <div>
          <label className="label">협연자</label>
          <input className="input" value={form.soloist} onChange={e => set('soloist', e.target.value)} />
        </div>
        <div>
          <label className="label">예상 시간 (분)</label>
          <input type="number" className="input" value={form.duration} onChange={e => set('duration', +e.target.value)} />
        </div>
        <div></div>
        <div>
          <label className="label">악보 준비 상태</label>
          <select className="input" value={form.scoreStatus} onChange={e => set('scoreStatus', e.target.value)}>
            {['준비완료', '준비중', '미준비'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">파트보 준비 상태</label>
          <select className="input" value={form.partScoreStatus} onChange={e => set('partScoreStatus', e.target.value)}>
            {['준비완료', '준비중', '미준비'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">비고</label>
          <input className="input" value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
