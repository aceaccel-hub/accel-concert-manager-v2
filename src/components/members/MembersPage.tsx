import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, Plus, Search, Trash2, Edit2, Star, PlusCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
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
import {
  getPartOptionsForInstrument,
  normalizeInstrumentPartSelection,
} from '../../utils/normalization';
import {
  getMemberImportIdentity,
  parseMemberRowsFromSheets,
  type ImportedMemberInput,
  type ParsedMemberExcelRow,
} from '../../utils/memberExcelImport';

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
  const [showImport, setShowImport] = useState(false);

  const load = async () => {
    setMembers(await getAllMembers());
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = members.filter((m) => {
    const normalized = normalizeInstrumentPartSelection(m.instrument, m.part);
    const matchSearch =
      !search ||
      m.name.includes(search) ||
      normalized.instrument.includes(search) ||
      normalized.part.includes(search);
    const matchPart = partFilter === '전체' || normalized.part === partFilter;
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
            <div className="flex gap-1.5">
              <button
                className="btn-secondary text-xs py-1.5 px-2.5"
                onClick={() => setShowImport(true)}
                title="Excel 파일에서 단원 가져오기"
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
          {filtered.map((m) => {
            const normalized = normalizeInstrumentPartSelection(m.instrument, m.part);
            return (
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
                      {normalized.instrument || '-'} · {normalized.part || '-'}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              </div>
            );
          })}
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
                ['악기', normalizeInstrumentPartSelection(selected.instrument, selected.part).instrument || '-'],
                ['파트', normalizeInstrumentPartSelection(selected.instrument, selected.part).part || '-'],
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

      {showImport && (
        <MemberExcelImportModal
          existingMembers={members}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            load();
          }}
        />
      )}
    </div>
  );
}

type ImportPreviewRow = ParsedMemberExcelRow & {
  existing?: Member;
  action: 'create' | 'update';
};

const compactImportedMember = (data: ImportedMemberInput): ImportedMemberInput => {
  const cleaned = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== '') acc[key] = value;
    return acc;
  }, {});
  return cleaned as ImportedMemberInput;
};

