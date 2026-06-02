import { useState, useEffect } from 'react';
import type { Concert, Group, ConcertStatus } from '../../types';
import Modal from '../common/Modal';
import { getAllGroups } from '../../hooks/useGroups';
import { createConcert, updateConcert, getAllConcerts, copyConcertData } from '../../hooks/useConcert';

interface Props {
  concert?: Concert | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}

const STATUSES: ConcertStatus[] = ['기획중', '준비중', '진행중', '완료', '취소'];

export default function ConcertForm({ concert, onClose, onSaved }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allConcerts, setAllConcerts] = useState<Concert[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '19:30',
    place: '',
    conductor: '',
    coPerformer: '',
    manager: '',
    status: '준비중' as ConcertStatus,
    groupId: '',
    expectedDuration: 120,
    note: '',
  });

  useEffect(() => {
    getAllGroups().then(setGroups);
    getAllConcerts().then(setAllConcerts);
    if (concert) {
      setForm({
        title: concert.title,
        date: concert.date,
        time: concert.time,
        place: concert.place,
        conductor: concert.conductor,
        coPerformer: concert.coPerformer ?? '',
        manager: concert.manager ?? '',
        status: concert.status,
        groupId: concert.groupId ?? '',
        expectedDuration: concert.expectedDuration ?? 120,
        note: concert.note ?? '',
      });
    }
  }, [concert]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleImport = () => {
    const src = allConcerts.find((c) => c.id === templateId);
    if (!src) return;
    setForm((f) => ({
      ...f,
      title: src.title,
      time: src.time,
      place: src.place,
      conductor: src.conductor,
      coPerformer: src.coPerformer ?? '',
      manager: src.manager ?? '',
      groupId: src.groupId ?? '',
      expectedDuration: src.expectedDuration ?? 120,
      note: src.note ?? '',
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.place) {
      alert('필수 입력값을 확인해 주세요. (연주회명, 날짜, 장소)');
      return;
    }
    const payload = {
      title: form.title,
      date: form.date,
      time: form.time,
      place: form.place,
      conductor: form.conductor,
      coPerformer: form.coPerformer || undefined,
      manager: form.manager || undefined,
      status: form.status,
      groupId: form.groupId || undefined,
      expectedDuration: form.expectedDuration,
      note: form.note || undefined,
    };
    if (concert) {
      await updateConcert(concert.id, payload);
      onSaved(concert.id);
    } else {
      const id = await createConcert(payload);
      if (templateId) {
        await copyConcertData(templateId, id);
      }
      onSaved(id);
    }
  };

  return (
    <Modal
      title={concert ? '연주회 편집' : '새 연주회 등록'}
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
        {!concert && (
          <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-2">기존 연주회 가져오기 (선택사항)</p>
            <div className="flex gap-2">
              <select
                className="input flex-1"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">-- 선택 안 함 --</option>
                {allConcerts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.date})
                  </option>
                ))}
              </select>
              <button className="btn-secondary whitespace-nowrap" onClick={handleImport}>
                가져오기
              </button>
            </div>
          </div>
        )}
        <div className="col-span-2">
          <label className="label">연주회명 *</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="제48회 아첼 정기연주회"
          />
        </div>
        <div>
          <label className="label">날짜 *</label>
          <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label">시간</label>
          <input type="time" className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">장소 *</label>
          <input
            className="input"
            value={form.place}
            onChange={(e) => set('place', e.target.value)}
            placeholder="예술의전당 콘서트홀"
          />
        </div>
        <div>
          <label className="label">지휘자</label>
          <input className="input" value={form.conductor} onChange={(e) => set('conductor', e.target.value)} />
        </div>
        <div>
          <label className="label">협연자</label>
          <input
            className="input"
            value={form.coPerformer}
            onChange={(e) => set('coPerformer', e.target.value)}
          />
        </div>
        <div>
          <label className="label">담당자</label>
          <input className="input" value={form.manager} onChange={(e) => set('manager', e.target.value)} />
        </div>
        <div>
          <label className="label">단체</label>
          <select className="input" value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
            <option value="">선택 안 함</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">상태</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => set('status', e.target.value as ConcertStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">예상 소요시간 (분)</label>
          <input
            type="number"
            className="input"
            value={form.expectedDuration}
            onChange={(e) => set('expectedDuration', +e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="label">비고</label>
          <textarea
            className="input h-20 resize-none"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
