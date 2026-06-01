import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, GripVertical } from 'lucide-react';
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
import type { Budget } from '../../../types';
import Modal from '../../common/Modal';
import StatusBadge from '../../common/StatusBadge';

interface Props { concertId: string; }

export default function BudgetTab({ concertId }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Budget | null>(null);
  const [typeFilter, setTypeFilter] = useState<'전체' | '수입' | '지출'>('전체');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const data = await db.budgets.where('concertId').equals(concertId).toArray();
    const sorted = data
      .map((b, idx) => ({ ...b, order: b.order ?? idx + 1 }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setBudgets(sorted);
  };

  useEffect(() => { load(); }, [concertId]);

  const income  = budgets.filter(b => b.type === '수입');
  const expense = budgets.filter(b => b.type === '지출');
  const totalPlanned = income.reduce((s, b) => s + b.plannedAmount, 0);
  const totalPaid    = expense.reduce((s, b) => s + b.paidAmount, 0);
  const balance = totalPlanned - totalPaid;

  const filtered = typeFilter === '전체' ? budgets : budgets.filter(b => b.type === typeFilter);

  /* ── DnD ── */
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    // 필터 적용 중일 때는 해당 필터 목록 기준으로 이동
    const base = filtered;
    const oldIdx = base.findIndex(i => i.id === active.id);
    const newIdx = base.findIndex(i => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const reorderedFiltered = arrayMove(base, oldIdx, newIdx);
    // 전체 budgets에 반영 (필터링 안 된 항목은 위치 유지)
    const idOrder = reorderedFiltered.map(b => b.id);
    const remaining = budgets.filter(b => !idOrder.includes(b.id));
    // 필터된 항목의 새 order를 전체 기준으로 재산정
    const merged = [...reorderedFiltered, ...remaining].map((b, idx) => ({ ...b, order: idx + 1 }));
    setBudgets(merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    await Promise.all(merged.map(b => db.budgets.put(b)));
    toast.success('예산 순서가 변경되었습니다.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 예산 항목을 삭제하시겠습니까?')) return;
    await db.budgets.delete(id);
    load();
  };

  const activeBudget = budgets.find(i => i.id === activeId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">예산 관리</h2>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 항목 추가
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={<TrendingUp className="text-green-600" />} label="총 예산 (수입)" value={totalPlanned} color="green" />
        <SummaryCard icon={<TrendingDown className="text-red-600" />} label="총 지출" value={totalPaid} color="red" />
        <SummaryCard icon={<DollarSign className="text-blue-600" />} label="잔여 예산" value={balance} color={balance >= 0 ? 'blue' : 'red'} />
      </div>

      {/* 지출 그래프 */}
      {totalPlanned > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>예산 집행률</span>
            <span>{Math.round(totalPaid / totalPlanned * 100)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${Math.min(100, totalPaid / totalPlanned * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{totalPaid.toLocaleString()}원 집행</span>
            <span>{totalPlanned.toLocaleString()}원 예산</span>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-2">
        {(['전체', '수입', '지출'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${typeFilter === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{t}</button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">· 핸들(⠿)을 드래그해 순서 변경</span>
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">예산 항목이 없습니다.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구분</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항목명</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">예산</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">집행액</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">잔액</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">상태</th>
                <th className="w-16 px-3 py-3"></th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(b => (
                    <SortableBudgetRow
                      key={b.id}
                      budget={b}
                      isDragging={activeId === b.id}
                      onEdit={() => setEditItem(b)}
                      onDelete={() => handleDelete(b.id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
              <DragOverlay>
                {activeBudget && (
                  <table className="w-full text-sm bg-white shadow-2xl rounded-xl opacity-95">
                    <tbody>
                      <tr className="bg-indigo-50">
                        <td className="w-8 px-2 py-3 text-indigo-400"><GripVertical size={16} /></td>
                        <td className="px-4 py-3"><span className={`badge text-xs ${activeBudget.type === '수입' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{activeBudget.type}</span></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{activeBudget.category}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{activeBudget.title}</td>
                        <td colSpan={5}></td>
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
        <BudgetForm
          concertId={concertId}
          item={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={() => { load(); setShowAdd(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

/* ── Sortable Budget Row ── */
function SortableBudgetRow({ budget: b, isDragging, onEdit, onDelete }: {
  budget: Budget; isDragging: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const bal = b.plannedAmount - b.paidAmount;
  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 ${isDragging ? 'bg-indigo-50' : ''}`}>
      <td className="px-2 py-3">
        <div {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex justify-center" title="드래그해서 순서 변경">
          <GripVertical size={16} />
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`badge text-xs ${b.type === '수입' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{b.type}</span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{b.category}</td>
      <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
      <td className="px-4 py-3 text-right text-gray-700">{b.plannedAmount.toLocaleString()}원</td>
      <td className="px-4 py-3 text-right text-red-600">{b.paidAmount.toLocaleString()}원</td>
      <td className={`px-4 py-3 text-right font-medium ${bal < 0 ? 'text-red-600' : 'text-green-600'}`}>{bal.toLocaleString()}원</td>
      <td className="px-4 py-3 text-center"><StatusBadge status={b.paymentStatus} /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
          <button onClick={onDelete} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={`p-2 rounded-lg bg-${color}-50 w-fit`}>{icon}</div>
      <p className={`text-xl font-bold mt-2 text-${color}-600`}>{value.toLocaleString()}원</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function BudgetForm({ concertId, item, onClose, onSaved }: {
  concertId: string; item: Budget | null; onClose: () => void; onSaved: () => void;
}) {
  const incomeCategories = ['티켓판매', '후원금', '지원금', '참가비', '기타수입'];
  const expenseCategories = ['대관료', '지휘자사례비', '협연자사례비', '단원사례비', '악보비', '홍보비', '인쇄비', '식비', '기타지출'];
  const [form, setForm] = useState({ type: '지출' as Budget['type'], category: '', title: '', plannedAmount: 0, paidAmount: 0, paymentStatus: '예정' as Budget['paymentStatus'], memo: '' });
  useEffect(() => {
    if (item) setForm({ type: item.type, category: item.category, title: item.title, plannedAmount: item.plannedAmount, paidAmount: item.paidAmount, paymentStatus: item.paymentStatus, memo: item.memo || '' });
  }, []);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const categories = form.type === '수입' ? incomeCategories : expenseCategories;
  const handleSave = async () => {
    if (!form.title || !form.category) { alert('카테고리와 항목명을 입력해 주세요.'); return; }
    const count = await db.budgets.where('concertId').equals(concertId).count();
    const data: Budget = { id: item?.id || crypto.randomUUID(), concertId, ...form, order: item?.order ?? count + 1, createdAt: item?.createdAt || new Date().toISOString() };
    if (item) await db.budgets.put(data);
    else await db.budgets.add(data);
    onSaved();
  };
  return (
    <Modal title={item ? '예산 항목 편집' : '예산 항목 추가'} onClose={onClose} size="md">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">구분 *</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}><option>수입</option><option>지출</option></select>
        </div>
        <div><label className="label">카테고리 *</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">선택하세요</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="label">항목명 *</label><input className="input" value={form.title} onChange={e => set('title', e.target.value)} /></div>
        <div><label className="label">예산 (원)</label><input type="number" className="input" value={form.plannedAmount} onChange={e => set('plannedAmount', +e.target.value)} /></div>
        <div>
          <label className="label">집행액 (원)</label>
          <input type="number" className="input" value={form.paidAmount} onChange={e => set('paidAmount', +e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">잔액: {(form.plannedAmount - form.paidAmount).toLocaleString()}원</p>
        </div>
        <div><label className="label">지급 상태</label>
          <select className="input" value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
            {['예정', '완료', '취소'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="label">메모</label><input className="input" value={form.memo} onChange={e => set('memo', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
