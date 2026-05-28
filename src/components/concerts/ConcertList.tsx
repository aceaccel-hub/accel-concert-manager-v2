import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, ChevronRight, Edit2, Trash2, Copy, MoreVertical } from 'lucide-react';
import { db } from '../../db/database';
import { useStore } from '../../store/store';
import type { Concert, Group } from '../../types';
import StatusBadge from '../common/StatusBadge';
import ConcertDetail from './ConcertDetail';
import ConcertForm from './ConcertForm';
import Modal from '../common/Modal';

export default function ConcertList() {
  const { selectedConcertId, setSelectedConcertId } = useStore();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('전체');
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [showForm, setShowForm] = useState(false);
  const [editConcert, setEditConcert] = useState<Concert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Concert | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const load = async () => {
    const all = await db.concerts.orderBy('date').reverse().toArray();
    setConcerts(all);
    setGroups(await db.groups.toArray());
    if (!selectedConcertId && all.length > 0) setSelectedConcertId(all[0].id);
  };

  useEffect(() => { load(); }, []);

  const years = ['전체', ...Array.from(new Set(concerts.map(c => c.date?.split('-')[0]).filter(Boolean))).sort().reverse()];
  const statuses = ['전체', '기획중', '준비중', '진행중', '완료', '취소'];

  const filtered = concerts.filter(c => {
    const matchYear = yearFilter === '전체' || c.date?.startsWith(yearFilter);
    const matchStatus = statusFilter === '전체' || c.status === statusFilter;
    const matchSearch = !search || c.title.includes(search) || c.place?.includes(search);
    return matchYear && matchStatus && matchSearch;
  });

  const selected = concerts.find(c => c.id === selectedConcertId);
  const getGroup = (id?: string) => groups.find(g => g.id === id);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.concerts.delete(deleteTarget.id);
    await db.programItems.where('concertId').equals(deleteTarget.id).delete();
    await db.concertMembers.where('concertId').equals(deleteTarget.id).delete();
    await db.rehearsals.where('concertId').equals(deleteTarget.id).delete();
    await db.budgets.where('concertId').equals(deleteTarget.id).delete();
    await db.documents.where('concertId').equals(deleteTarget.id).delete();
    await db.checklists.where('concertId').equals(deleteTarget.id).delete();
    await db.memos.where('concertId').equals(deleteTarget.id).delete();
    setDeleteTarget(null);
    setSelectedConcertId(null);
    load();
  };

  const handleDuplicate = async (concert: Concert) => {
    const newId = crypto.randomUUID();
    await db.concerts.add({ ...concert, id: newId, title: concert.title + ' (복사)', status: '기획중', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setOpenMenu(null);
    load();
  };

  if (view === 'detail' && selectedConcertId) {
    return <ConcertDetail onBack={() => setView('list')} onRefresh={load} />;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 목록 패널 */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">연주회</h2>
            <button onClick={() => setShowForm(true)} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={14} /> 새 연주회
            </button>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="input pl-8 text-xs py-1.5" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5">
            <select className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <select className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">연주회가 없습니다.</div>
          )}
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedConcertId(c.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors relative ${selectedConcertId === c.id ? 'bg-indigo-50 border-l-2 border-l-indigo-600' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-gray-400">{c.date}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={11} />{c.place}</p>
                </div>
                <div className="relative ml-2">
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === c.id ? null : c.id); }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {openMenu === c.id && (
                    <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-28">
                      <button onClick={e => { e.stopPropagation(); setEditConcert(c); setOpenMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"><Edit2 size={12} />편집</button>
                      <button onClick={e => { e.stopPropagation(); handleDuplicate(c); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"><Copy size={12} />복제</button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(c); setOpenMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 text-red-600 flex items-center gap-2"><Trash2 size={12} />삭제</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 패널 */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={selected.status} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{selected.title}</h1>
              </div>
              <button onClick={() => setView('detail')} className="btn-primary">
                상세 관리 <ChevronRight size={16} />
              </button>
            </div>

            <div className="card p-5 grid grid-cols-2 gap-4">
              <InfoRow label="날짜" value={`${selected.date} ${selected.time}`} />
              <InfoRow label="장소" value={selected.place} />
              <InfoRow label="지휘자" value={selected.conductor} />
              <InfoRow label="협연자" value={selected.coPerformer || '-'} />
              <InfoRow label="담당자" value={selected.manager || '-'} />
              <InfoRow label="단체" value={getGroup(selected.groupId)?.name || '-'} />
              <InfoRow label="예상 시간" value={selected.expectedDuration ? `${selected.expectedDuration}분` : '-'} />
              <InfoRow label="진행률" value={`${selected.progressRate}%`} />
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">준비 진행률</h3>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${selected.progressRate}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{selected.progressRate}% 완료</p>
            </div>

          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Music2 size={48} className="mx-auto mb-4 opacity-30" />
              <p>연주회를 선택하세요</p>
            </div>
          </div>
        )}
      </div>

      {/* 새 연주회 / 편집 폼 */}
      {(showForm || editConcert) && (
        <ConcertForm
          concert={editConcert}
          onClose={() => { setShowForm(false); setEditConcert(null); }}
          onSaved={(id) => { load(); setSelectedConcertId(id); setShowForm(false); setEditConcert(null); }}
        />
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <Modal title="연주회 삭제" onClose={() => setDeleteTarget(null)} size="sm">
          <p className="text-sm text-gray-600 mb-2">다음 연주회를 삭제하시겠습니까?</p>
          <p className="font-semibold text-gray-900 mb-4">{deleteTarget.title}</p>
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-6">
            이 연주회와 연결된 곡목, 단원, 연습, 예산, 문서 연결 정보도 함께 삭제됩니다.<br />
            전체 곡목 DB와 전체 단원 DB는 삭제되지 않습니다.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>취소</button>
            <button className="btn-danger" onClick={handleDelete}>삭제</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value || '-'}</p>
    </div>
  );
}

function Music2({ size, className }: { size: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}
