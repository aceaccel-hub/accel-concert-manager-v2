import { useState } from 'react';
import { FileText, Download, Clipboard, Eye, FileSpreadsheet, FileType } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../db/database';
import type { Concert } from '../../../types';
import * as XLSX from 'xlsx';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
} from 'docx';

interface Props { concertId: string; concert: Concert; }

const DOC_TYPES = [
  { type: '곡목표',        icon: '🎵', desc: '연주 곡목 전체 목록' },
  { type: '단원명단',      icon: '👥', desc: '참여 단원 명단' },
  { type: '리허설일정표',  icon: '📅', desc: '연습 일정 전체' },
  { type: '정산표',        icon: '💰', desc: '예산 및 지출 내역' },
  { type: '프로그램북원고',icon: '📖', desc: '공연 프로그램북 원고' },
  { type: '공지문',        icon: '📢', desc: '단원 공지문' },
  { type: '체크리스트',   icon: '✅', desc: '준비 체크리스트' },
] as const;

/* ────────────────────────────────────────
   데이터 수집 헬퍼
──────────────────────────────────────── */
async function fetchData(concertId: string) {
  const programs  = await db.programItems.where('concertId').equals(concertId).sortBy('order');
  const cms       = await db.concertMembers.where('concertId').equals(concertId).toArray();
  const allMem    = await db.members.toArray();
  const rehearsals= await db.rehearsals.where('concertId').equals(concertId).sortBy('date');
  const budgets   = await db.budgets.where('concertId').equals(concertId).toArray();
  const cgs       = await db.concertGroups.where('concertId').equals(concertId).toArray();
  const allGroups = await db.groups.toArray();
  const checklists= await db.checklists.where('concertId').equals(concertId).sortBy('order');
  return { programs, cms, allMem, rehearsals, budgets, cgs, allGroups, checklists };
}

