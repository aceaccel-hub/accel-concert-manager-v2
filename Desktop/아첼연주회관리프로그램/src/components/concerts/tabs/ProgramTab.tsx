/**
 * 곡목 탭 — 드래그&드롭 순서 변경 포함
 * @dnd-kit/core + @dnd-kit/sortable 사용
 */
import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Edit2, History } from 'lucide-react';
import type { Concert, ProgramItem, Repertoire, ScoreStatus } from '../../../types';
import Modal from '../../common/Modal';
import StatusBadge from '../../common/StatusBadge';
import Combobox from '../../common/Combobox';
import { showToast } from '../../common/Toast';
import { getAllRepertoire } from '../../../hooks/useRepertoire';
import {
  getProgramItems,
  addProgramItem,
  updateProgramItem,
  removeProgramItem,
  getConcertHistoryForPiece,
} from '../../../hooks/useProgram';
import { db } from '../../../db/database';
import type { ConcertTabContext } from '../ConcertDetail';

const SCORE_STATUSES: ScoreStatus[] = ['준비완료', '준비중', '미준비'];

// ---------- 정렬 가능한 행 ----------
function SortableRow({
  item,
  idx,
  onEdit,
  onRemove,
  onHistory,
}: {
  item: ProgramItem;
  idx: number;
  onEdit: (item: ProgramItem) => void;
  onRemove: (item: ProgramItem) => void;
  onHistory: (item: ProgramItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
    background: isDragging ? '#f0f7ff' : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      {/* 드래그 핸들 */}
      <td className="pl-2 pr-1 py-3 w-8">
        <span
          {...attributes}
          {...listeners}
          className="flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          title="드래그하여 순서 변경"
        >
          <GripVertical size={16} />
        </span>
      </td>
      <td className="px-3 py-3 text-gray-500 font-medium text-sm">{idx + 1}</td>
      <td className="px-4 py-3 text-gray-700 text-sm">{item.composer}</td>
      <td className="px-4 py-3 font-medium text-gray-900 text-sm">{item.title}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{item.movement || '-'}</td>
      <td className="px-4 py-3 text-gray-500 text-sm">{item.soloist || '-'}</td>
      <td className="px-4 py-3 text-center text-gray-500 text-sm">
        {item.duration ? `${item.duration}분` : '-'}
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge status={item.scoreStatus} />
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge status={item.partScoreStatus} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onHistory(item)}
            className="text-gray-400 hover:text-purple-600"
            title="연주 이력 보기"
          >
            <History size={14} />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="text-gray-400 hover:text-[#2563eb]"
            title="편집"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onRemove(item)}
            className="text-gray-400 hover:text-red-600"
            title="제거"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------- 메인 탭 ----------
export default function ProgramTab() {
  const { concert, reload: reloadConcert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [items, setItems] = useState<ProgramItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ProgramItem | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ProgramItem | null>(null);
  const [historyItem, setHistoryItem] = useState<ProgramItem | null>(null);
  const [historyData, setHistoryData] = useState<{ programItem: ProgramItem; concert: Concert }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setItems(await getProgramItems(concertId));
  }, [concertId]);

  useEffect(() => {
    load();
  }, [load]);

  // dnd-kit 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx).map((it, i) => ({ ...it, order: i + 1 }));

    setItems(reordered); // 낙관적 업데이트
    await db.transaction('rw', db.programItems, async () => {
      for (const u of reordered) {
        await db.programItems.update(u.id, { order: u.order });
      }
    });
    showToast('곡 순서가 성공적으로 변경되었습니다.');
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    await removeProgramItem(removeTarget.id);
    setRemoveTarget(null);
    load();
    reloadConcert();
  };

  const handleOpenHistory = async (item: ProgramItem) => {
    setHistoryItem(item);
    setHistoryLoading(true);
    const data = await getConcertHistoryForPiece(item.composer, item.title);
    setHistoryData(data);
    setHistoryLoading(false);
  };

  const totalDuration = items.reduce((s, p) => s + (p.duration ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">곡목 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            총 {items.length}곡 · 예상 {totalDuration}분
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 곡 추가
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p>등록된 곡목이 없습니다. 곡을 추가해 주세요.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-2 py-3" />
                <th className="w-8 px-3 py-3 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">작곡가</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">곡명</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">악장</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">협연자</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">시간</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Score</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Part Score</th>
                <th className="w-16 px-3 py-3" />
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it, idx) => (
                    <SortableRow
                      key={it.id}
                      item={it}
                      idx={idx}
                      onEdit={setEditItem}
                      onRemove={setRemoveTarget}
                      onHistory={handleOpenHistory}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        ☰ 핸들을 드래그하여 곡 순서를 변경하세요. 변경 즉시 저장됩니다.
      </p>

      {(showAdd || editItem) && (
        <ProgramItemForm
          concertId={concertId}
          item={editItem}
          onClose={() => {
            setShowAdd(false);
            setEditItem(null);
          }}
          onSaved={() => {
            load();
            reloadConcert();
            setShowAdd(false);
            setEditItem(null);
          }}
          onDuplicate={(msg) => setDuplicateWarning(msg)}
        />
      )}

      {duplicateWarning && (
        <Modal
          title="중복된 곡목"
          onClose={() => setDuplicateWarning(null)}
          size="sm"
          footer={
            <button className="btn-primary" onClick={() => setDuplicateWarning(null)}>
              확인
            </button>
          }
        >
          <p className="text-sm text-gray-700">{duplicateWarning}</p>
        </Modal>
      )}

      {removeTarget && (
        <Modal
          title="곡 제거"
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
            이 곡을 이번 연주회의 곡목에서 제거하시겠습니까?
          </p>
          <p className="text-xs text-gray-500 mt-2">전체 곡목 DB에서는 삭제되지 않습니다.</p>
          <p className="text-sm font-medium text-gray-900 mt-3">
            {removeTarget.composer} - {removeTarget.title}
          </p>
        </Modal>
      )}

      {historyItem && (
        <Modal
          title="연주 이력"
          onClose={() => setHistoryItem(null)}
          size="md"
          footer={
            <button className="btn-secondary" onClick={() => setHistoryItem(null)}>
              닫기
            </button>
          }
        >
          <p className="text-sm font-semibold text-gray-900 mb-3">
            {historyItem.composer} — {historyItem.title}
          </p>
          {historyLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">불러오는 중...</p>
          ) : historyData.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">연주 이력이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {historyData.map(({ programItem: p, concert: c }) => (
                <li
                  key={p.id}
                  className={`flex flex-col md:flex-row items-start gap-3 p-3 rounded-lg border ${
                    c.id === concertId
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {/* 모바일: 배지형 연도 표시 */}
                  <span className="md:hidden badge bg-indigo-100 text-indigo-700 text-xs">
                    [{c.date.split('-')[0]}년] {c.title}
                  </span>
                  <div className="hidden md:flex flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      [{c.date.split('-')[0]}년] {c.title}
                      {c.id === concertId && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">현재 연주회</span>
                      )}
                    </p>
                  </div>
                  <div className="md:hidden flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">
                      {c.date} · {c.place}
                    </p>
                    {(p.movement || p.soloist) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[p.movement, p.soloist ? `협연: ${p.soloist}` : ''].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0 ${
                      c.status === '완료'
                        ? 'bg-green-100 text-green-700'
                        : c.status === '취소'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mt-3">
            총 {historyData.length}회 연주
          </p>
        </Modal>
      )}
    </div>
  );
}

// ---------- 곡 추가/편집 폼 ----------
function ProgramItemForm({
  concertId,
  item,
  onClose,
  onSaved,
  onDuplicate,
}: {
  concertId: string;
  item: ProgramItem | null;
  onClose: () => void;
  onSaved: () => void;
  onDuplicate: (msg: string) => void;
}) {
  const [repertoire, setRepertoire] = useState<Repertoire[]>([]);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [repId, setRepId] = useState('');
  const [showRepPicker, setShowRepPicker] = useState(false);
  const [repHistory, setRepHistory] = useState<Array<{ year: string; title: string }>>([]);
  const [allRepHistories, setAllRepHistories] = useState<Record<string, Array<{ year: string; title: string }>>>({});
  const [form, setForm] = useState({
    composer: '',
    title: '',
    movement: '',
    duration: 0,
    soloist: '',
    scoreStatus: '준비중' as ScoreStatus,
    partScoreStatus: '준비중' as ScoreStatus,
    partScoreDetail: {} as Record<string, { status: ScoreStatus; assignee?: string }>,
    note: '',
  });

  const PARTS = ['Violin 1', 'Violin 2', 'Viola', 'Cello', 'Contrabass'];

  useEffect(() => {
    getAllRepertoire().then(setRepertoire);
    if (item) {
      setForm({
        composer: item.composer,
        title: item.title,
        movement: item.movement ?? '',
        duration: item.duration ?? 0,
        soloist: item.soloist ?? '',
        scoreStatus: item.scoreStatus,
        partScoreStatus: item.partScoreStatus,
        partScoreDetail: item.partScoreDetail ?? {},
        note: item.note ?? '',
      });
    }
  }, [item]);

  useEffect(() => {
    if (showRepPicker && repertoire.length > 0) {
      const loadHistories = async () => {
        const histories: Record<string, Array<{ year: string; title: string }>> = {};
        for (const rep of repertoire) {
          const hist = await getConcertHistoryForPiece(rep.composer, rep.title);
          histories[rep.id] = hist.map((h) => ({ year: h.concert.date.split('-')[0], title: h.concert.title }));
        }
        setAllRepHistories(histories);
      };
      loadHistories();
    }
  }, [showRepPicker, repertoire]);

  const handleSelectRep = async (id: string) => {
    setRepId(id);
    const rep = repertoire.find((r) => r.id === id);
    if (rep) {
      setForm((f) => ({ ...f, composer: rep.composer, title: rep.title, duration: rep.duration ?? 0 }));
      const hist = await getConcertHistoryForPiece(rep.composer, rep.title);
      setRepHistory(hist.map((h) => ({ year: h.concert.date.split('-')[0], title: h.concert.title })));
      setShowRepPicker(false);
    }
  };

  const handleSave = async () => {
    if (!form.composer || !form.title) {
      alert('작곡가와 곡명을 입력해 주세요.');
      return;
    }
    try {
      if (item) {
        await updateProgramItem(item.id, form);
      } else {
        await addProgramItem(concertId, { ...form, repertoireId: repId || undefined });
      }
      onSaved();
    } catch (e: any) {
      if (e?.message === 'DUPLICATE_REPERTOIRE') {
        onClose();
        onDuplicate(`이미 곡목 관리에 등록된 곡입니다. 확인 후 다시 시도해 주세요.`);
      } else {
        alert('저장 실패: ' + (e?.message ?? '알 수 없는 오류'));
      }
    }
  };

  return (
    <Modal
      title={item ? '곡목 편집' : '곡 추가'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button className="btn-primary" onClick={handleSave}>저장</button>
        </>
      }
    >
      {!item && (
        <div className="flex gap-2 mb-4">
          {(['new', 'existing'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${
                mode === m ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {m === 'new' ? '직접 입력' : '곡목 DB에서 선택'}
            </button>
          ))}
        </div>
      )}
      {mode === 'existing' && !item && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="label">곡목 선택</label>
            <button
              onClick={() => setShowRepPicker(true)}
              className="w-full btn-secondary text-left"
            >
              {repId ? repertoire.find((r) => r.id === repId)?.composer + ' - ' + repertoire.find((r) => r.id === repId)?.title : '곡목을 선택하세요'}
            </button>
          </div>
          {repHistory.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-gray-600 mb-2">📍 사용 이력</p>
              <div className="space-y-1">
                {repHistory.map((h, i) => (
                  <p key={i} className="text-xs text-gray-700">
                    {h.year}년 {h.title}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showRepPicker && (
        <Modal
          title="곡목 선택"
          onClose={() => setShowRepPicker(false)}
          size="sm"
        >
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {repertoire.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectRep(r.id)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <p className="font-medium text-sm text-gray-900">{r.composer} - {r.title}</p>
                {allRepHistories[r.id] && allRepHistories[r.id].length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {allRepHistories[r.id].map((h) => `${h.year}년 ${h.title}`).join(', ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">작곡가 *</label>
          <Combobox
            category="composer"
            value={form.composer}
            onChange={(value) => setForm((f) => ({ ...f, composer: value }))}
            defaultOptions={Array.from(new Set(repertoire.map((r) => r.composer)))}
          />
        </div>
        <div>
          <label className="label">곡명 *</label>
          <Combobox
            category="title"
            value={form.title}
            onChange={(value) => setForm((f) => ({ ...f, title: value }))}
            defaultOptions={Array.from(new Set(repertoire.map((r) => r.title)))}
          />
        </div>
        <div>
          <label className="label">악장/부제</label>
          <Combobox
            category="movement"
            value={form.movement}
            onChange={(value) => setForm((f) => ({ ...f, movement: value }))}
            defaultOptions={Array.from(new Set(repertoire.map((r) => r.arrangement).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">협연자</label>
          <Combobox
            category="soloist"
            value={form.soloist}
            onChange={(value) => setForm((f) => ({ ...f, soloist: value }))}
            defaultOptions={[]}
          />
        </div>
        <div>
          <label className="label">예상 시간 (분)</label>
          <input type="number" className="input" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: +e.target.value }))} />
        </div>
        <div />
        <div>
          <label className="label">악보 준비 상태</label>
          <select className="input" value={form.scoreStatus} onChange={(e) => setForm((f) => ({ ...f, scoreStatus: e.target.value as ScoreStatus }))}>
            {SCORE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">파트보 준비 상태</label>
          <select className="input" value={form.partScoreStatus} onChange={(e) => setForm((f) => ({ ...f, partScoreStatus: e.target.value as ScoreStatus }))}>
            {SCORE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">파트별 악보 정보</label>
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            {PARTS.map((part) => (
              <div key={part} className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-xs text-gray-600">{part}</label>
                </div>
                <div>
                  <select
                    className="input text-xs py-1.5"
                    value={form.partScoreDetail[part]?.status ?? '준비중'}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      partScoreDetail: {
                        ...f.partScoreDetail,
                        [part]: { ...f.partScoreDetail[part], status: e.target.value as ScoreStatus }
                      }
                    }))}
                  >
                    {SCORE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <input
                  type="text"
                  className="input text-xs py-1.5"
                  placeholder="담당자"
                  value={form.partScoreDetail[part]?.assignee ?? ''}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    partScoreDetail: {
                      ...f.partScoreDetail,
                      [part]: { ...f.partScoreDetail[part], assignee: e.target.value }
                    }
                  }))}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="label">비고</label>
          <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}
