import { useEffect, useState } from 'react';
import { db } from '../../db/database';
import type { Budget, Concert } from '../../types';

export default function BudgetPageFull() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const cs = await db.concerts.orderBy('date').reverse().toArray();
      setConcerts(cs);
      if (cs.length > 0) setSelectedId(cs[0].id);
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedId) db.budgets.where('concertId').equals(selectedId).toArray().then(setBudgets);
  }, [selectedId]);

  const income = budgets.filter(b => b.type === '수입');
  const expense = budgets.filter(b => b.type === '지출');
  const totalIncome = income.reduce((s, b) => s + b.plannedAmount, 0);
  const totalPaid = expense.reduce((s, b) => s + b.paidAmount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">예산 전체 현황</h1>
      <p className="text-sm text-gray-500">상세 편집은 연주회 상세 → 예산 탭에서 하세요.</p>

      <div>
        <label className="label">연주회 선택</label>
        <select className="input max-w-md" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {concerts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {selectedId && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4"><p className="text-xs text-gray-500">총 예산</p><p className="text-xl font-bold text-green-600 mt-1">{totalIncome.toLocaleString()}원</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">총 지출</p><p className="text-xl font-bold text-red-600 mt-1">{totalPaid.toLocaleString()}원</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500">잔여 예산</p><p className={`text-xl font-bold mt-1 ${totalIncome - totalPaid >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{(totalIncome - totalPaid).toLocaleString()}원</p></div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구분</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">카테고리</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">항목</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">예산</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">집행액</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budgets.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${b.type === '수입' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{b.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{b.category}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                    <td className="px-4 py-3 text-right">{b.plannedAmount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-red-600">{b.paidAmount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge text-xs ${b.paymentStatus === '완료' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>{b.paymentStatus}</span>
                    </td>
                  </tr>
                ))}
                {budgets.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">예산 항목이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
