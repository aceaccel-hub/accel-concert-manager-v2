import SmartInput from '../../common/SmartInput';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, GripVertical, Download, Check, Filter } from 'lucide-react';
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
import type { Budget, ConcertMember, Member } from '../../../types';
import Modal from '../../common/Modal';
import StatusBadge from '../../common/StatusBadge';

type TabName = 'summary' | 'income' | 'expense' | 'withholding';

export default function BudgetTab() {
  const { concertId } = useParams<{ concertId: string }>();

  if (!concertId) {
    return <div className="p-6 text-center text-gray-400">연주회 정보를 불러올 수 없습니다.</div>;
  }
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [concertMembers, setConcertMembers] = useState<ConcertMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('summary');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Budget | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const budgetData = await db.budgets.where('concertId').equals(concertId).toArray();
    const sorted = budgetData
      .map((b, idx) => ({ ...b, order: b.order ?? idx + 1 }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setBudgets(sorted);

    const memberData = await db.members.toArray();
    setMembers(memberData);

    const cmData = await db.concertMembers.where('concertId').equals(concertId).toArray();
    setConcertMembers(cmData);
  };

  useEffect(() => { load(); }, [concertId]);

  const income  = budgets.filter(b => b.type === '수입');
  // 지출내역: Budget의 지출 + ConcertMember의 단원페이 (동기화 문제 해결)
  const budgetExpense = budgets.filter(b => b.type === '지출' && b.category !== '단원페이');
  const memberPayExpense: Budget[] = concertMembers
    .filter(cm => cm.fee > 0)
    .map(cm => {
      const member = members.find(m => m.id === cm.memberId);
      return {
        id: cm.id + '_memberFee',
        concertId: cm.concertId,
        type: '지출',
        category: '단원페이',
        title: `${member?.name || '?'} 사례비`,
        plannedAmount: cm.fee,
        paidAmount: 0,
        paymentStatus: '예정',
        createdAt: new Date().toISOString(),
      } as Budget;
    });
  const expense = [...budgetExpense, ...memberPayExpense];

  const totalIncomePlanned = income.reduce((s, b) => s + b.plannedAmount, 0);
  const totalIncomeActual = income.reduce((s, b) => s + b.paidAmount, 0);
  const totalExpensePlanned = expense.reduce((s, b) => s + b.plannedAmount, 0);
  const totalExpenseActual = expense.reduce((s, b) => s + b.paidAmount, 0);

  const handleDragStart = (e: DragStartEvent) => {
    // memberPayExpense 항목은 드래그 불가
    if (e.active.id.toString().endsWith('_memberFee')) return;
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    if (active.id.toString().endsWith('_memberFee')) return;

    const activeIdx = budgets.findIndex(b => b.id === active.id);
    const overIdx = budgets.findIndex(b => b.id === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    const moved = arrayMove(budgets, activeIdx, overIdx);

    try {
      const { order: _, ...rest } = moved[0];
      await Promise.all(moved.map((b) => {
        const { order: _o, ...data } = b;
        return db.budgets.put(data);
      }));
      load();
    } catch (error) {
      console.error('Drag end error:', error);
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (id.endsWith('_memberFee')) {
      toast.error('단원페이는 MembersTab에서 수정해주세요.');
      return;
    }
    if (!confirm('삭제하시겠습니까?')) return;
    await db.budgets.delete(id);
    load();
  };

  const handleSaveConcertMember = async (cm: ConcertMember) => {
    if (concertMembers.find(x => x.id === cm.id)) {
      await db.concertMembers.put(cm);
    } else {
      await db.concertMembers.add(cm);
    }
    load();
  };

  return (
    <div className="p-6 space-y-4">
      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'summary' as TabName, label: '전체보기' },
          { id: 'income' as TabName, label: '수입내역' },
          { id: 'expense' as TabName, label: '지출내역' },
          { id: 'withholding' as TabName, label: '원천징수내역' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 섹션 1: 예산 요약 */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <SummaryCard
              icon={<TrendingUp className="text-green-500" size={20} />}
              label="예상 수입"
              value={totalIncomePlanned}
              color="green"
            />
            <SummaryCard
              icon={<Check className="text-green-600" size={20} />}
              label="실제 수입"
              value={totalIncomeActual}
              color="green"
            />
            <SummaryCard
              icon={<TrendingDown className="text-red-500" size={20} />}
              label="예상 지출"
              value={totalExpensePlanned}
              color="red"
            />
            <SummaryCard
              icon={<Check className="text-red-600" size={20} />}
              label="실제 지출"
              value={totalExpenseActual}
              color="red"
            />
          </div>

          <div className="card p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">순이익 (예상)</p>
                <p className="text-lg font-bold text-gray-900">{(totalIncomePlanned - totalExpensePlanned).toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">순이익 (실제)</p>
                <p className={`text-lg font-bold ${totalIncomeActual - totalExpenseActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(totalIncomeActual - totalExpenseActual).toLocaleString()}원
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">집행률</p>
                <p className="text-lg font-bold text-indigo-600">
                  {totalExpensePlanned > 0 ? Math.round(totalExpenseActual / totalExpensePlanned * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* 수입내역 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">수입내역</h3>
            {income.length > 0 ? (
              <BudgetTable
                items={income}
                activeId={activeId}
                isDragging={activeId !== null}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onEdit={(item) => { setEditItem(item); setShowAdd(true); }}
                onDelete={handleDelete}
                sensors={sensors}
              />
            ) : (
              <div className="card p-8 text-center text-gray-400 text-sm">수입 항목이 없습니다.</div>
            )}
          </div>

          {/* 지출내역 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">지출내역</h3>
            {expense.length > 0 ? (
              <BudgetTable
                items={expense}
                activeId={activeId}
                isDragging={activeId !== null}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onEdit={(item) => { setEditItem(item); setShowAdd(true); }}
                onDelete={handleDelete}
                sensors={sensors}
              />
            ) : (
              <div className="card p-8 text-center text-gray-400 text-sm">지출 항목이 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* 섹션 2: 수입 관리 */}
      {activeTab === 'income' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">수입 항목</h3>
            <button className="btn-primary text-xs" onClick={() => { setEditItem(null); setShowAdd(true); }}>
              <Plus size={14} /> 항목 추가
            </button>
          </div>
          {income.length > 0 ? (
            <BudgetTable
              items={income}
              activeId={activeId}
              isDragging={activeId !== null}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onEdit={(item) => { setEditItem(item); setShowAdd(true); }}
              onDelete={handleDelete}
              sensors={sensors}
            />
          ) : (
            <div className="card p-12 text-center text-gray-400 text-sm">수입 항목이 없습니다.</div>
          )}
        </div>
      )}

      {/* 섹션 3: 지출 관리 */}
      {activeTab === 'expense' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">지출 항목</h3>
            <button className="btn-primary text-xs" onClick={() => { setEditItem(null); setShowAdd(true); }}>
              <Plus size={14} /> 항목 추가
            </button>
          </div>
          {expense.length > 0 ? (
            <BudgetTable
              items={expense}
              activeId={activeId}
              isDragging={activeId !== null}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onEdit={(item) => { setEditItem(item); setShowAdd(true); }}
              onDelete={handleDelete}
              sensors={sensors}
            />
          ) : (
            <div className="card p-12 text-center text-gray-400 text-sm">지출 항목이 없습니다.</div>
          )}
        </div>
      )}

      {/* 섹션 4: 원천징수 내역 */}
      {activeTab === 'withholding' && (
        <WithholdingTable
          concertMembers={concertMembers}
          members={members}
        />
      )}

      {(showAdd || editItem) && (
        <BudgetForm
          concertId={concertId}
          item={editItem}
          defaultType={activeTab === 'income' ? '수입' : '지출'}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={() => { load(); setShowAdd(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className="card p-4">
      <div className={`p-2 rounded-lg bg-${color}-50 w-fit`}>{icon}</div>
      <p className={`text-lg font-bold mt-2 text-${color}-600`}>{value.toLocaleString()}원</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function BudgetTable({
  items,
  activeId,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  sensors,
}: {
  items: Budget[];
  activeId: string | null;
  isDragging: boolean;
  onDragStart: (e: DragStartEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
  onEdit: (item: Budget) => void;
  onDelete: (id: string) => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  if (items.length === 0) {
    return <div className="card p-12 text-center text-gray-400 text-sm">항목이 없습니다.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-8 px-2 py-3"></th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">카테고리</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항목명</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">예상 금액</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">실제 금액</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">잔액</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">상태</th>
            <th className="w-16 px-3 py-3"></th>
          </tr>
        </thead>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={items.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <tbody className="divide-y divide-gray-100">
              {items.map(b => (
                <SortableBudgetRow
                  key={b.id}
                  budget={b}
                  isDragging={activeId === b.id}
                  onEdit={() => onEdit(b)}
                  onDelete={() => onDelete(b.id)}
                />
              ))}
            </tbody>
          </SortableContext>
          <DragOverlay>
            {activeId && items.find(b => b.id === activeId) && (
              <table className="w-full text-sm bg-white shadow-2xl rounded-xl opacity-95">
                <tbody>
                  <tr className="bg-indigo-50">
                    <td className="w-8 px-2 py-3 text-indigo-400"><GripVertical size={16} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{items.find(b => b.id === activeId)?.category}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{items.find(b => b.id === activeId)?.title}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </DragOverlay>
        </DndContext>
      </table>
    </div>
  );
}

function SortableBudgetRow({
  budget: b,
  isDragging,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const bal = b.plannedAmount - b.paidAmount;
  const isMemberPayItem = b.id.endsWith('_memberFee');

  const handleEdit = () => {
    onEdit();
  };

  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-gray-50 ${isDragging ? 'bg-indigo-50' : ''}`}>
      <td className="px-2 py-3">
        {!isMemberPayItem && (
          <div {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex justify-center">
            <GripVertical size={16} />
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs">{b.category}</td>
      <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
      <td className="px-4 py-3 text-right text-gray-700">{b.plannedAmount.toLocaleString()}원</td>
      <td className="px-4 py-3 text-right text-red-600">{b.paidAmount.toLocaleString()}원</td>
      <td className={`px-4 py-3 text-right font-medium ${bal < 0 ? 'text-red-600' : 'text-green-600'}`}>{bal.toLocaleString()}원</td>
      <td className="px-4 py-3 text-center"><StatusBadge status={b.paymentStatus} /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <button onClick={handleEdit} className="text-gray-400 hover:text-indigo-600">
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className={`${isMemberPayItem ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`}
            disabled={isMemberPayItem}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PayrollTable({
  concertMembers,
  members,
  onSave,
}: {
  concertMembers: ConcertMember[];
  members: Member[];
  onSave: (cm: ConcertMember) => void;
}) {
  if (concertMembers.length === 0) {
    return <div className="card p-12 text-center text-gray-400 text-sm">단원이 없습니다.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">파트</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">기본 사례비</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">추가금</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">차감액</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">최종 지급액</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">지급 상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {concertMembers.map(cm => {
            const member = members.find(m => m.id === cm.memberId);
            const baseFee = cm.fee ?? member?.baseFee ?? 0;
            const extra = cm.feeExtra ?? 0;
            const deduction = cm.feeDeduction ?? 0;
            const final = baseFee + extra - deduction;

            return (
              <tr key={cm.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{member?.name || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{cm.role || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{cm.part || '-'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{baseFee.toLocaleString()}원</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    value={extra}
                    onChange={e => onSave({ ...cm, feeExtra: +e.target.value })}
                    className="input text-xs py-1 w-24 text-right"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    value={deduction}
                    onChange={e => onSave({ ...cm, feeDeduction: +e.target.value })}
                    className="input text-xs py-1 w-24 text-right"
                  />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{final.toLocaleString()}원</td>
                <td className="px-4 py-3 text-center">
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cm.feePaid === true}
                      onChange={e => onSave({ ...cm, feePaid: e.target.checked })}
                      className="rounded"
                    />
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettlementView({
  concertMembers,
  members,
  budgets,
}: {
  concertMembers: ConcertMember[];
  members: Member[];
  budgets: Budget[];
}) {
  const income = budgets.filter(b => b.type === '수입').reduce((s, b) => s + b.paidAmount, 0);
  const expense = budgets.filter(b => b.type === '지출').reduce((s, b) => s + b.paidAmount, 0);
  const totalPayroll = concertMembers.reduce((s, cm) => {
    const member = members.find(m => m.id === cm.memberId);
    const baseFee = cm.fee ?? member?.baseFee ?? 0;
    const extra = cm.feeExtra ?? 0;
    const deduction = cm.feeDeduction ?? 0;
    return s + (baseFee + extra - deduction);
  }, 0);
  const balance = income - expense - totalPayroll;

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">최종 정산 현황</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">실제 수입</p>
            <p className="text-2xl font-bold text-green-600">{income.toLocaleString()}원</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">실제 지출</p>
            <p className="text-2xl font-bold text-red-600">{expense.toLocaleString()}원</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">사례비 총액</p>
            <p className="text-2xl font-bold text-orange-600">{totalPayroll.toLocaleString()}원</p>
          </div>
          <div className={`p-4 rounded-lg ${balance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-600 mb-1">순잉여금</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{balance.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      <div className="card p-6 overflow-hidden">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">단원별 사례비</h4>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">이름</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">역할</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">기본 사례비</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">추가금</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">차감액</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600">최종 금액</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600">지급</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {concertMembers.map(cm => {
              const member = members.find(m => m.id === cm.memberId);
              const baseFee = cm.fee ?? member?.baseFee ?? 0;
              const extra = cm.feeExtra ?? 0;
              const deduction = cm.feeDeduction ?? 0;
              const final = baseFee + extra - deduction;

              return (
                <tr key={cm.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">{member?.name}</td>
                  <td className="px-3 py-2 text-gray-600">{cm.role}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{baseFee.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{extra > 0 ? '+' + extra.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{deduction > 0 ? '-' + deduction.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{final.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">{cm.feePaid ? '✓' : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetForm({
  concertId,
  item,
  defaultType,
  onClose,
  onSaved,
}: {
  concertId: string;
  item: Budget | null;
  defaultType: Budget['type'];
  onClose: () => void;
  onSaved: () => void;
}) {
  const incomeCategories = ['티켓판매', '후원금', '지원금', '참가비', '기타수입'];
  const expenseCategories = ['대관료', '지휘자사례비', '협연자사례비', '단원페이', '악보비', '홍보비', '인쇄비', '식비', '기타지출'];
  const [form, setForm] = useState({
    type: (item?.type || defaultType) as Budget['type'],
    category: item?.category || '',
    title: item?.title || '',
    plannedAmount: item?.plannedAmount || 0,
    paidAmount: item?.paidAmount || 0,
    paymentStatus: (item?.paymentStatus || '예정') as Budget['paymentStatus'],
    memo: item?.memo || '',
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const categories = form.type === '수입' ? incomeCategories : expenseCategories;
  const isMemberPayItem = item?.id?.endsWith('_memberFee') ?? false;

  const handleSave = async () => {
    try {
      if (!form.title || !form.category) {
        toast.error('카테고리와 항목명을 입력해 주세요.');
        return;
      }
      console.log('Budget save attempt:', { concertId, form });
      const data: Budget = {
        id: item?.id || crypto.randomUUID(),
        concertId,
        ...form,
        createdAt: item?.createdAt || new Date().toISOString(),
      };
      console.log('Budget data to save:', data);
      if (item) {
        console.log('Updating existing budget:', item.id);
        await db.budgets.put(data);
        toast.success('예산 항목이 수정되었습니다.');
      } else {
        console.log('Adding new budget');
        await db.budgets.add(data);
        toast.success('예산 항목이 추가되었습니다.');
      }
      console.log('Budget saved successfully');
      onSaved();
    } catch (error) {
      console.error('Budget save error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error(`저장 중 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Modal title={item ? '예산 항목 편집' : '예산 항목 추가'} onClose={onClose} size="md">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">구분 *</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            <option>수입</option>
            <option>지출</option>
          </select>
        </div>
        <div>
          <label className="label">카테고리 *</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">선택하세요</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label>항목명 *</label>
          <SmartInput className="input" name="항목명" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className="label">예상 금액 (원)</label>
          {isMemberPayItem ? (
            <>
              <div className="input bg-gray-50 text-gray-600 cursor-not-allowed px-3 py-2">
                {form.plannedAmount.toLocaleString()}원
              </div>
              <p className="text-xs text-gray-400 mt-1">(MembersTab에서 수정)</p>
            </>
          ) : (
            <SmartInput type="number" name="예상금액" className="input" value={form.plannedAmount} onChange={e => set('plannedAmount', +e.target.value)} />
          )}
        </div>
        <div>
          <label className="label">실제 금액 (원)</label>
          <SmartInput type="number" name="실제금액" className="input" value={form.paidAmount} onChange={e => set('paidAmount', +e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">잔액: {(form.plannedAmount - form.paidAmount).toLocaleString()}원</p>
        </div>
        <div>
          <label className="label">지급 상태</label>
          <select className="input" value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
            {['예정', '완료', '취소'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label>메모</label>
          <SmartInput className="input" name="메모" value={form.memo} onChange={e => set('memo', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}

function downloadPayrollCSV(concertMembers: ConcertMember[], members: Member[]) {
  const rows = [['이름', '역할', '파트', '기본 사례비', '추가금', '차감액', '최종 지급액', '지급여부']];

  concertMembers.forEach(cm => {
    const member = members.find(m => m.id === cm.memberId);
    const baseFee = cm.fee ?? member?.baseFee ?? 0;
    const extra = cm.feeExtra ?? 0;
    const deduction = cm.feeDeduction ?? 0;
    const final = baseFee + extra - deduction;

    rows.push([
      member?.name || '',
      cm.role || '',
      cm.part || '',
      baseFee.toString(),
      extra.toString(),
      deduction.toString(),
      final.toString(),
      cm.feePaid ? '지급완료' : '미지급',
    ]);
  });

  const csv = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `사례비정산_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function WithholdingTable({
  concertMembers,
  members,
}: {
  concertMembers: ConcertMember[];
  members: Member[];
}) {
  const WITHHOLDING_RATE = 0.033;

  if (concertMembers.length === 0) {
    return <div className="card p-12 text-center text-gray-400 text-sm">단원이 없습니다.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">지급액</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">원천징수세액 (3.3%)</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">실지급액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {concertMembers.map(cm => {
            const member = members.find(m => m.id === cm.memberId);
            const baseFee = cm.fee ?? member?.baseFee ?? 0;
            const extra = cm.feeExtra ?? 0;
            const deduction = cm.feeDeduction ?? 0;
            const paymentAmount = baseFee + extra - deduction;
            const withholding = Math.round(paymentAmount * WITHHOLDING_RATE);
            const actual = paymentAmount - withholding;

            return (
              <tr key={cm.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{member?.name || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{cm.role || '-'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{paymentAmount.toLocaleString()}원</td>
                <td className="px-4 py-3 text-right text-red-600 font-medium">{withholding.toLocaleString()}원</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{actual.toLocaleString()}원</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
