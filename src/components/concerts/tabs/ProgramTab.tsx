import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { db } from '../../../db/database';
import type { ProgramItem, Repertoire } from '../../../types';
import Modal from '../../common/Modal';
import StatusBadge from '../../common/StatusBadge';

interface Props { concertId: string; }

export default function ProgramTab({ concertId }: Props) {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ProgramItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = async () => {
    const data = await db.programItems.where('concertId').equals(concertId).sortBy('order');
    setItems(data);
  };

  useEffect(() => { load(); }, [concertId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx + 1 }));

    setItems(reordered);
    await Promise.all(reordered.map(item => db.programItems.put(item)));
    toast.success('곡 순서가 성공적으로 변경되었습니다.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 곡을 연주회 목록에서 제거하시겠습니까?\n전체 곡목 DB에서는 삭제되지 않습니다.')) return;
    await db.programItems.delete(id);
    load();
  };

  const activeItem = items.find(i => i.id === activeId);
  const totalDuration = items.reduce((s, p) => s + (p.duration || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">곡목 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">총 {items.length}곡 · 예상 {totalDuration}분 · 핸들(⠿)을 드래그해 순서 변경</p>
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
                <th className="w-8 px-2 py-3"></th>
                <th className="w-10 px-3 py-3 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">작곡가</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">곡명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">악장</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">협연자</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">시간</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">악보</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">파트보</th>
                <th className="w-16 px-3 py-3"></th>
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      isDragging={activeId === item.id}
                      onEdit={() => setEditItem(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
              <DragOverlay>
                {activeItem && (
                  <table className="w-full text-sm bg-white shadow-2xl rounded-xl opacity-95">
                    <tbody>
                      <tr className="bg-indigo-50">
                        <td className="w-8 px-2 py-3 text-indigo-400 cursor-grabbing"><GripVertical size={16} /></td>
                        <td className="px-3 py-3 text-indigo-600 font-bold">{activeItem.order}</td>
                        <td className="px-4 py-3 text-gray-700">{activeItem.composer}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{activeItem.title}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{activeItem.movement || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{activeItem.soloist || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{activeItem.duration ? `${activeItem.duration}분` : '-'}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </DragOverlay>
            </DndContext>
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

function SortableRow({ item, isDragging, onEdit, onDelete }: {
  item: ProgramItem;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 ${isDragging ? 'bg-indigo-50' : ''}`}>
      <td className="px-2 py-3">
        <div
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex justify-center"
          title="드래그해서 순서 변경"
        >
          <GripVertical size={16} />
        </div>
      </td>
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
          <button onClick={onEdit} className="text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
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

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSelectRep = (repId: string) => {
    const rep = repertoire.find(r => r.id === repId);
    if (rep) setForm(f => ({ ...f, composer: rep.composer, title: rep.title, duration: rep.duration || 0 }));
  };

  const handleSave = async () => {
    if (!form.composer || !form.title) { toast.error('작곡가와 곡명을 입력해 주세요.'); return; }
    const data: ProgramItem = {
      id: item?.id || crypto.randomUUID(),
      concertId, repertoireId: item?.repertoireId,
      order: item?.order || nextOrder, ...form,
    };
    if (item) await db.programItems.put(data);
    else await db.programItems.add(data);
    onSaved();
  };

  return (
    <Modal title={item ? '곡목 편집' : '곡 추가'} onClose={onClose} size="lg">
      {!item && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('new')} className={`${mode === 'new' ? 'btn-primary' : 'btn-secondary'} text-xs py-1.5 px-3`}>직접 입력</button>
          <button onClick={() => setMode('existing')} className={`${mode === 'existing' ? 'btn-primary' : 'btn-secondary'} text-xs py-1.5 px-3`}>곡목 DB에서 선택</button>
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
        <div><label className="label">작곡가 *</label><input className="input" value={form.composer} onChange={e => set('composer', e.target.value)} /></div>
        <div><label className="label">곡명 *</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} /></div>
        <div><label className="label">악장/부제</label><input className="input" value={form.movement} onChange={e => set('movement', e.target.value)} /></div>
        <div><label className="label">협연자</label><input className="input" value={form.soloist} onChange={e => set('soloist', e.target.value)} /></div>
        <div><label className="label">예상 시간 (분)</label><input type="number" className="input" value={form.duration} onChange={e => set('duration', +e.target.value)} /></div>
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
        <div className="col-span-2"><label className="label">비고</label><input className="input" value={form.note} onChange={e => set('note', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
