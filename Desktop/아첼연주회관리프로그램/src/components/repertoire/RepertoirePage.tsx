import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2, Music, PlusCircle } from 'lucide-react';
import type { Repertoire, Difficulty, ScoreStatus } from '../../types';
import Modal from '../common/Modal';
import {
  getAllRepertoire,
  createRepertoire,
  updateRepertoire,
  deleteRepertoire,
} from '../../hooks/useRepertoire';
import { addProgramItem } from '../../hooks/useProgram';
import { getAllConcerts } from '../../hooks/useConcert';
import { useStore } from '../../store/store';
import type { Concert } from '../../types';

export default function RepertoirePage() {
  const navigate = useNavigate();
  const { setSelectedConcertId } = useStore();

  const [items, setItems] = useState<Repertoire[]>([]);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('전체');
  const [selected, setSelected] = useState<Repertoire | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Repertoire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Repertoire | null>(null);
  const [addToConcertTarget, setAddToConcertTarget] = useState<Repertoire | null>(null);

  const load = async () => {
    setItems(await getAllRepertoire());
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((m) => {
    const matchSearch = !search || m.composer.includes(search) || m.title.includes(search);
    const matchDifficulty = difficultyFilter === '전체' || m.difficulty === difficultyFilter;
    return matchSearch && matchDifficulty;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRepertoire(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(null);
    load();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 좌측 목록 */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">전체 곡목 DB</h2>
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
              placeholder="작곡가, 곡명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-full focus:outline-none"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            {['전체', '초급', '중급', '고급'].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">등록된 곡이 없습니다.</p>
          )}
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selected?.id === r.id ? 'bg-blue-50' : ''
              }`}
            >
              <p className="text-xs text-gray-500">{r.composer}</p>
              <p className="text-sm font-medium text-gray-900">{r.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {r.instrumentation} {r.duration ? `· ${r.duration}분` : ''}{' '}
                {r.difficulty ? `· ${r.difficulty}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 우측 상세 */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div className="max-w-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">{selected.composer}</p>
                <h1 className="text-xl font-bold text-gray-900">{selected.title}</h1>
              </div>
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
                ['편성', selected.instrumentation || '-'],
                ['예상 시간', selected.duration ? `${selected.duration}분` : '-'],
                ['난이도', selected.difficulty || '-'],
                ['편곡', selected.arrangement || '-'],
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
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Music size={48} className="mb-3 opacity-20" />
            <p>곡목을 선택하세요</p>
          </div>
        )}
      </div>

      {(showForm || editItem) && (
        <RepertoireForm
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
          title="곡목 삭제"
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
              {deleteTarget.composer} - {deleteTarget.title}
            </span>
            을 전체 곡목 DB에서 삭제하시겠습니까?
          </p>
          <p className="text-xs text-orange-600 mt-2">
            이 곡을 이미 사용 중인 연주회의 곡목은 그대로 유지됩니다 (참조만 끊김).
          </p>
        </Modal>
      )}

      {addToConcertTarget && (
        <AddToConcertModal
          repertoire={addToConcertTarget}
          onClose={() => setAddToConcertTarget(null)}
          onGo={(cid) => {
            setSelectedConcertId(cid);
            navigate(`/concerts/${cid}/program`);
          }}
        />
      )}
    </div>
  );
}

function RepertoireForm({
  item,
  onClose,
  onSaved,
}: {
  item: Repertoire | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    composer: '',
    title: '',
    arrangement: '',
    instrumentation: '',
    duration: 0,
    difficulty: '중급' as Difficulty,
    note: '',
  });

  useEffect(() => {
    if (item)
      setForm({
        composer: item.composer,
        title: item.title,
        arrangement: item.arrangement ?? '',
        instrumentation: item.instrumentation ?? '',
        duration: item.duration ?? 0,
        difficulty: (item.difficulty ?? '중급') as Difficulty,
        note: item.note ?? '',
      });
  }, [item]);

  const handleSave = async () => {
    if (!form.composer || !form.title) {
      alert('작곡가와 곡명을 입력해 주세요.');
      return;
    }
    if (item) {
      await updateRepertoire(item.id, form);
    } else {
      await createRepertoire(form);
    }
    onSaved();
  };

  return (
    <Modal
      title={item ? '곡목 편집' : '곡목 추가'}
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
          <label className="label">작곡가 *</label>
          <input
            className="input"
            value={form.composer}
            onChange={(e) => setForm((f) => ({ ...f, composer: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">곡명 *</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">편곡</label>
          <input
            className="input"
            value={form.arrangement}
            onChange={(e) => setForm((f) => ({ ...f, arrangement: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">편성</label>
          <input
            className="input"
            value={form.instrumentation}
            onChange={(e) => setForm((f) => ({ ...f, instrumentation: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">예상 시간 (분)</label>
          <input
            type="number"
            className="input"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: +e.target.value }))}
          />
        </div>
        <div>
          <label className="label">난이도</label>
          <select
            className="input"
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}
          >
            {(['초급', '중급', '고급'] as Difficulty[]).map((d) => (
              <option key={d}>{d}</option>
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

function AddToConcertModal({
  repertoire,
  onClose,
  onGo,
}: {
  repertoire: Repertoire;
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
      await addProgramItem(concertId, {
        repertoireId: repertoire.id,
        composer: repertoire.composer,
        title: repertoire.title,
        duration: repertoire.duration,
        scoreStatus: '미준비' as ScoreStatus,
        partScoreStatus: '미준비' as ScoreStatus,
      });
      onGo(concertId);
    } catch (e: any) {
      if (e?.message === 'DUPLICATE_REPERTOIRE') {
        setError('이 곡은 이미 해당 연주회의 곡목에 등록되어 있습니다.');
      } else {
        setError('추가 실패: ' + (e?.message ?? '오류'));
      }
    }
  };

  return (
    <Modal
      title="연주회에 곡 추가"
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
        <span className="font-semibold">
          {repertoire.composer} - {repertoire.title}
        </span>
        을 추가할 연주회를 선택하세요.
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
