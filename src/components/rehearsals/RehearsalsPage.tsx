import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  LayoutList,
  Calendar,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useStore } from '../../store/store';
import { db } from '../../db/database';
import type { Concert, Rehearsal } from '../../types';
import { getAllConcerts } from '../../hooks/useConcert';
import { getRehearsals } from '../../hooks/useRehearsals';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

const TYPE_COLORS: Record<string, string> = {
  섹션연습: 'bg-blue-100 text-blue-700',
  합주연습: 'bg-purple-100 text-purple-700',
  드레스리허설: 'bg-pink-100 text-pink-700',
  기타: 'bg-gray-100 text-gray-600',
};

type RehearsalWithConcert = Rehearsal & { concert?: Concert };

// ---------- Calendar View ----------
function CalendarView({
  rehearsals,
  onNavigate,
}: {
  rehearsals: RehearsalWithConcert[];
  onNavigate: (concertId: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<RehearsalWithConcert | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  const forDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return rehearsals.filter((r) => r.date === dayStr);
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-semibold text-gray-900">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-medium
                ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {days.map((day, i) => {
            const dayItems = forDay(day);
            const isToday = isSameDay(day, today);
            const inMonth = isSameMonth(day, currentMonth);
            const sun = day.getDay() === 0;
            const sat = day.getDay() === 6;

            return (
              <div
                key={i}
                className={`min-h-[88px] p-1.5 ${!inMonth ? 'bg-gray-50/60' : ''}`}
              >
                <div
                  className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full font-medium
                    ${isToday ? 'bg-[#2563eb] text-white' : ''}
                    ${!isToday && sun ? 'text-red-400' : ''}
                    ${!isToday && sat ? 'text-blue-400' : ''}
                    ${!isToday && !sun && !sat ? (inMonth ? 'text-gray-700' : 'text-gray-300') : ''}`}
                >
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5">
                  {dayItems.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium
                        ${TYPE_COLORS[r.type] ?? 'bg-gray-100 text-gray-600'}`}
                      title={`${r.time} ${(r.targetPieces ?? [])[0] ?? r.place}`}
                    >
                      {r.time && (
                        <span className="mr-1 opacity-70">{r.time.slice(0, 5)}</span>
                      )}
                      {(r.targetPieces ?? [])[0] ?? r.type}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal
          title={`연습 상세 — ${selected.date}`}
          onClose={() => setSelected(null)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setSelected(null)}>
                닫기
              </button>
              {selected.concert && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    onNavigate(selected.concertId);
                    setSelected(null);
                  }}
                >
                  연주회로 이동
                </button>
              )}
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`badge text-xs ${TYPE_COLORS[selected.type] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {selected.type}
              </span>
              <span className="font-semibold">
                {selected.date} {selected.time}
              </span>
            </div>
            {selected.concert && (
              <p className="text-[#2563eb] text-xs font-medium">{selected.concert.title}</p>
            )}
            <div className="grid grid-cols-[72px_1fr] gap-y-2 text-xs text-gray-700">
              <span className="text-gray-400">장소</span>
              <span>{selected.place}</span>
              {selected.progressRate != null && (
                <>
                  <span className="text-gray-400">진행도</span>
                  <span>{selected.progressRate}%</span>
                </>
              )}
              {(selected.targetPieces ?? []).length > 0 && (
                <>
                  <span className="text-gray-400">대상곡</span>
                  <span>{selected.targetPieces!.join(', ')}</span>
                </>
              )}
              {selected.memo && (
                <>
                  <span className="text-gray-400">메모</span>
                  <span>{selected.memo}</span>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Main Page ----------
export default function RehearsalsPage() {
  const navigate = useNavigate();
  const { selectedConcertId } = useStore();
  const [rehearsals, setRehearsals] = useState<RehearsalWithConcert[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [scope, setScope] = useState<'selected' | 'all'>(
    selectedConcertId ? 'selected' : 'all'
  );
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const load = async () => {
    const cs = await getAllConcerts();
    setConcerts(cs);

    if (scope === 'selected' && selectedConcertId) {
      const rs = await getRehearsals(selectedConcertId);
      const concert = cs.find((c) => c.id === selectedConcertId);
      setRehearsals(rs.map((r) => ({ ...r, concert })));
    } else {
      const rs = await db.rehearsals.toArray();
      rs.sort((a, b) => a.date.localeCompare(b.date));
      setRehearsals(
        rs.map((r) => ({ ...r, concert: cs.find((c) => c.id === r.concertId) }))
      );
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedConcertId]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = rehearsals.filter((r) => r.date >= today);
  const past = rehearsals.filter((r) => r.date < today);

  const selectedConcert = concerts.find((c) => c.id === selectedConcertId) ?? null;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">연습 일정</h1>
          <p className="text-sm text-gray-500 mt-1">
            {scope === 'selected' && selectedConcert
              ? `${selectedConcert.title}의 연습`
              : '전체 연주회의 연습 일정을 한눈에 확인하세요.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scope toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setScope('selected')}
              disabled={!selectedConcertId}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                scope === 'selected'
                  ? 'bg-[#2563eb] text-white border-[#2563eb]'
                  : 'bg-white text-gray-600 border-gray-300'
              } disabled:opacity-40`}
            >
              선택 연주회
            </button>
            <button
              onClick={() => setScope('all')}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                scope === 'all'
                  ? 'bg-[#2563eb] text-white border-[#2563eb]'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              전체
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutList size={13} />
              리스트 보기
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar size={13} />
              달력 보기
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {rehearsals.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p>등록된 연습 일정이 없습니다.</p>
          <p className="text-xs mt-2">연주회 상세 화면에서 연습을 추가하세요.</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          rehearsals={rehearsals}
          onNavigate={(cId) => navigate(`/concerts/${cId}/rehearsals`)}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">
                예정된 연습 ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((r) => (
                  <RehearsalRow
                    key={r.id}
                    r={r}
                    onClick={() => navigate(`/concerts/${r.concertId}/rehearsals`)}
                  />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">
                완료된 연습 ({past.length})
              </h2>
              <div className="space-y-2 opacity-75">
                {past.map((r) => (
                  <RehearsalRow
                    key={r.id}
                    r={r}
                    onClick={() => navigate(`/concerts/${r.concertId}/rehearsals`)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RehearsalRow({
  r,
  onClick,
}: {
  r: RehearsalWithConcert;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card p-4 w-full text-left hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-blue-50 text-blue-700">{r.type}</span>
            <span className="text-sm font-semibold">
              {r.date} {r.time}
            </span>
            {r.concert && <StatusBadge status={r.concert.status} />}
          </div>
          <p className="text-xs text-gray-500">{r.place}</p>
          {r.concert && (
            <p className="text-xs text-[#2563eb] mt-0.5 truncate">{r.concert.title}</p>
          )}
          {r.targetPieces && r.targetPieces.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              대상곡: {r.targetPieces.join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {r.progressRate != null && (
            <span className="text-xs text-gray-500">진행도 {r.progressRate}%</span>
          )}
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      </div>
    </button>
  );
}
