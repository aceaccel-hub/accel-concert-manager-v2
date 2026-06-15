import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/store';
import type { Concert, BudgetWithBalance } from '../../types';
import { getAllConcerts } from '../../hooks/useConcert';
import { getBudgets, getBudgetSummary, type BudgetSummary } from '../../hooks/useBudget';
import StatusBadge from '../common/StatusBadge';

export default function BudgetPage() {
  const navigate = useNavigate();
  const { selectedConcertId, setSelectedConcertId } = useStore();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithBalance[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({ income: 0, expense: 0, balance: 0 });
  const [activeId, setActiveId] = useState<string>(selectedConcertId ?? '');

  useEffect(() => {
    getAllConcerts().then((cs) => {
      setConcerts(cs);
      if (!activeId && cs.length > 0) {
        const id = selectedConcertId ?? cs[0].id;
        setActiveId(id);
        setSelectedConcertId(id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    Promise.all([getBudgets(activeId), getBudgetSummary(activeId)]).then(([b, s]) => {
      setBudgets(b);
      setSummary(s);
    });
  }, [activeId]);

  const activeConcert = concerts.find((c) => c.id === activeId) ?? null;
  const totalPlannedIncome = budgets.filter((b) => b.type === '수입').reduce((s, b) => s + b.plannedAmount, 0);
  const totalPlannedExpense = budgets.filter((b) => b.type === '지출').reduce((s, b) => s + b.plannedAmount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예산 현황</h1>
          <p className="text-sm text-gray-500 mt-1">
            연주회별 예산을 확인하고 상세 편집은 연주회 상세 → 예산 탭에서 진행하세요.
          </p>
        </div>
        {activeConcert && (
          <button
            className="btn-primary text-xs"
            onClick={() => navigate(`/concerts/${activeConcert.id}/budget`)}
          >
            <ExternalLink size={12} /> 상세 편집
          </button>
        )}
      </div>

      <div>
        <label className="label">연주회 선택</label>
        <select
          className="input max-w-md"
          value={activeId}
          onChange={(e) => {
            setActiveId(e.target.value);
            setSelectedConcertId(e.target.value);
          }}
        >
          <option value="">선택하세요</option>
          {concerts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {activeConcert ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <SumCard
              icon={<TrendingUp className="text-green-600" />}
              bg="bg-green-50"
              label="수입 (실집행)"
              value={summary.income}
              valueClass="text-green-600"
              planned={totalPlannedIncome}
            />
            <SumCard
              icon={<TrendingDown className="text-red-600" />}
              bg="bg-red-50"
              label="지출 (실집행)"
              value={summary.expense}
              valueClass="text-red-600"
              planned={totalPlannedExpense}
            />
            <SumCard
              icon={<DollarSign className="text-blue-600" />}
              bg="bg-blue-50"
              label="잔액 (자동)"
              value={summary.balance}
              valueClass={summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}
            />
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">잔액(자동)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {budgets.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span
                        className={`badge text-xs ${
                          b.type === '수입'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{b.category}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                    <td className="px-4 py-3 text-right">{b.plannedAmount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {b.paidAmount.toLocaleString()}원
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        b.balance < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {b.balance.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                  </tr>
                ))}
                {budgets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                      예산 항목이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card p-12 text-center text-gray-400">연주회를 선택하세요.</div>
      )}
    </div>
  );
}

function SumCard({
  icon,
  bg,
  label,
  value,
  valueClass,
  planned,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  valueClass: string;
  planned?: number;
}) {
  return (
    <div className="card p-4">
      <div className={`p-2 rounded-lg w-fit ${bg}`}>{icon}</div>
      <p className={`text-xl font-bold mt-2 ${valueClass}`}>{value.toLocaleString()}원</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {planned != null && (
        <p className="text-[10px] text-gray-400 mt-0.5">계획 {planned.toLocaleString()}원</p>
      )}
    </div>
  );
}
