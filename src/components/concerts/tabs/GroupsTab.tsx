import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../../../db/database';
import type { Group, ConcertGroup, GroupRole } from '../../../types';
import Modal from '../../common/Modal';

interface Props { concertId: string; }
type ConcertGroupFull = ConcertGroup & { group?: Group };

export default function GroupsTab({ concertId }: Props) {
  const [items, setItems] = useState<ConcertGroupFull[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    const cgs = await db.concertGroups.where('concertId').equals(concertId).toArray();
    const gs = await db.groups.toArray();
    setAllGroups(gs);
    setItems(cgs.map(cg => ({ ...cg, group: gs.find(g => g.id === cg.groupId) })));
  };

  useEffect(() => { load(); }, [concertId]);

  const handleRemove = async (id: string) => {
    if (!confirm('이 단체를 연주회에서 제외하시겠습니까?')) return;
    await db.concertGroups.delete(id);
    load();
  };

  const roleColors: Record<GroupRole, string> = {
    '주최': 'bg-purple-50 text-purple-700',
    '주관': 'bg-indigo-50 text-indigo-700',
    '후원': 'bg-blue-50 text-blue-700',
    '협력': 'bg-teal-50 text-teal-700',
    '출연': 'bg-green-50 text-green-700',
    '기획': 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">단체 관리</h2>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 단체 추가
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">연결된 단체가 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="card p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${roleColors[item.role]}`}>{item.role}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.group?.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-gray-500 mt-2">
                  <span>유형: {item.group?.type || '-'}</span>
                  <span>대표: {item.group?.representative || '-'}</span>
                  <span>연락처: {item.group?.phone || '-'}</span>
                </div>
                {item.group?.homepage && <p className="text-xs text-blue-500 mt-1">{item.group.homepage}</p>}
              </div>
              <button onClick={() => handleRemove(item.id)} className="text-gray-400 hover:text-red-600 ml-4">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddGroupModal
          concertId={concertId}
          allGroups={allGroups}
          existing={items.map(i => i.groupId)}
          onClose={() => setShowAdd(false)}
          onSaved={() => { load(); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function AddGroupModal({ concertId, allGroups, existing, onClose, onSaved }: {
  concertId: string; allGroups: Group[]; existing: string[];
  onClose: () => void; onSaved: () => void;
}) {
  const available = allGroups.filter(g => !existing.includes(g.id));
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [role, setRole] = useState<GroupRole>('주최');

  const handleSave = async () => {
    if (!selectedGroupId) { alert('단체를 선택해 주세요.'); return; }
    await db.concertGroups.add({ id: crypto.randomUUID(), concertId, groupId: selectedGroupId, role });
    onSaved();
  };

  return (
    <Modal title="단체 연결" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">단체 선택</label>
          {available.length === 0 ? (
            <p className="text-sm text-gray-500">추가할 수 있는 단체가 없습니다.</p>
          ) : (
            <select className="input" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
              <option value="">선택하세요</option>
              {available.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="label">역할</label>
          <select className="input" value={role} onChange={e => setRole(e.target.value as GroupRole)}>
            {(['주최', '주관', '후원', '협력', '출연', '기획'] as GroupRole[]).map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button className="btn-secondary" onClick={onClose}>취소</button>
        <button className="btn-primary" onClick={handleSave}>추가</button>
      </div>
    </Modal>
  );
}
