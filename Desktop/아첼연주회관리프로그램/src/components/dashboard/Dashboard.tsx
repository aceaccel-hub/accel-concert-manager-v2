import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music2,
  Users,
  CalendarDays,
  TrendingUp,
  Clock,
  MapPin,
  CheckSquare,
  Wallet,
  BookOpen,
} from 'lucide-react';
import { useStore } from '../../store/store';
import { getAllConcerts } from '../../hooks/useConcert';
import { getProgramItems } from '../../hooks/useProgram';
import { getConcertMembers } from '../../hooks/useMembers';
import { getRehearsals } from '../../hooks/useRehearsals';
import { getBudgets, getBudgetSummary } from '../../hooks/useBudget';
import { getChecklists } from '../../hooks/useChecklists';
import type {
  Concert,
  ProgramItem,
  ConcertMember,
  Member,
  Rehearsal,
  Checklist,
  BudgetWithBalance,
} from '../../types';
import StatusBadge from '../common/StatusBadge';
import { formatDuration } from '../../utils/calculations';

const today = () => new Date().toISOString().split('T')[0];

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedConcertId, setSelectedConcertId, settings } = useStore();

  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [members, setMembers] = useState<(ConcertMember & { member: Member })[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithBalance[]>([]);
  const [budgetSummary, setBudgetSummary] = useState({ income: 0, expense: 0, balance: 0 });

  // 1) 전체 콘서트 로드 + 기본 선택값 설정
  useEffect(() => {
    const load = async () => {
      const all = await getAllConcerts();
      setConcerts(all);
      if (!selectedConcertId && all.length > 0) {
        const upcoming = all.find((c) => c.date >= today() && c.status !== '취소');
        setSelectedConcertId((upcoming ?? all[0]).id);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 선택 콘서트 변경 시 디테일 로드
  useEffect(() => {
    if (!selectedConcertId) {
      setPrograms([]);
      setMembers([]);
      setRehearsals([]);
      setChecklists([]);
      setBudgets([]);
      setBudgetSummary({ income: 0, expense: 0, balance: 0 });
      return;
    }
    const load = async () => {
      const [p, m, r, c, b, bs] = await Promise.all([
        getProgramItems(selectedConcertId),
        getConcertMembers(selectedConcertId),
        getRehearsals(selectedConcertId),
        getChecklists(selectedConcertId),
        getBudgets(selectedConcertId),
        getBudgetSummary(selectedConcertId),
      ]);
      setPrograms(p);
      setMembers(m);
      setRehearsals(r);
      setChecklists(c);
      setBudgets(b);
      setBudgetSummary(bs);
    };
    load();
  }, [selectedConcertId]);

  const selectedConcert = concerts.find((c) => c.id === selectedConcertId) ?? null;

  // 전체 통계
  const yearStr = String(settings.baseYear);
  const yearConcerts = concerts.filter((c) => c.date?.startsWith(yearStr));
  const activeConcerts = concerts.filter((c) => c.status === '진행중');
  const doneConcerts = concerts.filter((c) => c.status === '완료');
  const upcomingRehearsals = rehearsals.filter((r) => r.date >= today());

  // 체크리스트
  const checkedCount = checklists.filter((c) => c.isDone).length;
  const checkRate = checklists.length > 0 ? Math.round((checkedCount / checklists.length) * 100) : 0;

  // 예산 (수입/지출 각각 계획 vs 실제)
  const incomeItems = budgets.filter((b) => b.type === '수입');
  const expenseItems = budgets.filter((b) => b.type === '지출');
  const totalPlannedIncome = incomeItems.reduce((s, b) => s + b.plannedAmount, 0);
  const totalActualIncome = incomeItems.reduce((s, b) => s + b.paidAmount, 0);
  const totalPlannedExpense = expenseItems.reduce((s, b) => s + b.plannedAmount, 0);
  const totalActualExpense = expenseItems.reduce((s, b) => s + b.paidAmount, 0);

  const goConcertTab = (tab: string) => {
    if (!selectedConcertId) {
      navigate('/concerts');
      return;
    }
    navigate(`/concerts/${selectedConcertId}/${tab}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">전체 연주회 현황과 선택한 연주회의 진행 상태를 한눈에 확인하세요.</p>
      </div>

      {/* 전체 통계 4 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Music2 className="text-blue-600" />}
          bg="bg-blue-50"
          label={`${yearStr}년 연주회`}
          value={`${yearConcerts.length}건`}
          note="전체 기준"
        />
        <StatCard
          icon={<TrendingUp className="text-green-600" />}
          bg="bg-green-50"
          label="진행중"
          value={`${activeConcerts.length}건`}
          note="전체 기준"
        />
        <StatCard
          icon={<CheckSquare className="text-purple-600" />}
          bg="bg-purple-50"
          label="완료"
          value={`${doneConcerts.length}건`}
          note="전체 기준"
        />
        <StatCard
          icon={<CalendarDays className="text-yellow-600" />}
          bg="bg-yellow-50"
          label="예정 연습"
          value={`${upcomingRehearsals.length}회`}
          note="선택 연주회 기준"
        />
      </div>

      {/* 연주회 선택 */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">연주회 선택</h2>
        <div className="flex gap-2 flex-wrap">
          {concerts.length === 0 && <p className="text-xs text-gray-400">등록된 연주회가 없습니다.</p>}
          {concerts.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedConcertId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                selectedConcertId === c.id
                  ? 'bg-[#2563eb] text-white border-[#2563eb]'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* 선택 연주회 상세 */}
      {selectedConcert ? (
        <>
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={selectedConcert.status} />
                  <span className="text-xs text-gray-400">선택 연주회 기준</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 truncate">{selectedConcert.title}</h2>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {selectedConcert.date} {selectedConcert.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {selectedConcert.place}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={14} />
                    단원 {members.filter((m) => !m.isReserve).length}명
                  </span>
                  {selectedConcert.expectedDuration ? (
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {formatDuration(selectedConcert.expectedDuration)} 예정
                    </span>
                  ) : null}
                </div>
              </div>
              <button onClick={() => goConcertTab('basic')} className="btn-primary text-xs">
                상세 보기
              </button>
            </div>

            {/* 체크리스트 진행률 */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>체크리스트 진행률</span>
                <span>
                  {checkRate}% ({checkedCount}/{checklists.length})
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563eb] rounded-full transition-all"
                  style={{ width: `${checkRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* 요약 카드 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 곡목 */}
            <SummaryCard
              icon={<BookOpen size={16} className="text-blue-600" />}
              title="곡목 요약"
              onAll={() => goConcertTab('program')}
              footer={`총 ${programs.reduce((s, p) => s + (p.duration ?? 0), 0)}분 · ${programs.length}곡`}
              empty={programs.length === 0 ? '등록된 곡목이 없습니다.' : null}
            >
              {programs.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 w-6 shrink-0">{p.order}.</span>
                  <span className="flex-1 font-medium text-gray-800 truncate">
                    {p.composer} - {p.title}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {p.duration ? `${p.duration}분` : '-'}
                  </span>
                </div>
              ))}
            </SummaryCard>

            {/* 단원 */}
            <SummaryCard
              icon={<Users size={16} className="text-green-600" />}
              title="단원 배치"
              onAll={() => goConcertTab('members')}
              empty={members.length === 0 ? '등록된 단원이 없습니다.' : null}
            >
              <div className="text-sm space-y-1.5">
                <SummaryRow label="정단원" value={`${members.filter((m) => !m.isReserve).length}명`} />
                <SummaryRow label="예비단원" value={`${members.filter((m) => m.isReserve).length}명`} />
                <SummaryRow label="전체" value={`${members.length}명`} bold />
              </div>
            </SummaryCard>

            {/* 연습 일정 */}
            <SummaryCard
              icon={<CalendarDays size={16} className="text-yellow-600" />}
              title="다음 연습 일정"
              onAll={() => goConcertTab('rehearsals')}
              empty={upcomingRehearsals.length === 0 ? '예정된 연습이 없습니다.' : null}
            >
              {upcomingRehearsals.slice(0, 3).map((r) => (
                <div key={r.id} className="text-sm">
                  <p className="font-medium text-gray-800">
                    {r.date} {r.time}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.place} · {r.type}
                  </p>
                </div>
              ))}
            </SummaryCard>

            {/* 예산 */}
            <SummaryCard
              icon={<Wallet size={16} className="text-purple-600" />}
              title="예산 현황"
              onAll={() => goConcertTab('budget')}
              empty={budgets.length === 0 ? '예산 항목이 없습니다.' : null}
            >
              <div className="text-sm space-y-1.5">
                <SummaryRow label="수입(실제)" value={`${totalActualIncome.toLocaleString()}원`} valueClass="text-green-600" />
                <SummaryRow label="지출(실제)" value={`${totalActualExpense.toLocaleString()}원`} valueClass="text-red-600" />
                <SummaryRow
                  label="잔액"
                  value={`${(totalActualIncome - totalActualExpense).toLocaleString()}원`}
                  valueClass={(totalActualIncome - totalActualExpense) >= 0 ? 'text-green-600' : 'text-red-600'}
                  bold
                />
              </div>
            </SummaryCard>
          </div>
        </>
      ) : (
        <div className="card p-12 text-center text-gray-400">
          <Music2 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">연주회를 선택하면 상세 요약이 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card p-4">
      <div className={`p-2 rounded-lg w-fit ${bg}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900 mt-3">{value}</p>
      <p className="text-sm text-gray-600 mt-0.5">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{note}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  onAll,
  footer,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  onAll: () => void;
  footer?: string;
  empty?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        <button onClick={onAll} className="text-xs text-[#2563eb] hover:underline">
          전체 보기
        </button>
      </div>
      {empty ? <p className="text-xs text-gray-400">{empty}</p> : <div className="space-y-2">{children}</div>}
      {footer && <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">{footer}</div>}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className={`flex justify-between ${bold ? 'pt-1 border-t border-gray-100' : ''}`}>
      <span className={`text-gray-600 ${bold ? 'font-medium' : ''}`}>{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} ${valueClass ?? 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
