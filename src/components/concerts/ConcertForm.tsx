import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import type { Concert, Group } from '../../types';
import Modal from '../common/Modal';
import { formatNumberInput, parseFormattedNumber } from '../../utils/calculations';

interface Props {
  concert?: Concert | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

export default function ConcertForm({ concert, onClose, onSaved }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({
    title: '', date: '', time: '19:30', place: '', conductor: '',
    coPerformer: '', manager: '', status: '준비중' as Concert['status'],
    groupId: '', expectedDuration: 120, progressRate: 0, note: '',
  });
  const [formattedDuration, setFormattedDuration] = useState('120');

  useEffect(() => {
    db.groups.toArray().then(setGroups);
    if (concert) {
      setForm({
        title: concert.title,
        date: concert.date,
        time: concert.time,
        place: concert.place,
        conductor: concert.conductor,
        coPerformer: concert.coPerformer || '',
        manager: concert.manager || '',
        status: concert.status,
        groupId: concert.groupId || '',
        expectedDuration: concert.expectedDuration || 120,
        progressRate: concert.progressRate,
        note: concert.note || '',
      });
      setFormattedDuration((concert.expectedDuration || 120).toString());
    }
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title || !form.date || !form.place) {
      alert('필수 입력값을 확인해 주세요. (연주회명, 날짜, 장소)');
      return;
    }
    const now = new Date().toISOString();
    const id = concert?.id || crypto.randomUUID();
    const data: Concert = {
      id, ...form, groupId: form.groupId || undefined,
      createdAt: concert?.createdAt || now, updatedAt: now,
    };
    if (concert) await db.concerts.put(data);
    else await db.concerts.add(data);
    onSaved(id);
  };

  return (
    <Modal title={concert ? '연주회 편집' : '새 연주회 등록'} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">연주회명 *</label>
          <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="제48회 아첼 정기연주회" />
        </div>
        <div>
          <label className="label">날짜 *</label>
          <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">시간</label>
          <input type="time" className="input" value={form.time} onChange={e => set('time', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">장소 *</label>
          <input className="input" value={form.place} onChange={e => set('place', e.target.value)} placeholder="예술의전당 콘서트홀" />
        </div>
        <div>
          <label className="label">지휘자</label>
          <input className="input" value={form.conductor} onChange={e => set('conductor', e.target.value)} />
        </div>
        <div>
          <label className="label">협연자</label>
          <input className="input" value={form.coPerformer} onChange={e => set('coPerformer', e.target.value)} />
        </div>
        <div>
          <label className="label">담당자</label>
          <input className="input" value={form.manager} onChange={e => set('manager', e.target.value)} />
        </div>
        <div>
          <label className="label">단체</label>
          <select className="input" value={form.groupId} onChange={e => set('groupId', e.target.value)}>
            <option value="">선택 안 함</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">상태</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {['기획중', '준비중', '진행중', '완료', '취소'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">예상 소요시간 (분)</label>
          <input type="text" className="input" value={formattedDuration} onChange={e => { const formatted = formatNumberInput(e.target.value); setFormattedDuration(formatted); set('expectedDuration', parseFormattedNumber(formatted)); }} />
        </div>
        <div className="col-span-2">
          <label className="label">비고</label>
          <textarea className="input h-20 resize-none" value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
