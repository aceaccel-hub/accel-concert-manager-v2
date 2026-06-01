import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react';
import type { Checklist } from '../../../types';
import {
  getChecklists,
  toggleChecklist,
  createChecklist,
  deleteChecklist,
} from '../../../hooks/useChecklists';
import type { ConcertTabContext } from '../ConcertDetail';

export default function ChecklistTab() {
  const { concert, reload } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [items, setItems] = useState<Checklist[]>([]);
  const [newTitle, setNewTitle] = useState('');

  const load = async () => {
    setItems(await getChecklists(concertId));
    // 상위 헤더의 진행률도 함께 새로고침
    await reload();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  const onToggle = async (item: Checklist) => {
    await toggleChecklist(item.id, !item.isDone);
    load();
  };

  const onAdd = async () => {
    if (!newTitle.trim()) return;
    await createChecklist(concertId, newTitle.trim());
    setNewTitle('');
    load();
  };

  const onDelete = async (id: string) => {
    await deleteChecklist(id);
    load();
  };

  const doneCount = items.filter((i) => i.isDone).length;
  const rate = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">체크리스트</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {doneCount}/{items.length} 완료 · {rate}%
          </p>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="card p-4">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>완료 {doneCount}개</span>
          <span>전체 {items.length}개</span>
        </div>
      </div>

      {/* 체크리스트 */}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">체크리스트 항목이 없습니다.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
              item.isDone
                ? 'bg-green-50 border-green-100'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onToggle(item)}
          >
            {item.isDone ? (
              <CheckCircle size={20} className="text-green-500 shrink-0" fill="currentColor" />
            ) : (
              <Circle size={20} className="text-gray-300 shrink-0" />
            )}
            <span
              className={`flex-1 text-sm ${
                item.isDone ? 'text-green-700 line-through' : 'text-gray-800'
              }`}
            >
              {item.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
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
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <button className="btn-primary" onClick={onAdd}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
