import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, Plus, Search, Trash2, Edit2, Music, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Repertoire, Difficulty, ScoreStatus } from '../../types';
import Modal from '../common/Modal';
import Combobox from '../common/Combobox';
import { showToast } from '../common/Toast';
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
import {
  getRepertoireImportIdentity,
  parseRepertoireRowsFromSheets,
  type ImportedRepertoireInput,
  type ParsedRepertoireExcelRow,
} from '../../utils/repertoireExcelImport';

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
  const [showImport, setShowImport] = useState(false);

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
            <div className="flex gap-1.5">
              <button
                className="btn-secondary text-xs py-1.5 px-2.5"
                onClick={() => setShowImport(true)}
                title="Excel 파일에서 곡목 가져오기"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
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
          allRepertoire={items}
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

      {showImport && (
        <RepertoireExcelImportModal
          existingRepertoire={items}
          onClose={() => setShowImport(false)}
          onImported={() => {
            load();
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

function RepertoireExcelImportModal({
  existingRepertoire,
  onClose,
  onImported,
}: {
  existingRepertoire: Repertoire[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRepertoireExcelRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const existingByIdentity = new Map(
    existingRepertoire.map((item) => [getRepertoireImportIdentity(item), item])
  );

  const previewRows = rows.map((row) => ({
    row,
    existing: existingByIdentity.get(getRepertoireImportIdentity(row.data)),
  }));

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const templateRows = [
        ['작곡가', '곡명', '편곡', '편성', '시간', '난이도', '비고'],
        ['Mozart', 'Eine kleine Nachtmusik', '', 'String Orchestra', 12, '중급', '예시 행은 삭제 후 사용하세요'],
        ['Beethoven', 'Symphony No.5 1st mov.', '', 'Orchestra', 7, '고급', ''],
        ['작곡가 미상', 'Amazing Grace', '현악 편곡', 'String Quartet', 4, '초급', ''],
      ];
      const guideRows = [
        ['항목', '작성 방법'],
        ['작곡가', '비어 있으면 가져오기 때 "작곡가 미상"으로 처리됩니다.'],
        ['곡명', '필수입니다. 곡명이 없는 행은 가져오지 않습니다.'],
        ['편곡', '편곡자 또는 편곡 정보를 적습니다. 비워도 됩니다.'],
        ['편성', 'Orchestra, String Quartet, Violin Solo 등 자유롭게 적습니다.'],
        ['시간', '분 단위 숫자 또는 시:분:초 형식을 사용할 수 있습니다. 예: 7, 3.5, 0:04:30'],
        ['난이도', '초급, 중급, 고급 중 하나를 권장합니다.'],
        ['비고', '추가 메모를 적습니다. 비워도 됩니다.'],
        ['중복 처리', '기존 DB에 같은 작곡가 + 곡명이 있으면 새로 만들지 않고 업데이트합니다.'],
      ];
      const templateSheet = XLSX.utils.aoa_to_sheet(templateRows);
      const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);

      templateSheet['!cols'] = [
        { wch: 18 },
        { wch: 34 },
        { wch: 18 },
        { wch: 24 },
        { wch: 10 },
        { wch: 10 },
        { wch: 34 },
      ];
      guideSheet['!cols'] = [{ wch: 16 }, { wch: 60 }];

      XLSX.utils.book_append_sheet(workbook, templateSheet, '곡목 양식');
      XLSX.utils.book_append_sheet(workbook, guideSheet, '작성 안내');
      XLSX.writeFile(workbook, '아첼_곡목_가져오기_추천양식.xlsx', { compression: true });
      showToast('곡목 추천 양식을 다운로드했습니다.', 'info');
    } catch (downloadError) {
      setError(
        `양식 다운로드 실패: ${
          downloadError instanceof Error ? downloadError.message : '알 수 없는 오류'
        }`
      );
    }
  };

  const handleFile = async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheets = workbook.SheetNames.map((sheetName) => ({
        sheetName,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
          defval: '',
          raw: false,
        }) as unknown[][],
      }));
      const parsed = parseRepertoireRowsFromSheets(sheets);
      setRows(parsed);
      if (parsed.length === 0) {
        setError('가져올 곡목을 찾지 못했습니다. 곡명 열이 포함되어 있는지 확인해 주세요.');
      }
    } catch (parseError) {
      setRows([]);
      setError(
        `파일을 읽지 못했습니다: ${
          parseError instanceof Error ? parseError.message : '알 수 없는 오류'
        }`
      );
    } finally {
      setIsDragging(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleFile(file);
    event.target.value = '';
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const removePreviewRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const clearPreviewRows = () => {
    setRows([]);
    setFileName('');
    setError(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const buildUpdateInput = (row: ParsedRepertoireExcelRow) => {
    const update: Partial<ImportedRepertoireInput> = {};
    (row.matchedFields as (keyof ImportedRepertoireInput)[]).forEach((field) => {
      const value = row.data[field];
      if (value !== undefined && value !== '') {
        (update as Record<keyof ImportedRepertoireInput, unknown>)[field] = value;
      }
    });
    return update;
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setIsImporting(true);
    try {
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const existing = existingByIdentity.get(getRepertoireImportIdentity(row.data));
        if (existing) {
          await updateRepertoire(existing.id, buildUpdateInput(row));
          updated += 1;
        } else {
          await createRepertoire(row.data);
          created += 1;
        }
      }

      showToast(`Excel 가져오기 완료: 신규 ${created}곡, 업데이트 ${updated}곡`);
      onImported();
    } catch (importError) {
      setError(
        `가져오기 실패: ${
          importError instanceof Error ? importError.message : '알 수 없는 오류'
        }`
      );
    } finally {
      setIsImporting(false);
    }
  };

  const createCount = previewRows.filter(({ existing }) => !existing).length;
  const updateCount = previewRows.length - createCount;

  return (
    <Modal
      title="Excel에서 곡목 가져오기"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={isImporting}>
            취소
          </button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={rows.length === 0 || isImporting}
          >
            {isImporting ? '가져오는 중...' : `${rows.length}곡 가져오기`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={handleDownloadTemplate}
            title="가져오기 인식률이 가장 높은 추천 양식을 다운로드합니다"
          >
            <Download size={14} /> 추천 양식 다운로드
          </button>
        </div>

        <label
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-8 cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileSpreadsheet size={28} className="text-green-600" />
          <div className="text-sm font-medium text-gray-800">
            {fileName || 'Excel, CSV 파일을 선택하거나 여기로 끌어오세요'}
          </div>
          <div className="text-xs text-gray-500">
            곡명은 필수이며 작곡가, 편곡, 편성, 시간, 난이도, 비고 열을 자동으로 인식합니다.
          </div>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv,.tsv"
            onChange={handleFileChange}
          />
        </label>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-gray-800">
                미리보기: 신규 {createCount}곡, 업데이트 {updateCount}곡
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">작곡가 + 곡명이 같으면 기존 곡목을 업데이트합니다.</span>
                <button type="button" className="btn-secondary text-xs py-1" onClick={clearPreviewRows}>
                  전체 비우기
                </button>
              </div>
            </div>
            <div className="max-h-[420px] overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 w-20">상태</th>
                    <th className="text-left px-3 py-2">작곡가</th>
                    <th className="text-left px-3 py-2">곡명</th>
                    <th className="text-left px-3 py-2">편성</th>
                    <th className="text-left px-3 py-2 w-20">시간</th>
                    <th className="text-left px-3 py-2 w-20">난이도</th>
                    <th className="text-left px-3 py-2">출처</th>
                    <th className="text-right px-3 py-2 w-16">제외</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(({ row, existing }) => (
                    <tr key={row.key} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                            existing
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {existing ? '업데이트' : '신규'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-800">{row.data.composer}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.data.title}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.data.instrumentation || row.data.arrangement || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.data.duration ? `${row.data.duration}분` : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.data.difficulty || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">
                        {row.sheetName} {row.rowNumber}행
                        {row.warnings.length > 0 && (
                          <span className="ml-1 text-orange-600">
                            · {row.warnings.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removePreviewRow(row.key)}
                          title="이 행 제외"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RepertoireForm({
  item,
  onClose,
  onSaved,
  allRepertoire,
}: {
  item: Repertoire | null;
  onClose: () => void;
  onSaved: () => void;
  allRepertoire: Repertoire[];
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
          <Combobox
            category="composer"
            value={form.composer}
            onChange={(value) => setForm((f) => ({ ...f, composer: value }))}
            defaultOptions={Array.from(new Set(allRepertoire.map((r) => r.composer)))}
          />
        </div>
        <div>
          <label className="label">곡명 *</label>
          <Combobox
            category="title"
            value={form.title}
            onChange={(value) => setForm((f) => ({ ...f, title: value }))}
            defaultOptions={Array.from(new Set(allRepertoire.map((r) => r.title)))}
          />
        </div>
        <div>
          <label className="label">편곡</label>
          <Combobox
            category="movement"
            value={form.arrangement}
            onChange={(value) => setForm((f) => ({ ...f, arrangement: value }))}
            defaultOptions={Array.from(new Set(allRepertoire.map((r) => r.arrangement).filter(Boolean)))}
          />
        </div>
        <div>
          <label className="label">편성</label>
          <Combobox
            category="soloist"
            value={form.instrumentation}
            onChange={(value) => setForm((f) => ({ ...f, instrumentation: value }))}
            defaultOptions={[]}
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