/* ────────────────────────────────────────
   공통 헤더 텍스트 (미리보기용)
──────────────────────────────────────── */
function makeHeader(concert: Concert, docType: string): string {
  const now = new Date();
  const docNum = `ACM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return `발행기관: 아첼 오케스트라   문서번호: ${docNum}   발행일: ${now.toLocaleDateString('ko-KR')}
════════════════════════════════════════════
${concert.title}
날짜: ${concert.date} ${concert.time}   장소: ${concert.place}
════════════════════════════════════════════
【 ${docType} 】\n`;
}

/* ────────────────────────────────────────
   미리보기 텍스트 생성
──────────────────────────────────────── */
async function generatePreviewText(concert: Concert, type: string): Promise<string> {
  const { programs, cms, allMem, rehearsals, budgets, cgs, allGroups, checklists } = await fetchData(concert.id);
  const header = makeHeader(concert, type);

  if (type === '곡목표') {
    const totalDur = programs.reduce((s, p) => s + (p.duration || 0), 0);
    return header + programs.map(p =>
      `${p.order}. ${p.composer}  ·  ${p.title}${p.movement ? ` (${p.movement})` : ''}${p.soloist ? `\n   협연: ${p.soloist}` : ''}\n   예상시간: ${p.duration ?? '-'}분  악보: ${p.scoreStatus}  파트보: ${p.partScoreStatus}`
    ).join('\n\n') + `\n\n합계: ${programs.length}곡 · 예상 ${totalDur}분`;
  }

  if (type === '단원명단') {
    const members = cms.map(cm => ({ ...cm, member: allMem.find(m => m.id === cm.memberId) })).filter(cm => !cm.isReserve);
    const byPart: Record<string, typeof members> = {};
    members.forEach(m => { const p = m.part || m.member?.part || '기타'; if (!byPart[p]) byPart[p] = []; byPart[p].push(m); });
    return header + `총 ${members.length}명\n\n` +
      Object.entries(byPart).map(([part, mbs]) =>
        `▶ ${part} (${mbs.length}명)\n` + mbs.map(m => `  · ${m.member?.name ?? '?'}  ${m.role ?? m.member?.role ?? ''}  ${m.member?.phone ?? ''}`).join('\n')
      ).join('\n\n');
  }

  if (type === '리허설일정표') {
    return header + (rehearsals.length === 0 ? '등록된 연습 일정이 없습니다.' :
      rehearsals.map(r => `${r.date} ${r.time}  |  ${r.place}  [${r.type}]${r.targetPieces?.length ? `\n   대상곡: ${r.targetPieces.join(', ')}` : ''}${r.memo ? `\n   메모: ${r.memo}` : ''}`).join('\n\n'));
  }

  if (type === '정산표') {
    const income = budgets.filter(b => b.type === '수입');
    const expense = budgets.filter(b => b.type === '지출');
    const totalIn  = income.reduce((s, b) => s + b.plannedAmount, 0);
    const totalOut = expense.reduce((s, b) => s + b.paidAmount, 0);
    return header +
      `▶ 수입\n` + income.map(b => `  ${b.title}: ${b.plannedAmount.toLocaleString()}원`).join('\n') +
      `\n  소계: ${totalIn.toLocaleString()}원\n\n` +
      `▶ 지출\n` + expense.map(b => `  ${b.title}: ${b.paidAmount.toLocaleString()}원 (${b.paymentStatus})`).join('\n') +
      `\n  소계: ${totalOut.toLocaleString()}원\n\n잔여 예산: ${(totalIn - totalOut).toLocaleString()}원`;
  }

  if (type === '프로그램북원고') {
    const groups = cgs.map(cg => ({ role: cg.role, group: allGroups.find(g => g.id === cg.groupId) }));
    return header + groups.map(g => `${g.role}: ${g.group?.name}`).join('\n') +
      `\n지휘: ${concert.conductor}${concert.coPerformer ? `\n협연: ${concert.coPerformer}` : ''}\n\n─── 프로그램 ───\n\n` +
      programs.map(p => `${p.composer}\n${p.title}${p.movement ? `\n${p.movement}` : ''}${p.soloist ? `\n\n협연: ${p.soloist}` : ''}`).join('\n\n');
  }

  if (type === '공지문') {
    const next = rehearsals.find(r => r.date >= new Date().toISOString().split('T')[0]);
    return header +
      `■ 공연 정보\n일시: ${concert.date} ${concert.time}\n장소: ${concert.place}\n지휘: ${concert.conductor}\n\n` +
      (next ? `■ 다음 연습\n일시: ${next.date} ${next.time}\n장소: ${next.place}\n유형: ${next.type}\n\n` : '') +
      `많은 참여 바랍니다. 감사합니다.`;
  }

  if (type === '체크리스트') {
    return header + checklists.map(c => `${c.isDone ? '☑' : '☐'} ${c.title}`).join('\n');
  }

  return '생성 중...';
}

/* ────────────────────────────────────────
   Excel 내보내기
──────────────────────────────────────── */
async function exportExcel(concert: Concert, type: string) {
  const { programs, cms, allMem, rehearsals, budgets, checklists } = await fetchData(concert.id);
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const docNum = `ACM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  let sheetData: (string | number)[][] = [];

  // 공통 헤더 행
  const headerRows: (string | number)[][] = [
    ['발행기관', '아첼 오케스트라'],
    ['문서번호', docNum],
    ['발행일', now.toLocaleDateString('ko-KR')],
    ['연주회명', concert.title],
    ['공연일시', `${concert.date} ${concert.time}`],
    ['장소', concert.place],
    [],
  ];

  if (type === '곡목표') {
    sheetData = [
      ...headerRows,
      ['순서', '작곡가', '곡명', '악장/부제', '협연자', '예상시간(분)', '악보상태', '파트보상태', '비고'],
      ...programs.map(p => [p.order, p.composer, p.title, p.movement ?? '', p.soloist ?? '', p.duration ?? '', p.scoreStatus, p.partScoreStatus, p.note ?? '']),
      [],
      ['합계', '', `총 ${programs.length}곡`, '', '', programs.reduce((s, p) => s + (p.duration ?? 0), 0) + '분'],
    ];
  } else if (type === '단원명단') {
    const members = cms.map(cm => ({ ...cm, member: allMem.find(m => m.id === cm.memberId) }));
    sheetData = [
      ...headerRows,
      ['이름', '악기', '파트', '역할', '출석률(%)', '사례비(원)', '연락처', '예비여부'],
      ...members.map(m => [
        m.member?.name ?? '', m.member?.instrument ?? '', m.part ?? m.member?.part ?? '',
        m.role ?? m.member?.role ?? '', m.attendanceRate ?? '', m.fee ?? '',
        m.member?.phone ?? '', m.isReserve ? '예비' : '정단원',
      ]),
    ];
  } else if (type === '리허설일정표') {
    sheetData = [
      ...headerRows,
      ['날짜', '시간', '장소', '유형', '대상곡목', '진행도(%)', '메모'],
      ...rehearsals.map(r => [r.date, r.time, r.place, r.type, (r.targetPieces ?? []).join(', '), r.progressRate ?? '', r.memo ?? '']),
    ];
  } else if (type === '정산표') {
    const income  = budgets.filter(b => b.type === '수입');
    const expense = budgets.filter(b => b.type === '지출');
    const totalIn  = income.reduce((s, b) => s + b.plannedAmount, 0);
    const totalOut = expense.reduce((s, b) => s + b.paidAmount, 0);
    sheetData = [
      ...headerRows,
      ['구분', '카테고리', '항목명', '예산(원)', '집행액(원)', '잔액(원)', '상태'],
      ...budgets.map(b => [b.type, b.category, b.title, b.plannedAmount, b.paidAmount, b.plannedAmount - b.paidAmount, b.paymentStatus]),
      [],
      ['', '', '총 수입', totalIn, '', '', ''],
      ['', '', '총 지출', '', totalOut, '', ''],
      ['', '', '잔여 예산', '', '', totalIn - totalOut, ''],
    ];
  } else if (type === '체크리스트') {
    sheetData = [
      ...headerRows,
      ['항목', '완료여부'],
      ...checklists.map(c => [c.title, c.isDone ? '완료' : '미완료']),
    ];
  } else {
    sheetData = [
      ...headerRows,
      ['내용'],
      [(await generatePreviewText(concert, type)).split('\n').slice(6).join('\n')],
    ];
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  // 열 너비 자동 조정
  ws['!cols'] = Array(20).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws, type);
  XLSX.writeFile(wb, `아첼_${concert.title}_${type}.xlsx`);
  toast.success('Excel 파일이 저장되었습니다.');
}

