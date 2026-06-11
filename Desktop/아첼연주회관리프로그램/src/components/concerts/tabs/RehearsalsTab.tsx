import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Edit2, Users, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  Rehearsal,
  RehearsalType,
  RehearsalAttendance,
  AttendanceStatus,
  ConcertMember,
  Member,
  Evaluation,
  ProgramItem,
} from '../../../types';
import Modal from '../../common/Modal';
import {
  getRehearsals,
  createRehearsal,
  updateRehearsal,
  deleteRehearsal,
  getAttendance,
  recordAttendance,
} from '../../../hooks/useRehearsals';
import { getConcertMembers } from '../../../hooks/useMembers';
import { getProgramItems } from '../../../hooks/useProgram';
import type { ConcertTabContext } from '../ConcertDetail';

const REHEARSAL_TYPES: RehearsalType[] = ['섹션연습', '합주연습', '드레스리허설', '기타'];
const today = () => new Date().toISOString().split('T')[0];

export default function RehearsalsTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Rehearsal | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<Rehearsal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rehearsal | null>(null);
  const [view, setView] = useState<'일정' | '달력' | '출석기록부'>('일정');

  const load = async () => {
    setRehearsals(await getRehearsals(concertId));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRehearsal(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const t = today();
  const upcoming = rehearsals.filter((r) => r.date >= t);
  const past = rehearsals.filter((r) => r.date < t);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 border-b border-gray-200">
          {(['일정', '달력', '출석기록부'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                view === v
                  ? 'text-blue-600 border-b-blue-600'
                  : 'text-gray-500 border-b-transparent hover:text-gray-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 연습 추가
        </button>
      </div>

      {view === '일정' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              예정 {upcoming.length}회 · 완료 {past.length}회
            </p>
          </div>

          {rehearsals.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">등록된 연습 일정이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">예정된 연습</p>
                  <div className="space-y-2">
                    {upcoming.map((r) => (
                      <RehearsalCard
                        key={r.id}
                        r={r}
                        onEdit={setEditItem}
                        onDelete={setDeleteTarget}
                        onAttendance={setAttendanceTarget}
                      />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">완료된 연습</p>
                  <div className="space-y-2 opacity-70">
                    {past.map((r) => (
                      <RehearsalCard
                        key={r.id}
                        r={r}
                        onEdit={setEditItem}
                        onDelete={setDeleteTarget}
                        onAttendance={setAttendanceTarget}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === '달력' && (
        <CalendarView
          rehearsals={rehearsals}
          onEdit={setEditItem}
          onDelete={setDeleteTarget}
          onAttendance={setAttendanceTarget}
        />
      )}

      {view === '출석기록부' && <AttendanceReportView rehearsals={rehearsals} concertId={concertId} />}

      {(showAdd || editItem) && (
        <RehearsalForm
          concertId={concertId}
          item={editItem}
          onClose={() => {
            setShowAdd(false);
            setEditItem(null);
          }}
          onSaved={() => {
            load();
            setShowAdd(false);
            setEditItem(null);
          }}
        />
      )}

      {attendanceTarget && (
        <AttendanceModal
          rehearsal={attendanceTarget}
          concertId={concertId}
          onClose={() => setAttendanceTarget(null)}
        />
      )}

      {deleteTarget && (
        <Modal
          title="연습 삭제"
          onClose={() => setDeleteTarget(null)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                취소
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                삭제
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            <span className="font-semibold">
              {deleteTarget.date} {deleteTarget.time}
            </span>{' '}
            연습을 삭제하시겠습니까?
          </p>
          <p className="text-xs text-gray-500 mt-2">이 연습의 출석 기록도 함께 정리됩니다.</p>
        </Modal>
      )}
    </div>
  );
}

function RehearsalCard({
  r,
  onEdit,
  onDelete,
  onAttendance,
}: {
  r: Rehearsal;
  onEdit: (r: Rehearsal) => void;
  onDelete: (r: Rehearsal) => void;
  onAttendance: (r: Rehearsal) => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-blue-50 text-blue-700">{r.type}</span>
            <span className="text-sm font-semibold text-gray-900">
              {r.date}{' '}
              {r.startTime && r.endTime
                ? `${r.startTime} ~ ${r.endTime}`
                : r.startTime
                  ? r.startTime
                  : r.time}
            </span>
            {r.conductorEvaluation && (
              <span className="badge bg-yellow-50 text-yellow-700">
                평가 {r.conductorEvaluation}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{r.place}</p>
          {r.targetPieces && r.targetPieces.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">대상곡: {r.targetPieces.join(', ')}</p>
          )}
          {r.dressCode && <p className="text-xs text-gray-500 mt-1">복장: {r.dressCode}</p>}
          {r.equipmentMemo && <p className="text-xs text-gray-500 mt-1">준비물: {r.equipmentMemo}</p>}
          {r.memo && <p className="text-xs text-gray-400 mt-1 italic">{r.memo}</p>}
        </div>
        <div className="flex items-center gap-1.5 ml-4 shrink-0">
          <button onClick={() => onAttendance(r)} className="btn-secondary text-xs py-1 px-2">
            <Users size={12} /> 출석
          </button>
          <button onClick={() => onEdit(r)} className="text-gray-400 hover:text-[#2563eb]">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(r)} className="text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableTargetPieceItem({
  piece,
  onRemove,
}: {
  piece: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: piece,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100"
    >
      <span
        {...attributes}
        {...listeners}
        className="flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </span>
      <span className="text-sm text-gray-700 flex-1">{piece}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-400 hover:text-red-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function SortableTargetPieces({
  pieces,
  onChange,
  onRemove,
}: {
  pieces: string[];
  onChange: (pieces: string[]) => void;
  onRemove: (piece: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = pieces.indexOf(active.id as string);
    const newIdx = pieces.indexOf(over.id as string);
    const reordered = arrayMove(pieces, oldIdx, newIdx);
    onChange(reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pieces} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {pieces.map((piece) => (
            <SortableTargetPieceItem
              key={piece}
              piece={piece}
              onRemove={() => onRemove(piece)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function RehearsalForm({
  concertId,
  item,
  onClose,
  onSaved,
}: {
  concertId: string;
  item: Rehearsal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    place: '',
    type: '합주연습' as RehearsalType,
    targetPieces: [] as string[],
    progressRate: 0,
    memo: '',
    dressCode: '',
    equipmentMemo: '',
    nextTask: '',
  });
  const [showPiecesPicker, setShowPiecesPicker] = useState(false);
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setProgramItems(await getProgramItems(concertId));
    };
    load();
  }, [concertId]);

  useEffect(() => {
    if (item) {
      setForm({
        date: item.date,
        startTime: item.startTime || item.time || '',
        endTime: item.endTime || '',
        place: item.place,
        type: item.type,
        targetPieces: item.targetPieces ?? [],
        progressRate: item.progressRate ?? 0,
        memo: item.memo ?? '',
        dressCode: item.dressCode ?? '',
        equipmentMemo: item.equipmentMemo ?? '',
        nextTask: item.nextTask ?? '',
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!form.date || !form.place) {
      alert('날짜와 장소를 입력해 주세요.');
      return;
    }
    const payload = {
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      time: form.startTime,
      place: form.place,
      type: form.type,
      targetPieces: form.targetPieces,
      progressRate: form.progressRate,
      memo: form.memo,
      dressCode: form.dressCode,
      equipmentMemo: form.equipmentMemo,
      nextTask: form.nextTask,
    };
    if (item) {
      await updateRehearsal(item.id, payload);
    } else {
      await createRehearsal(concertId, payload);
    }
    onSaved();
  };

  return (
    <Modal
      title={item ? '연습 편집' : '연습 추가'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" onClick={handleSave}>
            저장
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">날짜 *</label>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <div />
        <div>
          <label className="label">시작 시간</label>
          <input
            type="time"
            className="input"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">종료 시간</label>
          <input
            type="time"
            className="input"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="label">장소 *</label>
          <input
            className="input"
            value={form.place}
            onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="label">연습 유형</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RehearsalType }))}
          >
            {REHEARSAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">대상 곡목</label>
          <p className="text-xs text-gray-500 mb-2">{form.targetPieces.length}개 선택됨</p>
          <div className="border border-gray-300 rounded-lg p-3 space-y-2 bg-white">
            {form.targetPieces.length > 0 ? (
              <SortableTargetPieces
                pieces={form.targetPieces}
                onChange={(newPieces) => setForm((f) => ({ ...f, targetPieces: newPieces }))}
                onRemove={(piece) => setForm((f) => ({
                  ...f,
                  targetPieces: f.targetPieces.filter((p) => p !== piece),
                }))}
              />
            ) : (
              <span className="text-sm text-gray-400">곡목을 선택하세요</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPiecesPicker(true)}
            className="w-full mt-2 text-center py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            곡목 추가/편집
          </button>
        </div>
        <div>
          <label className="label">다음 연습 과제</label>
          <input
            className="input"
            value={form.nextTask}
            onChange={(e) => setForm((f) => ({ ...f, nextTask: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="label">복장 (드레스 코드)</label>
          <input
            className="input"
            value={form.dressCode}
            onChange={(e) => setForm((f) => ({ ...f, dressCode: e.target.value }))}
            placeholder="정장 필수, 검은색 상의 등"
          />
        </div>
        <div className="col-span-2">
          <label className="label">지참 준비물</label>
          <input
            className="input"
            value={form.equipmentMemo}
            onChange={(e) => setForm((f) => ({ ...f, equipmentMemo: e.target.value }))}
            placeholder="악기, 악보, 메트로놈 등"
          />
        </div>
        <div className="col-span-2">
          <label className="label">메모</label>
          <textarea
            className="input h-20 resize-none"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          />
        </div>
      </div>

      {showPiecesPicker && (
        <Modal
          title="곡목 선택"
          onClose={() => setShowPiecesPicker(false)}
          size="md"
        >
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {programItems.length > 0 ? (
              programItems.map((item) => {
                const pieceTitle = `${item.composer} - ${item.title}`;
                const isSelected = form.targetPieces.includes(pieceTitle);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isSelected) {
                        setForm((f) => ({
                          ...f,
                          targetPieces: f.targetPieces.filter((p) => p !== pieceTitle),
                        }));
                      } else {
                        setForm((f) => ({
                          ...f,
                          targetPieces: [...f.targetPieces, pieceTitle],
                        }));
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.composer} - {item.title}</p>
                        {item.movement && <p className="text-xs text-gray-500">{item.movement}</p>}
                        {item.duration && <p className="text-xs text-gray-500">{item.duration}분</p>}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                이 연주회에 등록된 곡목이 없습니다.
              </p>
            )}
          </div>
        </Modal>
      )}
    </Modal>
  );
}

const statusBtnColors: Record<AttendanceStatus, string> = {
  출석: 'bg-green-100 text-green-700 border-green-200',
  결석: 'bg-red-100 text-red-700 border-red-200',
  지각: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  조퇴: 'bg-orange-100 text-orange-700 border-orange-200',
};

function AttendanceModal({
  rehearsal,
  concertId,
  onClose,
}: {
  rehearsal: Rehearsal;
  concertId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<
    (ConcertMember & { member: Member; attendance?: RehearsalAttendance })[]
  >([]);

  const load = async () => {
    const [members, atts] = await Promise.all([
      getConcertMembers(concertId),
      getAttendance(rehearsal.id),
    ]);
    setRows(
      members.map((m) => ({
        ...m,
        attendance: atts.find((a) => a.memberId === m.memberId),
      }))
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rehearsal.id]);

  const setStatus = async (memberId: string, status: AttendanceStatus) => {
    await recordAttendance(rehearsal.id, concertId, memberId, status);
    load();
  };

  const presentCount = rows.filter((r) => r.attendance?.status === '출석').length;

  return (
    <Modal
      title={`출석 체크 — ${rehearsal.date} ${rehearsal.place}`}
      onClose={onClose}
      size="md"
      footer={
        <button className="btn-primary" onClick={onClose}>
          완료
        </button>
      }
    >
      <p className="text-sm text-gray-500 mb-4">
        출석 {presentCount}명 / 전체 {rows.length}명
      </p>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{r.member?.name}</p>
              <p className="text-xs text-gray-500">
                {r.member?.instrument} · {r.part || r.member?.part}
              </p>
            </div>
            <div className="flex gap-1.5">
              {(['출석', '지각', '조퇴', '결석'] as AttendanceStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(r.memberId, s)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                    r.attendance?.status === s
                      ? statusBtnColors[s]
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            이 연주회에 등록된 단원이 없습니다.
          </p>
        )}
      </div>
    </Modal>
  );
}

function CalendarView({
  rehearsals,
  onEdit,
  onDelete,
  onAttendance,
}: {
  rehearsals: Rehearsal[];
  onEdit: (r: Rehearsal) => void;
  onDelete: (r: Rehearsal) => void;
  onAttendance: (r: Rehearsal) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthRehearsals = rehearsals.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const days: (number | null)[] = Array(startingDayOfWeek).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1))}>←</button>
        <h3 className="font-semibold text-gray-900">
          {year}년 {month + 1}월
        </h3>
        <button onClick={() => setCurrentDate(new Date(year, month + 1))}>→</button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayRehearsals = monthRehearsals.filter((r) => r.date === dateStr);

          return (
            <div
              key={idx}
              className={`min-h-20 p-1 rounded-lg border ${
                day ? 'bg-white border-gray-200' : 'bg-gray-50 border-transparent'
              }`}
            >
              {day && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">{day}</p>
                  {dayRehearsals.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onEdit(r)}
                      className="block w-full text-left text-xs p-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 truncate"
                    >
                      {r.startTime && r.endTime
                        ? `${r.startTime}~${r.endTime}`
                        : r.startTime || r.time}{' '}
                      {r.type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttendanceReportView({ rehearsals, concertId }: { rehearsals: Rehearsal[]; concertId: string }) {
  const [members, setMembers] = useState<(ConcertMember & { member: Member })[]>([]);
  const [attendance, setAttendance] = useState<RehearsalAttendance[]>([]);

  useEffect(() => {
    const load = async () => {
      const [m, ...atts] = await Promise.all([
        getConcertMembers(concertId),
        ...rehearsals.map((r) => getAttendance(r.id)),
      ]);
      setMembers(m);
      setAttendance(atts.flat());
    };
    load();
  }, [rehearsals, concertId]);

  const getStatus = (memberId: string, rehearsalId: string) => {
    return attendance.find((a) => a.memberId === memberId && a.rehearsalId === rehearsalId)?.status || '-';
  };

  const getAttendanceRate = (memberId: string) => {
    const total = sortedRehearsals.length;
    if (total === 0) return 0;
    const present = sortedRehearsals.filter((r) => getStatus(memberId, r.id) === '출석').length;
    return Math.round((present / total) * 100);
  };

  const sortedRehearsals = [...rehearsals].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 w-32">
              단원명
            </th>
            {sortedRehearsals.map((r) => (
              <th
                key={r.id}
                className="px-2 py-2 text-center text-xs font-medium text-gray-500 whitespace-nowrap border-l border-gray-200"
              >
                <div>{r.date.split('-')[2]}</div>
                <div className="text-gray-400">{r.time}</div>
              </th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 border-l border-gray-200 w-20">
              출석률
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                {m.member?.name}
              </td>
              {sortedRehearsals.map((r) => {
                const status = getStatus(m.memberId, r.id);
                const color =
                  status === '출석'
                    ? 'bg-green-50 text-green-700'
                    : status === '결석'
                      ? 'bg-red-50 text-red-700'
                      : status === '지각'
                        ? 'bg-yellow-50 text-yellow-700'
                        : status === '조퇴'
                          ? 'bg-orange-50 text-orange-700'
                          : 'bg-gray-50 text-gray-400';

                return (
                  <td key={r.id} className="px-2 py-2 text-center border-l border-gray-200">
                    <span className={`inline-block px-2 py-1 text-xs rounded ${color}`}>{status}</span>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-semibold text-gray-900 border-l border-gray-200 w-20">
                {getAttendanceRate(m.memberId)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
