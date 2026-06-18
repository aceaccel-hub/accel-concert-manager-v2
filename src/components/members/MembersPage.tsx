import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, Star, PlusCircle } from 'lucide-react';
import type { Member, MemberRole, MemberGrade, MemberStatus, Concert } from '../../types';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';
import Combobox from '../common/Combobox';
import { showToast } from '../common/Toast';
import {
  getAllMembers,
  createMember,
  updateMember,
  addMemberToConcert,
} from '../../hooks/useMembers';
import { db } from '../../db/database';
import { useStore } from '../../store/store';
import { getAllConcerts } from '../../hooks/useConcert';
import { INSTRUMENT_OPTIONS, PART_OPTIONS_BY_INSTRUMENT, ROLE_OPTIONS } from '../../constants/memberOptions';
import { normalizeInstrumentName, getInstrumentBase, normalizeMemberInstrumentPart } from '../../utils/normalization';

// 부분 필터 옵션 (모든 parts의 union)
const PARTS = Array.from(
  new Set(Object.values(PART_OPTIONS_BY_INSTRUMENT).flat())
).sort((a, b) => {
  // 로마자 순서로 정렬 (I, II, III, IV)
  const order = ['I', 'II', 'III', 'IV'];
  const aIndex = order.indexOf(a);
  const bIndex = order.indexOf(b);
  if (aIndex === -1) return 1;
  if (bIndex === -1) return -1;
  return aIndex - bIndex;
});