function MemberExcelImportModal({
  existingMembers,
  onClose,
  onImported,
}: {
  existingMembers: Member[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const existingByIdentity = new Map(existingMembers.map((member) => [getMemberImportIdentity(member), member]));

  const buildPreviewRows = (parsedRows: ParsedMemberExcelRow[]): ImportPreviewRow[] => {
    const seen = new Set<string>();
    return parsedRows.map((row) => {
      const identity = getMemberImportIdentity(row.data);
      const duplicateInFile = seen.has(identity);
      seen.add(identity);
      const existing = existingByIdentity.get(identity);
      return {
        ...row,
        warnings: duplicateInFile ? [...row.warnings, '파일 내 중복 가능'] : row.warnings,
        existing,
        action: existing ? 'update' : 'create',
      };
    });
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const templateRows = [
        [
          '이름',
          '악기',
          '파트',
          '역할',
          '연락처',
          '이메일',
          '신분증유형',
          '주민등록번호',
          '국적',
          '소득구분',
          '사례비',
          '은행',
          '계좌번호',
          '예금주',
          '예금주관계',
          '등급',
          '실력등급',
          '상태',
          '가입일',
          '비고',
        ],
        [
          '김도균',
          'Violin',
          'Violin I',
          '일반단원',
          '010-0000-0000',
          'example@accel.kr',
          '주민등록번호',
          '900101-1234567',
          '한국',
          '사업소득',
          300000,
          '국민은행',
          '123-456-789012',
          '김도균',
          '본인',
          '정단원',
          'A',
          '활동중',
          '2026-07-03',
          '예시 행은 삭제 후 사용하세요',
        ],
        [
          '유은영',
          'Viola',
          'Viola',
          '수석',
          '',
          '',
          '',
          '',
          '한국',
          '사업소득',
          250000,
          '',
          '',
          '',
          '',
          '정단원',
          'B',
          '활동중',
          '',
          '',
        ],
      ];
      const guideRows = [
        ['항목', '작성 방법'],
        ['이름', '필수입니다. 이름이 없는 행은 가져오지 않습니다.'],
        ['악기', 'Violin, Viola, V.Cello, Flute 등 단원 관리에서 쓰는 악기명을 권장합니다.'],
        ['파트', 'Violin I, Violin II, Viola 등 세부 파트를 적습니다.'],
        ['역할', '일반단원, 악장, 수석, 부수석, 객원, 지휘자, 협연자 등을 권장합니다.'],
        ['연락처', '기존 DB와 이름+연락처가 같으면 업데이트 대상으로 인식합니다.'],
        ['신분증유형', '주민등록번호, 외국인등록번호, 여권번호 중 하나를 권장합니다.'],
        ['주민등록번호', '값이 있으면 기존 DB 중복 판별의 최우선 기준으로 사용됩니다.'],
        ['소득구분', '사업소득 또는 기타소득을 권장합니다.'],
        ['사례비', '숫자 입력을 권장합니다. 예: 300000'],
        ['등급', '정단원, 준단원, 객원 중 하나를 권장합니다.'],
        ['실력등급', 'A, B, C 중 하나를 권장합니다.'],
        ['상태', '활동중, 휴식중, 탈퇴 중 하나를 권장합니다.'],
        ['가입일', 'YYYY-MM-DD 형식을 권장합니다.'],
        ['중복 처리', '주민등록번호가 같으면 업데이트, 없으면 이름+연락처, 그것도 없으면 이름 기준으로 판별합니다.'],
      ];
      const templateSheet = XLSX.utils.aoa_to_sheet(templateRows);
      const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);

      templateSheet['!cols'] = [
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 34 },
      ];
      guideSheet['!cols'] = [{ wch: 16 }, { wch: 72 }];

      XLSX.utils.book_append_sheet(workbook, templateSheet, '단원 양식');
      XLSX.utils.book_append_sheet(workbook, guideSheet, '작성 안내');
      XLSX.writeFile(workbook, '아첼_단원_가져오기_추천양식.xlsx', { compression: true });
      showToast('단원 추천 양식을 다운로드했습니다.', 'info');
    } catch (downloadError) {
      setError(
        `양식 다운로드 실패: ${
          downloadError instanceof Error ? downloadError.message : '알 수 없는 오류'
        }`
      );
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setRows([]);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheets = workbook.SheetNames.map((sheetName) => ({
        sheetName,
        rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
          header: 1,
          defval: '',
          raw: false,
        }),
      }));
      const parsed = parseMemberRowsFromSheets(sheets);
      if (parsed.length === 0) {
        setError('가져올 단원을 찾지 못했습니다. 이름 또는 성명 열이 있는지 확인해 주세요.');
        return;
      }
      setRows(buildPreviewRows(parsed));
    } catch (err) {
      console.error('Excel import failed:', err);
      setError('엑셀 파일을 읽지 못했습니다. .xlsx, .xls, .csv 파일인지 확인해 주세요.');
    } finally {
      setIsDragging(false);
    }
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

  const handleImport = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const data = compactImportedMember(row.data);
        if (row.existing) {
          await updateMember(row.existing.id, data);
          updated += 1;
        } else {
          await createMember(data);
          created += 1;
        }
      }

      showToast(`Excel 가져오기 완료: 신규 ${created}명, 업데이트 ${updated}명`);
      onImported();
    } catch (err) {
      console.error('Excel import save failed:', err);
      setError('단원 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const createCount = rows.filter((row) => row.action === 'create').length;
  const updateCount = rows.filter((row) => row.action === 'update').length;

  return (
    <Modal
      title="Excel 단원 가져오기"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button className="btn-primary" onClick={handleImport} disabled={saving || rows.length === 0}>
            {saving ? '저장 중...' : '가져오기'}
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
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-300'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FileSpreadsheet size={28} className="text-green-600" />
          <span className="text-sm font-semibold text-gray-900">엑셀 파일 선택 또는 드래그</span>
          <span className="text-xs text-gray-500">여러 시트와 다양한 헤더명을 자동으로 인식합니다.</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
              event.currentTarget.value = '';
            }}
          />
        </label>

        {fileName && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            선택 파일: <span className="font-semibold">{fileName}</span>
            {rows.length > 0 && (
              <span className="ml-2">
                신규 {createCount}명 · 업데이트 {updateCount}명
              </span>
            )}
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button type="button" className="btn-secondary text-xs py-1" onClick={clearPreviewRows}>
                전체 비우기
              </button>
            </div>
            <div className="max-h-[420px] overflow-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">악기/파트</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">역할</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">연락처</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">사례비</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">출처</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">확인</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">제외</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className={`badge text-xs ${row.action === 'create' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.action === 'create' ? '신규' : '업데이트'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.data.name}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.data.instrument || '-'} / {row.data.part || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.data.role}</td>
                    <td className="px-3 py-2 text-gray-600">{row.data.phone || '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {row.data.baseFee ? `${row.data.baseFee.toLocaleString()}원` : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {row.sheetName} {row.rowNumber}행
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {row.warnings.length > 0 ? row.warnings.join(', ') : `${row.matchedFields.length}개 항목 인식`}
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
      const normalized = normalizeInstrumentPartSelection(item.instrument, item.part);
      setForm({
        name: item.name,
        instrument: normalized.instrument,
        part: normalized.part,
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
      const normalized = normalizeInstrumentPartSelection(form.instrument, form.part);
      const normalizedForm = {
        ...form,
        instrument: normalized.instrument,
        part: normalized.part,
      };
      if (item) {
        await updateMember(item.id, normalizedForm);
        showToast(`${form.name} 정보가 저장되었습니다.`);
      } else {
        await createMember(normalizedForm);
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
            onChange={(value) => setForm((f) => ({ ...f, ...normalizeInstrumentPartSelection(value, f.part) }))}
            defaultOptions={INSTRUMENT_OPTIONS}
          />
        </div>
        <div>
          <label className="label">파트</label>
          {(() => {
            const partOptions = getPartOptionsForInstrument(form.instrument);
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
