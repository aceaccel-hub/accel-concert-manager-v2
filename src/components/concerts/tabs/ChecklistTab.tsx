import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle, Circle, GripVertical } from 'lucide-react';
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
import type { Checklist } from '../../../types';

interface Props { concertId: string; onRateChange?: (rate: number) => void; }

const DEFAULT_ITEMS = [
  '장소 예약 완료', '곡목 확정', '악보 준비 완료', '단원 섭외 완료',
  '연습 일정 확정', '포스터 제작 완료', '프로그램북 제작 완료',
  '예산 확인 완료', '홍보 시작', '리허설 완료'
];

export default function ChecklistTab({ concertId, onRateChange }: Props) {
  const [items, setItems] = useState<Checklist[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const data = await db.checklists.where('concertId').equals(concertId).sortBy('order');
    setItems(data);
    const rate = data.length > 0 ? Math.round(data.filter(i => i.isDone).length / data.length * 100) : 0;
    onRateChange?.(rate);
  };

  useEffect(() => { load(); }, [concertId]);

  /* ── DnD ── */
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
    await Promise.all(reordered.map(item => db.checklists.put(item)));
    toast.success('순서가 변경되었습니다.');
  };

  /* ── Actions ── */
  const toggle = async (item: Checklist) => {
    await db.checklists.put({ ...item, isDone: !item.isDone });
    load();
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;
    await db.checklists.add({
      id: crypto.randomUUID(), concertId, title: newTitle.trim(), isDone: false,
      order: items.length + 1,
    });
    setNewTitle('');
    load();
  };

  const deleteItem = async (id: string) => {
    await db.checklists.delete(id);
    load();
  };

  const initDefault = async () => {
    const existing = items.map(i => i.title);
    const toAdd = DEFAULT_ITEMS.filter(t => !existing.includes(t));
    await Promise.all(toAdd.map((title, i) => db.checklists.add({
      id: crypto.randomUUID(), concertId, title, isDone: false, order: items.length + i + 1,
    })));
    load();
  };

  const doneCount = items.filter(i => i.isDone).length;
  const rate = items.length > 0 ? Math.round(doneCount / items.length * 100) : 0;
  const activeItem = items.find(i => i.id === activeId);

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">체크리스트</h2>
          <p className="text-xs text-gray-500 mt-0.5">{doneCount}/{items.length} 완료 · {rate}% · 핸들(⠿)을 드래그해 순서 변경</p>
        </div>
        {items.length === 0 && (
          <button className="btn-secondary text-xs" onClick={initDefault}>기본 항목 불러오기</button>
        )}
      </div>

      {/* 진행률 바 */}
      <div className="card p-4">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>완료 {doneCount}개</span>
          <span>전체 {items.length}개</span>
        </div>
      </div>

      {/* 체크리스트 DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(item => (
              <SortableCheckItem
                key={item.id}
                item={item}
                isDragging={activeId === item.id}
                onToggle={toggle}
                onDelete={deleteItem}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeItem && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border shadow-2xl bg-white opacity-95 ${activeItem.isDone ? 'border-green-100' : 'border-indigo-200'}`}>
              <GripVertical size={16} className="text-indigo-400 shrink-0" />
              {activeItem.isDone
                ? <CheckCircle size={20} className="text-green-500 shrink-0" fill="currentColor" />
                : <Circle size={20} className="text-gray-300 shrink-0" />
              }
              <span className={`flex-1 text-sm ${activeItem.isDone ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                {activeItem.title}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 새 항목 추가 */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="새 항목 추가..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button className="btn-primary" onClick={addItem}><Plus size={16} /></button>
      </div>
    </div>
  );
}

/* ── Sortable Check Item ── */
function SortableCheckItem({ item, isDragging, onToggle, onDelete }: {
  item: Checklist; isDragging: boolean;
  onToggle: (item: Checklist) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${item.isDone ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200 hover:border-gray-300'} ${isDragging ? 'bg-indigo-50 border-indigo-200' : ''}`}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes} {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
        title="드래그해서 순서 변경"
      >
        <GripVertical size={16} />
      </div>

      {/* 체크 토글 */}
      <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={() => onToggle(item)}>
        {item.isDone
          ? <CheckCircle size={20} className="text-green-500 shrink-0" fill="currentColor" />
          : <Circle size={20} className="text-gray-300 shrink-0" />
        }
        <span className={`text-sm ${item.isDone ? 'text-green-700 line-through' : 'text-gray-800'}`}>
          {item.title}
        </span>
      </div>

      {/* 삭제 */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(item.id); }}
        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
