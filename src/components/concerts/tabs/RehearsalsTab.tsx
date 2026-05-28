import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Users, List, CalendarDays, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
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
import type { Rehearsal, ConcertMember, Member, RehearsalAttendance } from '../../../types';
import Modal from '../../common/Modal';

interface Props { concertId: string; }

export default function RehearsalsTab({ concertId }: Props) {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Rehearsal | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<Rehearsal | null>(null);
  const [detailTarget, setDetailTarget] = useState<Rehearsal | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const raw = await db.rehearsals.where('concertId').equals(concertId).toArray();
    const sorted = raw
      .map((r, idx) => ({ ...r, order: r.order ?? idx + 1 }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setRehearsals(sorted);
  };

  useEffect(() => { load(); }, [concertId]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = rehearsals.findIndex(r => r.id === active.id);
    const newIdx = rehearsals.findIndex(r => r.id === over.id);
    const reordered = arrayMove(rehearsals, oldIdx, newIdx).map((r, idx) => ({ ...r, order: idx + 1 }));
    setRehearsals(reordered);
    await Promise.all(reordered.map(r => db.rehearsals.put(r)));
    toast.success('연습 일정 순서가 변경되었습니다.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 연습 일정을 삭제하시겠습니까?')) return;
    await db.rehearsals.delete(id);
    await db.rehearsalAttendance.where('rehearsalId').equals(id).delete();
    load();
    toast.success('연습 일정이 삭제되었습니다.');
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = rehearsals.filter(r => r.date >= today);
  const past = rehearsals.filter(r => r.date < today);
  const activeReh = rehearsals.find(r => r.id === activeId);

  return (
    <div className="p-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">연습 일정</h2>
          <p className="text-xs text-gray-500 mt-0.5">예정 {upcoming.length}회 · 완료 {past.length}회 · 핸들(⠿)을 드래그해 순서 변경</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 토글 */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={13} /> 리스트
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarDays size={13} /> 달력
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> 연습 추가
          </button>
        </div>
      </div>

      {/* 뷰 렌더 */}
      {view === 'list' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <ListView
            rehearsals={rehearsals}
            today={today}
            activeId={activeId}
            onEdit={setEditItem}
            onDelete={handleDelete}
            onAttendance={setAttendanceTarget}
          />
          <DragOverlay>
            {activeReh && (
              <div className="card p-4 shadow-2xl opacity-95 bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-indigo-400" />
                  <span className="badge bg-indigo-100 text-indigo-700">{activeReh.type}</span>
                  <span className="text-sm font-semibold text-gray-900">{activeReh.date} {activeReh.time}</span>
                  <span className="text-sm text-gray-500">📍 {activeReh.place}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <CalendarView
          rehearsals={rehearsals}
          onDetail={setDetailTarget}
        />
      )}

      {/* 모달들 */}
      {(showAdd || editItem) && (
        <RehearsalForm
          concertId={concertId}
          item={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={() => { load(); setShowAdd(false); setEditItem(null); }}
        />
      )}
      {attendanceTarget && (
        <AttendanceModal
          rehearsal={attendanceTarget}
          concertId={concertId}
          onClose={() => setAttendanceTarget(null)}
          onSaved={() => { load(); setAttendanceTarget(null); }}
        />
      )}
      {detailTarget && (
        <RehearsalDetailModal
          rehearsal={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}

/* ─────── 리스트 뷰 ─────── */
function ListView({ rehearsals, today, activeId, onEdit, onDelete, onAttendance }: {
  rehearsals: Rehearsal[];
  today: string;
  activeId: string | null;
  onEdit: (r: Rehearsal) => void;
  onDelete: (id: string) => void;
  onAttendance: (r: Rehearsal) => void;
}) {
  const upcoming = rehearsals.filter(r => r.date >= today);
  const past = rehearsals.filter(r => r.date < today);

  if (rehearsals.length === 0) {
    return <div className="card p-12 text-center text-gray-400">등록된 연습 일정이 없습니다.</div>;
  }

  return (
    <SortableContext items={rehearsals.map(r => r.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-4">
        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">📅 예정된 연습</p>
            <div className="space-y-2">
              {upcoming.map(r => (
                <SortableRehearsalCard key={r.id} r={r} isDragging={activeId === r.id} onEdit={onEdit} onDelete={onDelete} onAttendance={onAttendance} />
              ))}
            </div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">✅ 완료된 연습</p>
            <div className="space-y-2 opacity-70">
              {past.map(r => (
                <SortableRehearsalCard key={r.id} r={r} isDragging={activeId === r.id} onEdit={onEdit} onDelete={onDelete} onAttendance={onAttendance} />
              ))}
            </div>
          </div>
        )}
      </div>
    </SortableContext>
  );
}

/* ── Sortable Rehearsal Card ── */
function SortableRehearsalCard({ r, isDragging, onEdit, onDelete, onAttendance }: {
  r: Rehearsal; isDragging: boolean;
  onEdit: (r: Rehearsal) => void;
  onDelete: (id: string) => void;
  onAttendance: (r: Rehearsal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: r.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`card p-4 ${isDragging ? 'bg-indigo-50 border-indigo-200' : ''}`}>
      <div className="flex items-start justify-between">
        {/* 드래그 핸들 */}
        <div
          {...attributes} {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mt-1 mr-2 shrink-0"
          title="드래그해서 순서 변경"
        >
          <GripVertical size={16} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-indigo-50 text-indigo-700">{r.type}</span>
            <span className="text-sm font-semibold text-gray-900">{r.date} {r.time}</span>
          </div>
          <p className="text-sm text-gray-600">📍 {r.place}</p>
          {r.targetPieces && r.targetPieces.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">🎵 {r.targetPieces.join(', ')}</p>
          )}
          {r.memo && <p className="text-xs text-gray-400 mt-1 italic">{r.memo}</p>}
          {r.progressRate != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${r.progressRate}%` }} />
              </div>
              <span className="text-xs text-gray-500">진행도 {r.progressRate}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <button onClick={() => onAttendance(r)} className="btn-secondary text-xs py-1 px-2"><Users size={12} /> 출석</button>
          <button onClick={() => onEdit(r)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─────── 달력 뷰 ─────── */
const TYPE_COLORS: Record<string, string> = {
  '섹션연습': 'bg-blue-500',
  '합주연습': 'bg-indigo-500',
  '드레스리허설': 'bg-purple-500',
  '기타': 'bg-gray-400',
};

function CalendarView({ rehearsals, onDetail }: {
  rehearsals: Rehearsal[];
  onDetail: (r: Rehearsal) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date().toISOString().split('T')[0];

  // 날짜별 연습 매핑
  const byDate: Record<string, Rehearsal[]> = {};
  rehearsals.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // 6주 맞추기
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card overflow-hidden">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {year}년 {month + 1}월
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {weekDays.map((d, i) => (
          <div key={d} className={`py-2 text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 칸 */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="min-h-[90px] border-r border-b border-gray-100 bg-gray-50/50" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRehearsals = byDate[dateStr] || [];
          const isToday = dateStr === today;
          const isSunday = (firstDay + day - 1) % 7 === 0;
          const isSaturday = (firstDay + day - 1) % 7 === 6;

          return (
            <div
              key={dateStr}
              className={`min-h-[90px] border-r border-b border-gray-100 p-1.5 ${isToday ? 'bg-indigo-50/40' : ''}`}
            >
              {/* 날짜 숫자 */}
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                isToday ? 'bg-indigo-600 text-white' :
                isSunday ? 'text-red-400' :
                isSaturday ? 'text-blue-400' :
                'text-gray-700'
              }`}>
                {day}
              </div>

              {/* 연습 칩 */}
              <div className="space-y-0.5">
                {dayRehearsals.slice(0, 2).map(r => (
                  <button
                    key={r.id}
                    onClick={() => onDetail(r)}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-white text-[10px] font-medium truncate leading-tight ${TYPE_COLORS[r.type] || 'bg-gray-400'} hover:opacity-90 transition-opacity`}
                    title={`${r.time} ${r.targetPieces?.join(', ') || r.type}`}
                  >
                    {r.time} {r.targetPieces?.[0] ? r.targetPieces[0].split(' - ')[1] || r.targetPieces[0] : r.type}
                  </button>
                ))}
                {dayRehearsals.length > 2 && (
                  <p className="text-[10px] text-gray-400 pl-1">+{dayRehearsals.length - 2}개</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-xs text-gray-500">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────── 연습 상세 팝업 ─────── */
function RehearsalDetailModal({ rehearsal, onClose }: { rehearsal: Rehearsal; onClose: () => void; }) {
  return (
    <Modal title="연습 상세 정보" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="badge bg-indigo-50 text-indigo-700">{rehearsal.type}</span>
          <span className="text-sm font-semibold text-gray-900">{rehearsal.date} {rehearsal.time}</span>
        </div>
        <div className="space-y-2 text-sm">
          <InfoRow label="장소" value={rehearsal.place} />
          {rehearsal.targetPieces?.length ? <InfoRow label="대상 곡목" value={rehearsal.targetPieces.join(', ')} /> : null}
          {rehearsal.conductorEvaluation && <InfoRow label="지휘자 평가" value={rehearsal.conductorEvaluation} />}
          {rehearsal.progressRate != null && (
            <div>
              <p className="text-xs text-gray-500 mb-1">진행도</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${rehearsal.progressRate}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700">{rehearsal.progressRate}%</span>
              </div>
            </div>
          )}
          {rehearsal.nextTask && <InfoRow label="다음 과제" value={rehearsal.nextTask} />}
          {rehearsal.memo && <InfoRow label="메모" value={rehearsal.memo} />}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>닫기</button>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

/* ─────── 연습 추가/편집 폼 ─────── */
function RehearsalForm({ concertId, item, onClose, onSaved }: {
  concertId: string; item: Rehearsal | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: '', time: '', place: '', type: '합주연습' as Rehearsal['type'],
    targetPieces: '', progressRate: 0, memo: '', conductorEvaluation: '' as Rehearsal['conductorEvaluation'] | '', nextTask: '',
  });

  useEffect(() => {
    if (item) setForm({
      date: item.date, time: item.time, place: item.place, type: item.type,
      targetPieces: (item.targetPieces || []).join(', '),
      progressRate: item.progressRate || 0, memo: item.memo || '',
      conductorEvaluation: item.conductorEvaluation || '', nextTask: item.nextTask || '',
    });
  }, []);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date || !form.place) { toast.error('날짜와 장소를 입력해 주세요.'); return; }
    const data: Rehearsal = {
      id: item?.id || crypto.randomUUID(), concertId,
      date: form.date, time: form.time, place: form.place, type: form.type,
      targetPieces: form.targetPieces ? form.targetPieces.split(',').map(s => s.trim()) : [],
      progressRate: form.progressRate, memo: form.memo,
      conductorEvaluation: form.conductorEvaluation as Rehearsal['conductorEvaluation'] || undefined,
      nextTask: form.nextTask,
      createdAt: item?.createdAt || new Date().toISOString(),
    };
    if (item) await db.rehearsals.put(data);
    else await db.rehearsals.add(data);
    toast.success('연습 일정이 저장되었습니다.');
    onSaved();
  };

  return (
    <Modal title={item ? '연습 편집' : '연습 추가'} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">날짜 *</label><input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} /></div>
        <div><label className="label">시간</label><input type="time" className="input" value={form.time} onChange={e => set('time', e.target.value)} /></div>
        <div className="col-span-2"><label className="label">장소 *</label><input className="input" value={form.place} onChange={e => set('place', e.target.value)} /></div>
        <div>
          <label className="label">연습 유형</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {['섹션연습', '합주연습', '드레스리허설', '기타'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">진행도 (%)</label><input type="number" min="0" max="100" className="input" value={form.progressRate} onChange={e => set('progressRate', +e.target.value)} /></div>
        <div className="col-span-2"><label className="label">대상 곡목 (쉼표로 구분)</label><input className="input" value={form.targetPieces} onChange={e => set('targetPieces', e.target.value)} placeholder="Vivaldi - Four Seasons, Mozart - Symphony" /></div>
        <div>
          <label className="label">지휘자 평가</label>
          <select className="input" value={form.conductorEvaluation} onChange={e => set('conductorEvaluation', e.target.value)}>
            <option value="">선택 안 함</option>
            {['상', '중', '하'].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">다음 연습 과제</label><input className="input" value={form.nextTask} onChange={e => set('nextTask', e.target.value)} /></div>
        <div className="col-span-2"><label className="label">메모</label><textarea className="input h-20 resize-none" value={form.memo} onChange={e => set('memo', e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}

/* ─────── 출석 체크 모달 ─────── */
function AttendanceModal({ rehearsal, concertId, onClose, onSaved }: {
  rehearsal: Rehearsal; concertId: string; onClose: () => void; onSaved: () => void;
}) {
  const [members, setMembers] = useState<(ConcertMember & { member?: Member; attendance?: RehearsalAttendance })[]>([]);

  useEffect(() => {
    const load = async () => {
      const cms = await db.concertMembers.where('concertId').equals(concertId).toArray();
      const allMembers = await db.members.toArray();
      const attendances = await db.rehearsalAttendance.where('rehearsalId').equals(rehearsal.id).toArray();
      setMembers(cms.map(cm => ({
        ...cm,
        member: allMembers.find(m => m.id === cm.memberId),
        attendance: attendances.find(a => a.memberId === cm.memberId),
      })));
    };
    load();
  }, []);

  const setStatus = async (memberId: string, status: RehearsalAttendance['status']) => {
    const existing = members.find(m => m.memberId === memberId)?.attendance;
    if (existing) {
      await db.rehearsalAttendance.put({ ...existing, status });
    } else {
      await db.rehearsalAttendance.add({
        id: crypto.randomUUID(), rehearsalId: rehearsal.id, concertId, memberId, status,
      });
    }
    const allRehearsals = await db.rehearsals.where('concertId').equals(concertId).toArray();
    const attended = await db.rehearsalAttendance.where('concertId').equals(concertId).and(a => a.memberId === memberId && a.status === '출석').count();
    const rate = allRehearsals.length > 0 ? Math.round(attended / allRehearsals.length * 100) : 0;
    const cm = await db.concertMembers.where('concertId').equals(concertId).and(c => c.memberId === memberId).first();
    if (cm) await db.concertMembers.put({ ...cm, attendanceRate: rate });

    const all = await db.rehearsalAttendance.where('rehearsalId').equals(rehearsal.id).toArray();
    const allCms = await db.concertMembers.where('concertId').equals(concertId).toArray();
    const allMs = await db.members.toArray();
    setMembers(allCms.map(cm => ({
      ...cm,
      member: allMs.find(m => m.id === cm.memberId),
      attendance: all.find(a => a.memberId === cm.memberId),
    })));
  };

  const statusColors: Record<string, string> = {
    '출석': 'bg-green-100 text-green-700 border-green-200',
    '결석': 'bg-red-100 text-red-700 border-red-200',
    '지각': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    '조퇴': 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const presentCount = members.filter(m => m.attendance?.status === '출석').length;

  return (
    <Modal title={`출석 체크 — ${rehearsal.date} ${rehearsal.place}`} onClose={onClose} size="md">
      <p className="text-sm text-gray-500 mb-4">출석 {presentCount}명 / 전체 {members.length}명</p>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">{m.member?.name}</p>
              <p className="text-xs text-gray-500">{m.member?.instrument} · {m.part || m.member?.part}</p>
            </div>
            <div className="flex gap-1.5">
              {(['출석', '지각', '조퇴', '결석'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(m.memberId, s)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${m.attendance?.status === s ? statusColors[s] : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <button className="btn-primary" onClick={onSaved}>완료</button>
      </div>
    </Modal>
  );
}