export default function MembersPage() {
  const navigate = useNavigate();
  const { settings, setSelectedConcertId } = useStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [partFilter, setPartFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [selected, setSelected] = useState<Member | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [addToConcertTarget, setAddToConcertTarget] = useState<Member | null>(null);

  const load = async () => {
    setMembers(await getAllMembers());
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = members.filter((m) => {
    const matchSearch =
      !search || m.name.includes(search) || m.instrument.includes(search) || (m.part ?? '').includes(search);
    const matchPart = partFilter === '전체' || m.part === partFilter;
    const matchStatus = statusFilter === '전체' || m.status === statusFilter;
    return matchSearch && matchPart && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // 연결 테이블(concertMembers) 먼저 정리 후 마스터 삭제
    await db.concertMembers.where('memberId').equals(deleteTarget.id).delete();
    await db.rehearsalAttendance.where('memberId').equals(deleteTarget.id).delete();
    await db.members.delete(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(null);
    load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">전체 단원 DB</h2>
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
              placeholder="이름, 악기, 파트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className="text-xs border border-gray-300 rounded-lg px-1 py-1.5 focus:outline-none"
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
            >
              {['전체', ...PARTS].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              className="text-xs border border-gray-300 rounded-lg px-1 py-1.5 focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {['전체', '활동중', '휴식중', '탈퇴'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selected?.id === m.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    {m.name}
                    {m.role === '악장' && (
                      <Star size={12} className="text-yellow-500" fill="currentColor" />
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {m.instrument} · {m.part}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">단원이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-xl space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-xl font-bold text-gray-900">{selected.name}</h1>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-xs"
                  onClick={() => setAddToConcertTarget(selected)}
                >
                  <PlusCircle size={12} /> 연주회에 추가
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
                ['악기', selected.instrument],
                ['파트', selected.part || '-'],
                ['역할', selected.role],
                ['등급', selected.grade || '-'],
                ['연락처', selected.phone || '-'],
                ['이메일', selected.email || '-'],
                ['국적', selected.nationality || '-'],
                ['신분증 유형', selected.idNumberType || '-'],
                ['신분증 번호', selected.residentNumber || '-'],
                ['상태', selected.status],
                ['기본 사례비', selected.baseFee ? `${selected.baseFee.toLocaleString()}원` : '-'],
                ['가입일', selected.joinDate || '-'],
                ['은행', selected.bankName || '-'],
                ['계좌번호', selected.bankAccount || '-'],
                ['예금주명', selected.accountHolder || '-'],
                ['예금주 관계', selected.accountHolderRelation || '-'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-gray-500">{l}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{v || '-'}</p>
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
          <div className="h-full flex items-center justify-center text-gray-400">단원을 선택하세요</div>
        )}
      </div>

      {(showForm || editItem) && (
        <MemberForm
          item={editItem}
          allMembers={members}
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
          title="단원 삭제"
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
            <span className="font-semibold">{deleteTarget.name}</span>을 전체 단원 DB에서 삭제하시겠습니까?
          </p>
          <p className="text-xs text-orange-600 mt-2">
            이 단원의 과거 연주회 참여 이력 행은 dangling 상태가 되어 표시되지 않게 됩니다.
          </p>
        </Modal>
      )}

      {addToConcertTarget && (
        <AddMemberToConcertModal
          member={addToConcertTarget}
          onClose={() => setAddToConcertTarget(null)}
          onGo={(cid) => {
            setSelectedConcertId(cid);
            navigate(`/concerts/${cid}/members`);
          }}
        />
      )}
    </div>
  );
}

function MemberForm({
  item,
  allMembers,
  onClose,
  onSaved,
}: {
  item: Member | null;
  allMembers: Member[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    instrument: '',
    part: '',
    role: '일반단원' as MemberRole,
    phone: '',
    email: '',
    nationality: '',
    idNumberType: '' as '주민등록번호' | '외국인등록번호' | '여권번호' | '',
    residentNumber: '',
    bankName: '',
    bankAccount: '',
    accountHolder: '',
    accountHolderRelation: '',
    baseFee: 0,
    grade: '정단원' as MemberGrade,
    status: '활동중' as MemberStatus,
    joinDate: '',
    note: '',
  });

  useEffect(() => {
    if (item) {
      const normalized = normalizeMemberInstrumentPart({
        instrument: item.instrument,
        part: item.part,
      });
      const normalizedInstrument = normalizeInstrumentName(normalized.instrument);
      setForm({
        name: item.name,
        instrument: normalizedInstrument,
        part: normalized.part ?? '',
        role: item.role,
        phone: item.phone ?? '',
        email: item.email ?? '',
        nationality: item.nationality ?? '',
        idNumberType: (item.idNumberType ?? '') as '주민등록번호' | '외국인등록번호' | '여권번호' | '',
        residentNumber: item.residentNumber ?? '',
        bankName: item.bankName ?? '',
        bankAccount: item.bankAccount ?? '',
        accountHolder: item.accountHolder ?? '',
        accountHolderRelation: item.accountHolderRelation ?? '',
        baseFee: item.baseFee ?? 0,
        grade: (item.grade ?? '정단원') as MemberGrade,
        status: item.status,
        joinDate: item.joinDate ?? '',
        note: item.note ?? '',
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!form.name) {
      alert('이름을 입력해 주세요.');
      return;
    }
    try {
      if (item) {
        await updateMember(item.id, form);
        showToast(`${form.name} 정보가 저장되었습니다.`);
      } else {
        await createMember(form);
        showToast(`${form.name} 단원이 추가되었습니다.`);
      }
      onSaved();
    } catch (error) {
      showToast(`저장 실패: ${error instanceof Error ? error.message : '오류 발생'}`);
      console.error('저장 실패:', error);
    }
  };

  return (
    <Modal
      title={item ? '단원 편집' : '단원 추가'}
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
          <label className="label">이름 *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">악기</label>
          <Combobox
            category="instrument"
            value={form.instrument}
            onChange={(value) => setForm((f) => ({ ...f, instrument: value, part: '' }))}
            defaultOptions={INSTRUMENT_OPTIONS}
          />
        </div>
        <div>
          <label className="label">파트</label>
          {(() => {
            const instrumentBase = getInstrumentBase(form.instrument);
            const partOptions = PART_OPTIONS_BY_INSTRUMENT[instrumentBase] || [];
            const isDisabled = partOptions.length === 0;
            return (
              <Combobox
                category="part"
                value={form.part}
                onChange={(value) => setForm((f) => ({ ...f, part: value }))}
                defaultOptions={partOptions}
                disabled={isDisabled}
              />
            );
          })()}
        </div>
        <div>
          <label className="label">역할</label>
          <Combobox
            category="role"
            value={form.role}
            onChange={(value) => setForm((f) => ({ ...f, role: value as MemberRole }))}
            defaultOptions={ROLE_OPTIONS}
          />
        </div>
        <div>
          <label className="label">연락처</label>
          <Combobox
            category="phone"
            value={form.phone}
            onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
            defaultOptions={Array.from(new Set(allMembers.map((m) => m.phone).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">이메일</label>
          <Combobox
            category="email"
            value={form.email}
            onChange={(value) => setForm((f) => ({ ...f, email: value }))}
            defaultOptions={Array.from(new Set(allMembers.map((m) => m.email).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">국적</label>
          <Combobox
            category="nationality"
            value={form.nationality}
            onChange={(value) => setForm((f) => ({ ...f, nationality: value }))}
            defaultOptions={Array.from(new Set(allMembers.map((m) => m.nationality).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">신분증 유형</label>
          <Combobox
            category="idNumberType"
            value={form.idNumberType}
            onChange={(value) =>
              setForm((f) => ({
                ...f,
                idNumberType: value as '주민등록번호' | '외국인등록번호' | '여권번호' | '',
              }))
            }
            defaultOptions={['주민등록번호', '외국인등록번호', '여권번호']}
          />
        </div>
        <div className="col-span-2">
          <label className="label">신분증 번호</label>
          <input
            className="input"
            value={form.residentNumber}
            onChange={(e) => setForm((f) => ({ ...f, residentNumber: e.target.value }))}
            placeholder="######-#######"
          />
        </div>
        <div>
          <label className="label">기본 사례비</label>
          <input
            type="number"
            className="input"
            value={form.baseFee}
            onChange={(e) => setForm((f) => ({ ...f, baseFee: +e.target.value }))}
          />
        </div>
        <div>
          <label className="label">은행</label>
          <Combobox
            category="bankName"
            value={form.bankName}
            onChange={(value) => setForm((f) => ({ ...f, bankName: value }))}
            defaultOptions={Array.from(new Set(allMembers.map((m) => m.bankName).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">계좌번호</label>
          <input
            className="input"
            value={form.bankAccount}
            onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">예금주명 (본인 이외)</label>
          <Combobox
            category="accountHolder"
            value={form.accountHolder}
            onChange={(value) => setForm((f) => ({ ...f, accountHolder: value }))}
            defaultOptions={Array.from(new Set(allMembers.map((m) => m.accountHolder).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">예금주와의 관계</label>
          <Combobox
            category="accountHolderRelation"
            value={form.accountHolderRelation}
            onChange={(value) => setForm((f) => ({ ...f, accountHolderRelation: value }))}
            defaultOptions={Array.from(new Set(allMembers.map((m) => m.accountHolderRelation).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">등급</label>
          <Combobox
            category="grade"
            value={form.grade}
            onChange={(value) => setForm((f) => ({ ...f, grade: value as MemberGrade }))}
            defaultOptions={['정단원', '준단원', '객원']}
          />
        </div>
        <div>
          <label className="label">상태</label>
          <Combobox
            category="status"
            value={form.status}
            onChange={(value) => setForm((f) => ({ ...f, status: value as MemberStatus }))}
            defaultOptions={['활동중', '휴식중', '탈퇴']}
          />
        </div>
        <div>
          <label className="label">가입일</label>
          <input
            type="date"
            className="input"
            value={form.joinDate}
            onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
          />
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

function AddMemberToConcertModal({
  member,
  onClose,
  onGo,
}: {
  member: Member;
  onClose: () => void;
  onGo: (concertId: string) => void;
}) {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [concertId, setConcertId] = useState('');
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
      await addMemberToConcert(concertId, member.id, {
        role: member.role,
        part: member.part,
        fee: member.baseFee,
        isReserve: false,
      });
      onGo(concertId);
    } catch (e: any) {
      if (e?.message === 'ALREADY_IN_CONCERT') {
        setError('이 단원은 이미 해당 연주회에 등록되어 있습니다.');
      } else {
        setError('추가 실패: ' + (e?.message ?? '오류'));
      }
    }
  };

  return (
    <Modal
      title="연주회에 단원 추가"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button className="btn-primary" onClick={handleAdd}>
            추가
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700 mb-3">
        <span className="font-semibold">{member.name}</span>을 추가할 연주회를 선택하세요.
      </p>
      <select className="input" value={concertId} onChange={(e) => setConcertId(e.target.value)}>
        <option value="">선택하세요</option>
        {concerts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title} ({c.date})
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </Modal>
  );
}
