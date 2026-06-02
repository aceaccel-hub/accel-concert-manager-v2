import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Edit2 } from 'lucide-react';
import { useStore } from '../../store/store';
import type { Concert } from '../../types';
import StatusBadge from '../common/StatusBadge';
import ConcertForm from './ConcertForm';
import { getConcertById, updateConcert } from '../../hooks/useConcert';
import { getConcertMembers } from '../../hooks/useMembers';
import { getTotalDuration } from '../../hooks/useProgram';
import { formatDuration } from '../../utils/calculations';

const TABS: { path: string; label: string }[] = [
  { path: 'basic', label: '기본정보' },
  { path: 'program', label: '곡목' },
  { path: 'members', label: '단원' },
  { path: 'groups', label: '단체' },
  { path: 'rehearsals', label: '연습' },
  { path: 'budget', label: '예산' },
  { path: 'documents', label: '문서' },
  { path: 'memo', label: '메모' },
];

export default function ConcertDetail() {
  const { concertId } = useParams<{ concertId: string }>();
  const navigate = useNavigate();
  const { setSelectedConcertId } = useStore();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [checkRate, setCheckRate] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!concertId) return;
    setLoading(true);
    const c = await getConcertById(concertId);
    if (c) {
      const [members, duration] = await Promise.all([
        getConcertMembers(concertId),
        getTotalDuration(concertId),
      ]);
      if (duration !== c.expectedDuration) {
        c.expectedDuration = duration;
        await updateConcert(concertId, { expectedDuration: duration });
      }
      setMemberCount(members.filter((m) => !m.isReserve).length);
    }
    setConcert(c ?? null);
    setLoading(false);
  };

  // URL concertId → store 동기화 + 데이터 로드
  useEffect(() => {
    if (concertId) setSelectedConcertId(concertId);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">로딩 중...</div>
    );
  }

  if (!concert) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
        <p className="text-sm">존재하지 않는 연주회입니다.</p>
        <button className="btn-secondary text-xs" onClick={() => navigate('/concerts')}>
          연주회 목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate('/concerts')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={16} /> 연주회 목록
        </button>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={concert.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 truncate">{concert.title}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {concert.date} {concert.time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {concert.place}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                단원 {memberCount}명
              </span>
              {concert.expectedDuration ? (
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatDuration(concert.expectedDuration)} 예정{concert.intermissionDuration ? ` + 인터미션 ${concert.intermissionDuration}분` : ''}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">진행률</p>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563eb] rounded-full"
                    style={{ width: `${checkRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-[#2563eb]">{checkRate}%</span>
              </div>
            </div>
            <button onClick={() => setShowEdit(true)} className="btn-secondary ml-2">
              <Edit2 size={14} /> 편집
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <NavLink
            key={t.path}
            to={t.path}
            className={({ isActive }) => `tab whitespace-nowrap ${isActive ? 'active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* 탭 내용 (Outlet) */}
      <div className="flex-1 overflow-y-auto">
        <Outlet context={{ concert, reload: load }} />
      </div>

      {/* 편집 모달 */}
      {showEdit && (
        <ConcertForm
          concert={concert}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            load();
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * 자식 탭에서 사용할 context 헬퍼
 */
export interface ConcertTabContext {
  concert: Concert;
  reload: () => Promise<void> | void;
}
