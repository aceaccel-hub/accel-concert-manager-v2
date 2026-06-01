import { useEffect, useState } from 'react';
import { Music2, Users, CalendarDays, TrendingUp, Clock, MapPin, CheckSquare } from 'lucide-react';
import { db } from '../../db/database';
import { useStore } from '../../store/store';
import type { Concert, ProgramItem, ConcertMember, Rehearsal, Budget, Checklist } from '../../types';
import StatusBadge from '../common/StatusBadge';

export default function Dashboard() {
  const { selectedConcertId, setSelectedConcertId, setCurrentPage, setCurrentTab } = useStore();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [concertMembers, setConcertMembers] = useState<ConcertMember[]>([]);
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null);

  useEffect(() => {
    const load = async () => {
      const allConcerts = await db.concerts.orderBy('date').reverse().toArray();
      setConcerts(allConcerts);

      let cid = selectedConcertId;
      if (!cid && allConcerts.length > 0) {
        const upcoming = allConcerts.find(c => c.date >= new Date().toISOString().split('T')[0] && c.status !== '취소');
        cid = upcoming?.id || allConcerts[0].id;
        setSelectedConcertId(cid);
      }

      if (cid) {
        const concert = allConcerts.find(c => c.id === cid) || null;
        setSelectedConcert(concert);
        setPrograms(await db.programItems.where('concertId').equals(cid).toArray());
        setConcertMembers(await db.concertMembers.where('concertId').equals(cid).toArray());
        setRehearsals(await db.rehearsals.where('concertId').equals(cid).toArray());
        setBudgets(await db.budgets.where('concertId').equals(cid).toArray());
        setChecklists(await db.checklists.where('concertId').equals(cid).toArray());
      }
    };
    load();
  }, [selectedConcertId]);

  const totalBudget = budgets.filter(b => b.type === '수입').reduce((s, b) => s + b.plannedAmount, 0);
  const totalPaid = budgets.filter(b => b.type === '지출').reduce((s, b) => s + b.paidAmount, 0);
  const checkedCount = checklists.filter(c => c.isDone).length;
  const checkRate = checklists.length > 0 ? Math.round(checkedCount / checklists.length * 100) : 0;

  const thisYear = new Date().getFullYear().toString();
  const yearConcerts = concerts.filter(c => c.date?.startsWith(thisYear));
  const activeConcerts = concerts.filter(c => c.status === '진행중' || c.status === '준비중');
  const doneConcerts = concerts.filter(c => c.status === '완료');
  const upcomingRehearsals = rehearsals.filter(r => r.date >= new Date().toISOString().split('T')[0]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-1">전체 연주회 현황을 한눈에 확인하세요</p>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Music2 className="text-indigo-600" />} label={`${thisYear}년 연주회`} value={`${yearConcerts.length}건`} color="indigo" note="전체 기준" />
        <StatCard icon={<TrendingUp className="text-yellow-600" />} label="진행/준비중" value={`${activeConcerts.length}건`} color="yellow" note="전체 기준" />
        <StatCard icon={<CheckSquare className="text-green-600" />} label="완료 연주회" value={`${doneConcerts.length}건`} color="green" note="전체 기준" />
        <StatCard icon={<CalendarDays className="text-blue-600" />} label="예정 연습" value={`${upcomingRehearsals.length}회`} color="blue" note="선택 연주회 기준" />
      </div>

      {/* 연주회 선택 */}
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">연주회 선택</h2>
        <div className="flex gap-2 flex-wrap">
          {concerts.slice(0, 6).map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedConcertId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                selectedConcertId === c.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {selectedConcert && (
        <>
          {/* 선택 연주회 기본 정보 */}
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={selectedConcert.status} />
                  <span className="text-xs text-gray-400">선택된 연주회</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{selectedConcert.title}</h2>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5"><CalendarDays size={14} />{selectedConcert.date} {selectedConcert.time}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={14} />{selectedConcert.place}</span>
                  <span className="flex items-center gap-1.5"><Users size={14} />단원 {concertMembers.filter(m => !m.isReserve).length}명</span>
                  {selectedConcert.expectedDuration && (
                    <span className="flex items-center gap-1.5"><Clock size={14} />{selectedConcert.expectedDuration}분 예정</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setCurrentPage('concerts'); }}
                className="btn-secondary text-xs"
              >
                상세 보기
              </button>
            </div>

            {/* 준비 진행률 */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>체크리스트 진행률</span>
                <span>{checkRate}% ({checkedCount}/{checklists.length})</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${checkRate}%` }} />
              </div>
            </div>
          </div>

          {/* 요약 카드 4개 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 곡목 요약 */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">📋 곡목 요약</h3>
                <button onClick={() => { setCurrentPage('concerts'); setCurrentTab('곡목'); }} className="text-xs text-indigo-600 hover:underline">전체 보기</button>
              </div>
              {programs.length === 0 ? (
                <p className="text-xs text-gray-400">등록된 곡목이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {programs.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 w-5 shrink-0">{p.order}.</span>
                      <span className="flex-1 font-medium text-gray-800 truncate">{p.composer} - {p.title}</span>
                      <span className="text-xs text-gray-400 ml-2">{p.duration}분</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                총 {programs.reduce((s, p) => s + (p.duration || 0), 0)}분 · {programs.length}곡
              </div>
            </div>

            {/* 단원 현황 */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">👥 단원 현황</h3>
                <button onClick={() => { setCurrentPage('concerts'); setCurrentTab('단원'); }} className="text-xs text-indigo-600 hover:underline">전체 보기</button>
              </div>
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">정단원</span>
                  <span className="font-medium">{concertMembers.filter(m => !m.isReserve).length}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예비단원</span>
                  <span className="font-medium">{concertMembers.filter(m => m.isReserve).length}명</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">전체</span>
                  <span className="font-bold text-indigo-600">{concertMembers.length}명</span>
                </div>
              </div>
            </div>

            {/* 연습 일정 */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">📅 연습 일정</h3>
                <button onClick={() => { setCurrentPage('concerts'); setCurrentTab('연습'); }} className="text-xs text-indigo-600 hover:underline">전체 보기</button>
              </div>
              {upcomingRehearsals.length === 0 ? (
                <p className="text-xs text-gray-400">예정된 연습이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingRehearsals.slice(0, 3).map(r => (
                    <div key={r.id} className="text-sm">
                      <p className="font-medium text-gray-800">{r.date} {r.time}</p>
                      <p className="text-xs text-gray-500">{r.place} · {r.type}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 예산 현황 */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">💰 예산 현황</h3>
                <button onClick={() => { setCurrentPage('concerts'); setCurrentTab('예산'); }} className="text-xs text-indigo-600 hover:underline">상세 보기</button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">총 예산</span>
                  <span className="font-medium">{totalBudget.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">집행액</span>
                  <span className="font-medium text-red-600">{totalPaid.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-gray-600 font-medium">잔여 예산</span>
                  <span className="font-bold text-green-600">{(totalBudget - totalPaid).toLocaleString()}원</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: totalBudget > 0 ? `${Math.min(100, totalPaid / totalBudget * 100)}%` : '0%' }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, note }: { icon: React.ReactNode; label: string; value: string; color: string; note: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-${color}-50`}>{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{note}</p>
      </div>
    </div>
  );
}
