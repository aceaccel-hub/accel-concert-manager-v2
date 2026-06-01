import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Link2 } from 'lucide-react';
import type { Group, GroupRole, GroupStatus, Concert } from '../../types';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';
import {
  getAllGroups,
  createGroup,
  updateGroup,
  addGroupToConcert,
} from '../../hooks/useGroups';
import { db } from '../../db/database';
import { useStore } from '../../store/store';
import { getAllConcerts } from '../../hooks/useConcert';

export default function GroupsPage() {
  const navigate = useNavigate();
  const { setSelectedConcertId } = useStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [selected, setSelected] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [linkTarget, setLinkTarget] = useState<Group | null>(null);

  const load = async () => {
    setGroups(await getAllGroups());
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = groups.filter((g) => {
    const matchSearch = !search || g.name.includes(search) || g.type.includes(search);
    const matchStatus = statusFilter === '전체' || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.groups.delete(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(null);
    load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">전체 단체 DB</h2>
            <button
              className="btn-primary text-xs py-1.5 px-3"
              onClick={() => {
                setEditItem(null);
                setShowForm(true);
              }}
            >
              <Plus size={14} /> 추가
            </button>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              className="input pl-8 text-xs py-1.5"
              placeholder="단체명, 유형 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-full focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['전체', '운영중', '휴식중', '해산'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">단체가 없습니다.</p>
          )}
          {filtered.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelected(g)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selected?.id === g.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-500">{g.type}</p>
                </div>
                <StatusBadge status={g.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-xl space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-xl font-bold text-gray-900">{selected.name}</h1>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => setLinkTarget(selected)}>
                  <Link2 size={12} /> 연주회에 연결
                </button>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setEditItem(selected);
                    setShowForm(true);
                  }}
                >
                  <Edit2 size={12} /> 편집
                </button>
                <button className="btn-danger text-xs" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 size={12} /> 삭제
                </button>
              </div>
            </div>
            <div className="card p-5 grid grid-cols-2 gap-4">
              {[
                ['유형', selected.type],
                ['대표자', selected.representative || '-'],
                ['담당자', selected.manager || '-'],
                ['연락처', selected.phone || '-'],
                ['이메일', selected.email || '-'],
                ['홈페이지', selected.homepage || '-'],
                ['주소', selected.address || '-'],
                ['사업자등록번호', selected.businessNumber || '-'],
                ['상태', selected.status],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {selected.note && (
              <div className="card p-4">
                <p className="text-xs text-gray-500 mb-1">비고</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{selected.note}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">단체를 선택하세요</div>
        )}
      </div>

      {(showForm || editItem) && (
        <GroupForm
          item={editItem}
          onClose={() => {
            setShowForm(false);
            setEditItem(null);
          }}
          onSaved={() => {
            load();
            setShowForm(false);
            setEditItem(null);
          }}
        />
      )}

      {deleteTarget && (
        <Modal
          title="단체 삭제"
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
            <span className="font-semibold">{deleteTarget.name}</span>을 전체 단체 DB에서 삭제하시겠습니까?
          </p>
          <p className="text-xs text-orange-600 mt-2">
            이 단체와 연결된 연주회의 연결 정보는 그대로 유지됩니다.
          </p>
        </Modal>
      )}

      {linkTarget && (
        <LinkToConcertModal
          group={linkTarget}
          onClose={() => setLinkTarget(null)}
          onGo={(cid) => {
            setSelectedConcertId(cid);
            navigate(`/concerts/${cid}/groups`);
          }}
        />
      )}
    </div>
  );
}

function GroupForm({
  item,
  onClose,
  onSaved,
}: {
  item: Group | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
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

  useEffect(() => {
    if (item)
      setForm({
        name: item.name,
        type: item.type,
        representative: item.representative ?? '',
        manager: item.manager ?? '',
        phone: item.phone ?? '',
        email: item.email ?? '',
        homepage: item.homepage ?? '',
        address: item.address ?? '',
        businessNumber: item.businessNumber ?? '',
        regularSchedule: item.regularSchedule ?? '',
        status: item.status,
        note: item.note ?? '',
      });
  }, [item]);

  const handleSave = async () => {
    if (!form.name) {
      alert('단체명을 입력해 주세요.');
      return;
    }
    if (item) {
      await updateGroup(item.id, form);
    } else {
      await createGroup(form);
    }
    onSaved();
  };

  return (
    <Modal
      title={item ? '단체 편집' : '단체 추가'}
      onClose={onClose}
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
          <label className="label">단체명 *</label>
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
            placeholder="오케스트라, 합창단"
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
          <label className="label">담당자</label>
          <input
            className="input"
            value={form.manager}
            onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">연락처</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">이메일</label>
          <input
            className="input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="label">홈페이지</label>
          <input
            className="input"
            value={form.homepage}
            onChange={(e) => setForm((f) => ({ ...f, homepage: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="label">주소</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
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
        <div>
          <label className="label">정기 연습</label>
          <input
            className="input"
            value={form.regularSchedule}
            onChange={(e) => setForm((f) => ({ ...f, regularSchedule: e.target.value }))}
            placeholder="매주 토요일 오후 2시"
          />
        </div>
        <div>
          <label className="label">상태</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GroupStatus }))}
          >
            {(['운영중', '휴식중', '해산'] as GroupStatus[]).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">비고</label>
          <textarea
            className="input h-16 resize-none"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  );
}

function LinkToConcertModal({
  group,
  onClose,
  onGo,
}: {
  group: Group;
  onClose: () => void;
  onGo: (concertId: string) => void;
}) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [concertId, setConcertId] = useState('');
  const [role, setRole] = useState<GroupRole>('주최');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllConcerts().then(setConcerts);
  }, []);

  const handleAdd = async () => {
    if (!concertId) {
      alert('연주회를 선택하세요.');
      return;
    }
    try {
      await addGroupToConcert(concertId, group.id, role);
      onGo(concertId);
    } catch (e: any) {
      if (e?.message === 'ALREADY_IN_CONCERT') {
        setError('이 단체는 이미 해당 연주회에 연결되어 있습니다.');
      } else {
        setError('연결 실패: ' + (e?.message ?? '오류'));
      }
    }
  };

  return (
    <Modal
      title="연주회에 단체 연결"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" onClick={handleAdd}>
            연결
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700 mb-3">
        <span className="font-semibold">{group.name}</span>을 연결할 연주회와 역할을 선택하세요.
      </p>
      <div className="space-y-3">
        <div>
          <label className="label">연주회</label>
          <select className="input" value={concertId} onChange={(e) => setConcertId(e.target.value)}>
            <option value="">선택하세요</option>
            {concerts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.date})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">역할</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as GroupRole)}
          >
            {(['주최', '주관', '후원', '협력', '출연', '기획'] as GroupRole[]).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </Modal>
  );
}
