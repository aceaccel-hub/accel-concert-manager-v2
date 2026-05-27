import { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, Star } from 'lucide-react';
import { db } from '../../../db/database';
import type { ConcertMember, Member } from '../../../types';
import Modal from '../../common/Modal';

interface Props { concertId: string; }
type ConcertMemberFull = ConcertMember & { member?: Member };

// 파트별 색상
const partColors: Record<string, string> = {
  'Violin 1': 'bg-blue-50 text-blue-700',
  'Violin 2': 'bg-indigo-50 text-indigo-700',
  'Viola': 'bg-purple-50 text-purple-700',
  'Cello': 'bg-pink-50 text-pink-700',
  'Bass': 'bg-rose-50 text-rose-700',
  '기타': 'bg-gray-50 text-gray-700',
};

export default function MembersTab({ concertId }: Props) {
  const [concertMembers, setConcertMembers] = useState<ConcertMemberFull[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showNewMember, setShowNewMember] = useState(false);

  const load = async () => {
    const cms = await db.concertMembers.where('concertId').equals(concertId).toArray();
    const members = await db.members.toArray();
    setAllMembers(members);
    setConcertMembers(cms.map(cm => ({ ...cm, member: members.find(m => m.id === cm.memberId) })));
  };

  useEffect(() => { load(); }, [concertId]);

  const handleRemove = async (id: string) => {
    if (!confirm('이 단원을 연주회에서 제외하시겠습니까?\n전체 단원 DB에서는 삭제되지 않습니다.')) return;
    await db.concertMembers.delete(id);
    load();
  };

  const toggleReserve = async (cm: ConcertMember) => {
    await db.concertMembers.put({ ...cm, isReserve: !cm.isReserve });
    load();
  };

  // 파트별 그룹핑
  const groupByPart: Record<string, ConcertMemberFull[]> = {};
  concertMembers.forEach(cm => {
    const part = cm.part || cm.member?.part || '기타';
    if (!groupByPart[part]) groupByPart[part] = [];
    groupByPart[part].push(cm);
  });

  const regularCount = concertMembers.filter(m => !m.isReserve).length;
  const reserveCount = concertMembers.filter(m => m.isReserve).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">단원 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">정단원 {regularCount}명 · 예비단원 {reserveCount}명</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowNewMember(true)}><Plus size={14} /> 새 단원 추가</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><UserPlus size={14} /> DB에서 불러오기</button>
        </div>
      </div>

      {/* 파트별 집계 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(groupByPart).map(([part, mbs]) => (
          <span key={part} className={`badge ${partColors[part] || 'bg-gray-50 text-gray-700'}`}>
            {part}: {mbs.filter(m => !m.isReserve).length}명
          </span>
        ))}
      </div>

      {concertMembers.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p>등록된 단원이 없습니다. 단원을 추가해 주세요.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">이름</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">악기</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">파트</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">역할</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">연락처</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">출석률</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">사례비</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">예비</th>
                <th className="w-16 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {concertMembers.map(cm => (
                <tr key={cm.id} className={`hover:bg-gray-50 ${cm.isReserve ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cm.member?.name || '(알 수 없음)'}
                    {cm.member?.role === '악장' && <Star size={12} className="inline ml-1 text-yellow-500" fill="currentColor" />}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cm.member?.instrument || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${partColors[cm.part || cm.member?.part || '기타'] || 'bg-gray-50 text-gray-600'}`}>
                      {cm.part || cm.member?.part || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cm.role || cm.member?.role || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{cm.member?.phone || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{cm.attendanceRate != null ? `${cm.attendanceRate}%` : '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{cm.fee ? `${cm.fee.toLocaleString()}원` : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleReserve(cm)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${cm.isReserve ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                    >
                      {cm.isReserve ? '예비' : '정'}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleRemove(cm.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddMemberFromDB
          concertId={concertId}
          existing={concertMembers.map(cm => cm.memberId)}
          allMembers={allMembers}
          onClose={() => setShowAdd(false)}
          onSaved={() => { load(); setShowAdd(false); }}
        />
      )}
      {showNewMember && (
        <NewMemberForm
          concertId={concertId}
          onClose={() => setShowNewMember(false)}
          onSaved={() => { load(); setShowNewMember(false); }}
        />
      )}
    </div>
  );
}

function AddMemberFromDB({ concertId, existing, allMembers, onClose, onSaved }: {
  concertId: string; existing: string[]; allMembers: Member[];
  onClose: () => void; onSaved: () => void;
}) {
  const available = allMembers.filter(m => !existing.includes(m.id));
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleAdd = async () => {
    await Promise.all(selected.map(memberId => {
      const m = allMembers.find(m => m.id === memberId)!;
      return db.concertMembers.add({
        id: crypto.randomUUID(), concertId, memberId,
        role: m.role, part: m.part, fee: m.baseFee, isReserve: false,
      });
    }));
    onSaved();
  };

  return (
    <Modal title="단원 DB에서 추가" onClose={onClose} size="md">
      {available.length === 0 ? (
        <p className="text-sm text-gray-500">추가할 수 있는 단원이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {available.map(m => (
            <label key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} className="rounded" />
              <div>
                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                <p className="text-xs text-gray-500">{m.instrument} · {m.part} · {m.role}</p>
              </div>
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleAdd} disabled={selected.length === 0}>
          {selected.length}명 추가
        </button>
      </div>
    </Modal>
  );
}

function NewMemberForm({ concertId, onClose, onSaved }: { concertId: string; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({ name: '', instrument: '', part: '', role: '일반단원' as Member['role'], phone: '', fee: 0 });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { alert('이름을 입력해 주세요.'); return; }
    const memberId = crypto.randomUUID();
    await db.members.add({ id: memberId, ...form, grade: '정단원', status: '활동중', createdAt: new Date().toISOString() });
    await db.concertMembers.add({ id: crypto.randomUUID(), concertId, memberId, role: form.role, part: form.part, fee: form.fee, isReserve: false });
    onSaved();
  };

  return (
    <Modal title="새 단원 추가" onClose={onClose} size="md">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">이름 *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label className="label">악기</label><input className="input" value={form.instrument} onChange={e => set('instrument', e.target.value)} /></div>
        <div><label className="label">파트</label><input className="input" value={form.part} onChange={e => set('part', e.target.value)} placeholder="Violin 1" /></div>
        <div>
          <label className="label">역할</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            {['악장', '수석', '부수석', '일반단원', '객원', '지휘자', '협연자'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="label">연락처</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label className="label">사례비 (원)</label><input type="number" className="input" value={form.fee} onChange={e => set('fee', +e.target.value)} /></div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
