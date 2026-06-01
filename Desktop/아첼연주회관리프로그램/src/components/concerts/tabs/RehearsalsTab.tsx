import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import type {
  Rehearsal,
  RehearsalType,
  RehearsalAttendance,
  AttendanceStatus,
  ConcertMember,
  Member,
  Evaluation,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">연습 일정</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            예정 {upcoming.length}회 · 완료 {past.length}회
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 연습 추가
        </button>
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
              {r.date} {r.time}
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
          {r.memo && <p className="text-xs text-gray-400 mt-1 italic">{r.memo}</p>}
          {r.progressRate != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{ width: `${r.progressRate}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">진행도 {r.progressRate}%</span>
            </div>
          )}
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
    time: '',
    place: '',
    type: '합주연습' as RehearsalType,
    targetPieces: '',
    progressRate: 0,
    memo: '',
    conductorEvaluation: '' as Evaluation | '',
    nextTask: '',
  });

  useEffect(() => {
    if (item) {
      setForm({
        date: item.date,
        time: item.time,
        place: item.place,
        type: item.type,
        targetPieces: (item.targetPieces ?? []).join(', '),
        progressRate: item.progressRate ?? 0,
        memo: item.memo ?? '',
        conductorEvaluation: (item.conductorEvaluation ?? '') as Evaluation | '',
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
      time: form.time,
      place: form.place,
      type: form.type,
      targetPieces: form.targetPieces
        ? form.targetPieces.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      progressRate: form.progressRate,
      memo: form.memo,
      conductorEvaluation: (form.conductorEvaluation || undefined) as Evaluation | undefined,
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
        <div>
          <label className="label">시간</label>
          <input
            type="time"
            className="input"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
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
        <div>
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
        <div>
          <label className="label">진행도 (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            className="input"
            value={form.progressRate}
            onChange={(e) => setForm((f) => ({ ...f, progressRate: +e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="label">대상 곡목 (쉼표로 구분)</label>
          <input
            className="input"
            value={form.targetPieces}
            onChange={(e) => setForm((f) => ({ ...f, targetPieces: e.target.value }))}
            placeholder="Vivaldi - Four Seasons, Mozart - Symphony No.40"
          />
        </div>
        <div>
          <label className="label">지휘자 평가</label>
          <select
            className="input"
            value={form.conductorEvaluation}
            onChange={(e) =>
              setForm((f) => ({ ...f, conductorEvaluation: e.target.value as Evaluation | '' }))
            }
          >
            <option value="">선택 안 함</option>
            {(['상', '중', '하'] as Evaluation[]).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
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
          <label className="label">메모</label>
          <textarea
            className="input h-20 resize-none"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          />
        </div>
      </div>
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
