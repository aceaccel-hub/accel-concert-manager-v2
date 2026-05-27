import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Edit2 } from 'lucide-react';
import { db } from '../../db/database';
import { useStore } from '../../store/store';
import type { Concert } from '../../types';
import StatusBadge from '../common/StatusBadge';
import ConcertForm from './ConcertForm';
import ProgramTab from './tabs/ProgramTab';
import MembersTab from './tabs/MembersTab';
import GroupsTab from './tabs/GroupsTab';
import RehearsalsTab from './tabs/RehearsalsTab';
import BudgetTab from './tabs/BudgetTab';
import DocumentsTab from './tabs/DocumentsTab';
import ChecklistTab from './tabs/ChecklistTab';
import MemoTab from './tabs/MemoTab';
import BasicInfoTab from './tabs/BasicInfoTab';

const TABS = ['기본정보', '곡목', '단원', '단체', '연습', '예산', '문서', '체크리스트', '메모'];

interface Props { onBack: () => void; onRefresh: () => void; }

export default function ConcertDetail({ onBack, onRefresh }: Props) {
  const { selectedConcertId, currentTab, setCurrentTab } = useStore();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [checkRate, setCheckRate] = useState(0);

  const load = async () => {
    if (!selectedConcertId) return;
    const c = await db.concerts.get(selectedConcertId);
    setConcert(c || null);
    const members = await db.concertMembers.where('concertId').equals(selectedConcertId).toArray();
    setMemberCount(members.filter(m => !m.isReserve).length);
    const checks = await db.checklists.where('concertId').equals(selectedConcertId).toArray();
    setCheckRate(checks.length > 0 ? Math.round(checks.filter(c => c.isDone).length / checks.length * 100) : 0);
  };

  useEffect(() => { load(); }, [selectedConcertId]);

  if (!concert) return <div className="flex-1 flex items-center justify-center text-gray-400">로딩 중...</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={16} /> 연주회 목록
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={concert.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{concert.title}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Calendar size={14} />{concert.date} {concert.time}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} />{concert.place}</span>
              <span className="flex items-center gap-1.5"><Users size={14} />단원 {memberCount}명</span>
              {concert.expectedDuration && <span className="flex items-center gap-1.5"><Clock size={14} />{concert.expectedDuration}분 예정</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">체크리스트 완료율</p>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${checkRate}%` }} />
                </div>
                <span className="text-sm font-medium text-indigo-600">{checkRate}%</span>
              </div>
            </div>
            <button onClick={() => setShowEdit(true)} className="btn-secondary ml-2">
              <Edit2 size={14} /> 편집
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setCurrentTab(tab)} className={`tab whitespace-nowrap ${currentTab === tab ? 'active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="flex-1 overflow-y-auto">
        {currentTab === '기본정보' && <BasicInfoTab concert={concert} onRefresh={load} />}
        {currentTab === '곡목' && <ProgramTab concertId={concert.id} />}
        {currentTab === '단원' && <MembersTab concertId={concert.id} />}
        {currentTab === '단체' && <GroupsTab concertId={concert.id} />}
        {currentTab === '연습' && <RehearsalsTab concertId={concert.id} />}
        {currentTab === '예산' && <BudgetTab concertId={concert.id} />}
        {currentTab === '문서' && <DocumentsTab concertId={concert.id} concert={concert} />}
        {currentTab === '체크리스트' && <ChecklistTab concertId={concert.id} onRateChange={setCheckRate} />}
        {currentTab === '메모' && <MemoTab concertId={concert.id} />}
      </div>

      {showEdit && (
        <ConcertForm
          concert={concert}
          onClose={() => setShowEdit(false)}
          onSaved={() => { load(); onRefresh(); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
