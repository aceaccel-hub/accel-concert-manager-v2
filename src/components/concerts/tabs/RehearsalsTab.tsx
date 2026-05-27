import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import { db } from '../../../db/database';
import type { Rehearsal, ConcertMember, Member, RehearsalAttendance } from '../../../types';
import Modal from '../../common/Modal';

interface Props { concertId: string; }

export default function RehearsalsTab({ concertId }: Props) {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Rehearsal | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<Rehearsal | null>(null);

  const load = async () => {
    const data = await db.rehearsals.where('concertId').equals(concertId).sortBy('date');
    setRehearsals(data);
  };

  useEffect(() => { load(); }, [concertId]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 연습 일정을 삭제하시겠습니까?')) return;
    await db.rehearsals.delete(id);
    await db.rehearsalAttendance.where('rehearsalId').equals(id).delete();
    load();
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = rehearsals.filter(r => r.date >= today);
  const past = rehearsals.filter(r => r.date < today);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">연습 일정</h2>
          <p className="text-xs text-gray-500 mt-0.5">예정 {upcoming.length}회 · 완료 {past.length}회</p>
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
              <p className="text-xs font-medium text-gray-500 mb-2">📅 예정된 연습</p>
              <div className="space-y-2">
                {upcoming.map(r => <RehearsalCard key={r.id} r={r} onEdit={setEditItem} onDelete={handleDelete} onAttendance={setAttendanceTarget} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">✅ 완료된 연습</p>
              <div className="space-y-2 opacity-70">
                {past.map(r => <RehearsalCard key={r.id} r={r} onEdit={setEditItem} onDelete={handleDelete} onAttendance={setAttendanceTarget} />)}
              </div>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}

function RehearsalCard({ r, onEdit, onDelete, onAttendance }: {
  r: Rehearsal;
  onEdit: (r: Rehearsal) => void;
  onDelete: (id: string) => void;
  onAttendance: (r: Rehearsal) => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
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

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.date || !form.place) { alert('날짜와 장소를 입력해 주세요.'); return; }
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
        <div>
          <label className="label">진행도 (%)</label>
          <input type="number" min="0" max="100" className="input" value={form.progressRate} onChange={e => set('progressRate', +e.target.value)} />
        </div>
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

    // 출석률 자동 계산
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
