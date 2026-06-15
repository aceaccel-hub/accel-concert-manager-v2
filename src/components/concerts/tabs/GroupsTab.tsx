import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import type { Group, ConcertGroup, GroupRole, GroupStatus } from '../../../types';
import Modal from '../../common/Modal';
import Combobox from '../../common/Combobox';
import {
  getAllGroups,
  getConcertGroups,
  addGroupToConcert,
  removeGroupFromConcert,
  updateGroup,
  createGroup,
} from '../../../hooks/useGroups';
import type { ConcertTabContext } from '../ConcertDetail';

type ConcertGroupFull = ConcertGroup & { group: Group };

const roleColors: Record<GroupRole, string> = {
  주최: 'bg-purple-50 text-purple-700',
  주관: 'bg-indigo-50 text-indigo-700',
  후원: 'bg-blue-50 text-blue-700',
  협력: 'bg-teal-50 text-teal-700',
  출연: 'bg-green-50 text-green-700',
  기획: 'bg-orange-50 text-orange-700',
};

const ROLES: GroupRole[] = ['주최', '주관', '후원', '협력', '출연', '기획'];

export default function GroupsTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [items, setItems] = useState<ConcertGroupFull[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ConcertGroupFull | null>(null);
  const [editTarget, setEditTarget] = useState<ConcertGroupFull | null>(null);

  const load = async () => {
    const [cgs, all] = await Promise.all([getConcertGroups(concertId), getAllGroups()]);
    setItems(cgs);
    setAllGroups(all);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    await removeGroupFromConcert(removeTarget.id);
    setRemoveTarget(null);
    load();
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
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${roleColors[item.role]}`}>{item.role}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.group?.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs text-gray-500 mt-2">
                  <span>유형: {item.group?.type || '-'}</span>
                  <span>대표: {item.group?.representative || '-'}</span>
                  <span>연락처: {item.group?.phone || '-'}</span>
                  <span>사업자: {item.group?.businessNumber || '-'}</span>
                </div>
                {item.group?.homepage && (
                  <p className="text-xs text-blue-500 mt-1">{item.group.homepage}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setEditTarget(item)}
                  className="text-gray-400 hover:text-blue-600"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setRemoveTarget(item)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddGroupModal
          concertId={concertId}
          allGroups={allGroups}
          existing={items.map((i) => i.groupId)}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            load();
            setShowAdd(false);
          }}
        />
      )}

      {editTarget && (
        <GroupEditModal
          group={editTarget.group}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            load();
            setEditTarget(null);
          }}
        />
      )}

      {removeTarget && (
        <Modal
          title="단체 제거"
          onClose={() => setRemoveTarget(null)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setRemoveTarget(null)}>
                취소
              </button>
              <button className="btn-danger" onClick={handleRemove}>
                제거
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{removeTarget.group?.name}</span> 단체를 이 연주회에서 제외하시겠습니까?
          </p>
          <p className="text-xs text-gray-500 mt-2">전체 단체 DB에서는 삭제되지 않습니다.</p>
        </Modal>
      )}
    </div>
  );
}

function AddGroupModal({
  concertId,
  allGroups,
  existing,
  onClose,
  onSaved,
}: {
  concertId: string;
  allGroups: Group[];
  existing: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const available = allGroups.filter((g) => !existing.includes(g.id));
  const [tab, setTab] = useState<'existing' | 'new'>('existing');

  // 기존 단체 연결 탭 state
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [role, setRole] = useState<GroupRole>('주최');

  // 새 단체 만들기 탭 state
  const [newForm, setNewForm] = useState({
    name: '',
    type: '',
    representative: '',
    manager: '',
    phone: '',
    email: '',
    homepage: '',
    address: '',
    businessNumber: '',
    regularSchedule: '',
    status: '운영중' as GroupStatus,
    note: '',
  });
  const [newRole, setNewRole] = useState<GroupRole>('주최');

  const getDefaultOptions = (field: string) => {
    const values = allGroups
      .map((g: any) => g[field])
      .filter((v: any) => v && typeof v === 'string');
    return [...new Set(values)];
  };

  const handleSaveExisting = async () => {
    if (!selectedGroupId) {
      alert('단체를 선택해 주세요.');
      return;
    }
    try {
      await addGroupToConcert(concertId, selectedGroupId, role);
      onSaved();
    } catch (e: any) {
      if (e?.message === 'ALREADY_IN_CONCERT') {
        alert('이미 연결된 단체입니다.');
      } else {
        alert('추가 실패: ' + (e?.message ?? '오류'));
      }
    }
  };

  const handleSaveNew = async () => {
    if (!newForm.name.trim()) {
      alert('단체명을 입력해 주세요.');
      return;
    }
    try {
      const newGroupId = await createGroup(newForm);
      await addGroupToConcert(concertId, newGroupId, newRole);
      onSaved();
    } catch (e: any) {
      alert('저장 실패: ' + (e?.message ?? '오류'));
    }
  };

  return (
    <Modal
      title="단체 추가"
      onClose={onClose}
      size={tab === 'new' ? 'lg' : 'sm'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            className="btn-primary"
            onClick={tab === 'existing' ? handleSaveExisting : handleSaveNew}
          >
            추가
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 탭 */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setTab('existing')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'existing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            기존 단체 연결
          </button>
          <button
            onClick={() => setTab('new')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'new'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            새 단체 만들기
          </button>
        </div>

        {/* 기존 단체 연결 탭 */}
        {tab === 'existing' && (
          <div className="space-y-4">
            <div>
              <label className="label">단체 선택</label>
              {available.length === 0 ? (
                <p className="text-sm text-gray-500">추가할 수 있는 단체가 없습니다.</p>
              ) : (
                <select
                  className="input"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">선택하세요</option>
                  {available.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="label">역할</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as GroupRole)}
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 새 단체 만들기 탭 */}
        {tab === 'new' && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  단체명 <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="단체명 입력"
                />
              </div>
              <div>
                <label className="label">유형</label>
                <Combobox
                  category="groupType"
                  value={newForm.type}
                  onChange={(val) => setNewForm((f) => ({ ...f, type: val }))}
                  defaultOptions={getDefaultOptions('type')}
                />
              </div>

              <div>
                <label className="label">대표자</label>
                <Combobox
                  category="representative"
                  value={newForm.representative}
                  onChange={(val) => setNewForm((f) => ({ ...f, representative: val }))}
                  defaultOptions={getDefaultOptions('representative')}
                />
              </div>
              <div>
                <label className="label">담당자</label>
                <Combobox
                  category="groupManager"
                  value={newForm.manager}
                  onChange={(val) => setNewForm((f) => ({ ...f, manager: val }))}
                  defaultOptions={getDefaultOptions('manager')}
                />
              </div>

              <div>
                <label className="label">연락처</label>
                <input
                  className="input"
                  value={newForm.phone}
                  onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="label">이메일</label>
                <input
                  className="input"
                  value={newForm.email}
                  onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="example@email.com"
                />
              </div>

              <div className="col-span-2">
                <label className="label">홈페이지</label>
                <input
                  className="input"
                  value={newForm.homepage}
                  onChange={(e) => setNewForm((f) => ({ ...f, homepage: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div className="col-span-2">
                <label className="label">주소</label>
                <input
                  className="input"
                  value={newForm.address}
                  onChange={(e) => setNewForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="주소 입력"
                />
              </div>

              <div>
                <label className="label">사업자등록번호</label>
                <Combobox
                  category="businessNumber"
                  value={newForm.businessNumber}
                  onChange={(val) => setNewForm((f) => ({ ...f, businessNumber: val }))}
                  defaultOptions={getDefaultOptions('businessNumber')}
                />
              </div>
              <div>
                <label className="label">정기 연습</label>
                <Combobox
                  category="regularSchedule"
                  value={newForm.regularSchedule}
                  onChange={(val) => setNewForm((f) => ({ ...f, regularSchedule: val }))}
                  defaultOptions={getDefaultOptions('regularSchedule')}
                />
              </div>

              <div>
                <label className="label">상태</label>
                <select
                  className="input"
                  value={newForm.status}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, status: e.target.value as GroupStatus }))
                  }
                >
                  <option value="운영중">운영중</option>
                  <option value="휴식중">휴식중</option>
                  <option value="해산">해산</option>
                </select>
              </div>
              <div>
                <label className="label">역할</label>
                <select
                  className="input"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as GroupRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="label">비고</label>
                <textarea
                  className="input h-16 resize-none"
                  value={newForm.note}
                  onChange={(e) => setNewForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="추가 사항 입력"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function GroupEditModal({
  group,
  onClose,
  onSaved,
}: {
  group: Group;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: group.name || '',
    type: group.type || '',
    phone: group.phone || '',
    email: group.email || '',
    representative: group.representative || '',
    homepage: group.homepage || '',
    businessNumber: group.businessNumber || '',
  });

  const handleSave = async () => {
    try {
      await updateGroup(group.id, form);
      onSaved();
    } catch (e: any) {
      alert('저장 실패: ' + (e?.message ?? '오류'));
    }
  };

  return (
    <Modal
      title="단체 정보 편집"
      onClose={onClose}
      size="sm"
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
      <div className="space-y-3">
        <div>
          <label className="label">단체명</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">유형</label>
          <input
            className="input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            placeholder="협회, 단체, 기관 등"
          />
        </div>
        <div>
          <label className="label">대표자</label>
          <input
            className="input"
            value={form.representative}
            onChange={(e) => setForm((f) => ({ ...f, representative: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">연락처</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="010-0000-0000"
          />
        </div>
        <div>
          <label className="label">이메일</label>
          <input
            className="input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="example@email.com"
          />
        </div>
        <div>
          <label className="label">홈페이지</label>
          <input
            className="input"
            value={form.homepage}
            onChange={(e) => setForm((f) => ({ ...f, homepage: e.target.value }))}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="label">사업자등록번호</label>
          <input
            className="input"
            value={form.businessNumber}
            onChange={(e) => setForm((f) => ({ ...f, businessNumber: e.target.value }))}
            placeholder="123-45-67890"
          />
        </div>
      </div>
    </Modal>
  );
}