/* ────────────────────────────────────────
   HTML 특수문자 이스케이프
──────────────────────────────────────── */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ────────────────────────────────────────
   PDF 내보내기 — 인쇄 창 방식 (한글 완벽 지원, 오류 없음)
──────────────────────────────────────── */
async function exportPDF(concert: Concert, type: string, previewText: string) {
  const now = new Date();
  const docNum = `ACM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const dateStr = now.toLocaleDateString('ko-KR');

  // 미리보기 텍스트에서 헤더 제거 후 본문만 추출
  const bodyLines = previewText.split('\n').slice(4).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>아첼_${esc(concert.title)}_${esc(type)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{
      font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','AppleGothic',sans-serif;
      font-size:13px;line-height:1.75;color:#1a1a1a;background:#fff;
    }
    .hd{background:#3f3fcb;color:#fff;padding:16px 28px 14px;}
    .hd h1{font-size:18px;font-weight:700;letter-spacing:.3px;}
    .hd p{font-size:10px;margin-top:4px;opacity:.85;}
    .bd{padding:22px 28px 8px;}
    .ct{font-size:16px;font-weight:700;color:#111;}
    .ci{font-size:11px;color:#888;margin-top:5px;}
    hr{border:none;border-top:1.5px solid #e5e5e5;margin:14px 0 16px;}
    .dt{font-size:13px;font-weight:700;color:#3f3fcb;margin-bottom:14px;}
    pre{
      font-family:inherit;font-size:12.5px;
      white-space:pre-wrap;word-break:break-all;
      line-height:1.8;padding-bottom:28px;color:#222;
    }
    .ft{background:#f8f8ff;border-top:1px solid #dde;padding:8px 28px;font-size:9.5px;color:#888;}
    @media print{
      @page{size:A4;margin:0;}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .no-print{display:none;}
    }
    .btn{
      display:block;margin:20px auto 0;padding:10px 28px;
      background:#3f3fcb;color:#fff;border:none;border-radius:8px;
      font-size:13px;font-family:inherit;cursor:pointer;
    }
    .hint{text-align:center;font-size:11px;color:#888;margin-top:8px;}
  </style>
</head>
<body>
  <div class="hd">
    <h1>아첼 오케스트라</h1>
    <p>문서번호: ${docNum} &nbsp;|&nbsp; 발행일: ${dateStr}</p>
  </div>
  <div class="bd">
    <div class="ct">${esc(concert.title)}</div>
    <div class="ci">${esc(concert.date)} ${esc(concert.time)} &nbsp;|&nbsp; ${esc(concert.place)}${concert.conductor ? ` &nbsp;|&nbsp; 지휘: ${esc(concert.conductor)}` : ''}</div>
    <hr>
    <div class="dt">■ ${esc(type)}</div>
    <pre>${esc(bodyLines)}</pre>
  </div>
  <div class="ft">아첼 오케스트라 공식 문서 &nbsp;·&nbsp; ${docNum} &nbsp;·&nbsp; 발행일 ${dateStr}</div>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ PDF로 저장 / 인쇄</button>
    <p class="hint">인쇄 대화창 → 대상 프린터를 "PDF로 저장" 선택</p>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'width=860,height=900');

  if (!win) {
    // 팝업 차단된 경우 다운로드로 대체
    const a = document.createElement('a');
    a.href = url;
    a.download = `아첼_${concert.title}_${type}.html`;
    a.click();
    toast('팝업이 차단되었습니다. HTML 파일을 열고 인쇄해 주세요.', { icon: 'ℹ️', duration: 5000 });
    return;
  }

  win.addEventListener('afterprint', () => {
    URL.revokeObjectURL(url);
  });

  toast.success('인쇄 창이 열렸습니다. "PDF로 저장"을 선택하세요.');
}

/* ────────────────────────────────────────
   Word(.docx) 내보내기
──────────────────────────────────────── */
async function exportWord(concert: Concert, type: string) {
  const { programs, cms, allMem, rehearsals, budgets, checklists } = await fetchData(concert.id);
  const now = new Date();
  const docNum = `ACM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const cellBorders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

  const makeCell = (text: string, bold = false) =>
    new TableCell({
      borders: cellBorders,
      children: [new Paragraph({ children: [new TextRun({ text: String(text), bold, size: 20, font: 'Malgun Gothic' })] })],
    });

  const makeHeaderCell = (text: string) =>
    new TableCell({
      borders: cellBorders,
      shading: { fill: '3F3FCB' },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Malgun Gothic' })],
      })],
    });

  let tableRows: TableRow[] = [];

  if (type === '곡목표') {
    tableRows = [
      new TableRow({ children: ['#','작곡가','곡명','악장','협연자','시간','악보','파트보'].map(h => makeHeaderCell(h)) }),
      ...programs.map(p => new TableRow({ children: [String(p.order), p.composer, p.title, p.movement ?? '', p.soloist ?? '', p.duration ? `${p.duration}분` : '-', p.scoreStatus, p.partScoreStatus].map(t => makeCell(t)) })),
    ];
  } else if (type === '단원명단') {
    const members = cms.map(cm => ({ ...cm, member: allMem.find(m => m.id === cm.memberId) }));
    tableRows = [
      new TableRow({ children: ['이름','악기','파트','역할','출석률','사례비','구분'].map(h => makeHeaderCell(h)) }),
      ...members.map(m => new TableRow({ children: [m.member?.name ?? '', m.member?.instrument ?? '', m.part ?? m.member?.part ?? '', m.role ?? m.member?.role ?? '', m.attendanceRate != null ? `${m.attendanceRate}%` : '-', m.fee ? `${m.fee.toLocaleString()}원` : '-', m.isReserve ? '예비' : '정단원'].map(t => makeCell(t)) })),
    ];
  } else if (type === '리허설일정표') {
    tableRows = [
      new TableRow({ children: ['날짜','시간','장소','유형','대상곡목','진행도'].map(h => makeHeaderCell(h)) }),
      ...rehearsals.map(r => new TableRow({ children: [r.date, r.time, r.place, r.type, (r.targetPieces ?? []).join(', '), r.progressRate != null ? `${r.progressRate}%` : '-'].map(t => makeCell(t)) })),
    ];
  } else if (type === '정산표') {
    const income = budgets.filter(b => b.type === '수입');
    const expense = budgets.filter(b => b.type === '지출');
    const totalIn  = income.reduce((s, b) => s + b.plannedAmount, 0);
    const totalOut = expense.reduce((s, b) => s + b.paidAmount, 0);
    tableRows = [
      new TableRow({ children: ['구분','카테고리','항목명','예산(원)','집행액(원)','잔액(원)','상태'].map(h => makeHeaderCell(h)) }),
      ...budgets.map(b => new TableRow({ children: [b.type, b.category, b.title, b.plannedAmount.toLocaleString(), b.paidAmount.toLocaleString(), (b.plannedAmount - b.paidAmount).toLocaleString(), b.paymentStatus].map(t => makeCell(t)) })),
      new TableRow({ children: ['','','총 수입', totalIn.toLocaleString(), '', '', ''].map(t => makeCell(t, true)) }),
      new TableRow({ children: ['','','총 지출', '', totalOut.toLocaleString(), '', ''].map(t => makeCell(t, true)) }),
      new TableRow({ children: ['','','잔여 예산', '', '', (totalIn - totalOut).toLocaleString(), ''].map(t => makeCell(t, true)) }),
    ];
  } else {
    tableRows = [
      new TableRow({ children: [makeHeaderCell('항목'), makeHeaderCell('내용')] }),
      ...checklists.map(c => new TableRow({ children: [makeCell(c.title), makeCell(c.isDone ? '✓ 완료' : '미완료')] })),
    ];
  }

  const wordDoc = new Document({
    sections: [{
      children: [
        // 타이틀 헤더
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '아첼 오케스트라', bold: true, size: 36, color: '3F3FCB', font: 'Malgun Gothic' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `문서번호: ${docNum}  ·  발행일: ${now.toLocaleDateString('ko-KR')}`, size: 18, color: '888888', font: 'Malgun Gothic' })],
        }),
        new Paragraph({ children: [] }),
        // 연주회 정보
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: concert.title, bold: true, size: 28, font: 'Malgun Gothic' })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `${concert.date} ${concert.time}  |  ${concert.place}  |  지휘: ${concert.conductor}`, size: 20, color: '555555', font: 'Malgun Gothic' })],
        }),
        new Paragraph({ children: [] }),
        // 문서 유형
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `■ ${type}`, bold: true, size: 24, color: '3F3FCB', font: 'Malgun Gothic' })],
        }),
        new Paragraph({ children: [] }),
        // 표
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `아첼_${concert.title}_${type}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Word 파일이 저장되었습니다.');
}

/* ────────────────────────────────────────
   메인 컴포넌트
──────────────────────────────────────── */
export default function DocumentsTab({ concert }: Props) {
  const [selectedType, setSelectedType] = useState<string>('곡목표');
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handlePreview = async (type: string) => {
    setSelectedType(type);
    setLoading(true);
    const text = await generatePreviewText(concert, type);
    setPreview(text);
    setLoading(false);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    setExporting(format);
    try {
      if (format === 'pdf')   await exportPDF(concert, selectedType, preview);
      if (format === 'excel') await exportExcel(concert, selectedType);
      if (format === 'word')  await exportWord(concert, selectedType);
    } finally {
      setExporting(null);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview);
    toast.success('클립보드에 복사되었습니다!');
  };

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* 문서 유형 선택 */}
      <div className="w-56 space-y-1.5 shrink-0">
        <p className="text-sm font-semibold text-gray-700 mb-3">문서 유형 선택</p>
        {DOC_TYPES.map(({ type, icon, desc }) => (
          <button
            key={type}
            onClick={() => handlePreview(type)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors border ${selectedType === type ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <span className="mr-2">{icon}</span>{type}
            <p className="text-xs text-gray-400 mt-0.5 ml-6">{desc}</p>
          </button>
        ))}
      </div>

      {/* 미리보기 + 내보내기 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 툴바 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Eye size={16} /> 미리보기 — {selectedType}
          </p>
          {preview && (
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-secondary text-xs gap-1.5"
                onClick={handleCopy}
              >
                <Clipboard size={12} /> 텍스트 복사
              </button>
              <button
                className="btn-secondary text-xs gap-1.5"
                onClick={() => handleExport('excel')}
                disabled={!!exporting}
              >
                <FileSpreadsheet size={12} /> {exporting === 'excel' ? '생성중...' : 'Excel'}
              </button>
              <button
                className="btn-secondary text-xs gap-1.5"
                onClick={() => handleExport('word')}
                disabled={!!exporting}
              >
                <FileType size={12} /> {exporting === 'word' ? '생성중...' : 'Word'}
              </button>
              <button
                className="btn-primary text-xs gap-1.5"
                onClick={() => handleExport('pdf')}
                disabled={!!exporting}
              >
                <Download size={12} /> {exporting === 'pdf' ? '생성중...' : 'PDF'}
              </button>
            </div>
          )}
        </div>

        {/* 미리보기 영역 */}
        <div className="card flex-1 p-5 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">생성 중...</div>
          ) : preview ? (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">{preview}</pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <FileText size={32} className="mb-2 opacity-30" />
              <p>왼쪽에서 문서 유형을 선택하세요</p>
            </div>
          )}
        </div>

        {/* 안내 */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700 font-medium mb-1">📋 공문서 품질 보장</p>
          <p className="text-xs text-blue-600">모든 출력물에 문서번호 · 발행일 · 아첼 오케스트라 명칭이 자동 포함됩니다. 현재 선택된 연주회 데이터만 사용합니다.</p>
        </div>
      </div>
    </div>
  );
}

