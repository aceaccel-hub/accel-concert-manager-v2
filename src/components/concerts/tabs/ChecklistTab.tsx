import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
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

  const load = async () => {
    const data = await db.checklists.where('concertId').equals(concertId).sortBy('order');
    setItems(data);
    const rate = data.length > 0 ? Math.round(data.filter(i => i.isDone).length / data.length * 100) : 0;
    onRateChange?.(rate);
  };

  useEffect(() => { load(); }, [concertId]);

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

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">체크리스트</h2>
          <p className="text-xs text-gray-500 mt-0.5">{doneCount}/{items.length} 완료 · {rate}%</p>
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

      {/* 체크리스트 */}
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${item.isDone ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}
            onClick={() => toggle(item)}
          >
            {item.isDone
              ? <CheckCircle size={20} className="text-green-500 shrink-0" fill="currentColor" />
              : <Circle size={20} className="text-gray-300 shrink-0" />
            }
            <span className={`flex-1 text-sm ${item.isDone ? 'text-green-700 line-through' : 'text-gray-800'}`}>
              {item.title}
            </span>
            <button
              onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 새 항목 추가 */}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="새 항목 추가..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button className="btn-primary" onClick={addItem}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
