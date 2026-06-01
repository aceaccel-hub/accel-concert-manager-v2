import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Clipboard, Eye, Plus, Trash2, FileSpreadsheet, FileDown, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import type { ConcertDocument, DocumentType, Member, Concert } from '../../../types';
import {
  getDocuments,
  createDocument,
  deleteDocument,
} from '../../../hooks/useDocuments';
import { getProgramItems } from '../../../hooks/useProgram';
import { getConcertMembers, getAllMembers } from '../../../hooks/useMembers';
import { getRehearsals } from '../../../hooks/useRehearsals';
import { getBudgets } from '../../../hooks/useBudget';
import { getConcertGroups } from '../../../hooks/useGroups';
import { getChecklists } from '../../../hooks/useChecklists';
import { getMasterItemValues } from '../../../hooks/useMasterItems';
import Modal from '../../common/Modal';
import type { ConcertTabContext } from '../ConcertDetail';

const DOC_TYPES: { type: DocumentType; icon: string; desc: string }[] = [
  { type: '곡목표', icon: '🎵', desc: '연주 곡목 전체 목록' },
  { type: '단원명단', icon: '👥', desc: '참여 단원 명단' },
  { type: '리허설일정표', icon: '📅', desc: '연습 일정 전체' },
  { type: '정산표', icon: '💰', desc: '예산 및 지출 내역' },
  { type: '프로그램북원고', icon: '📖', desc: '공연 프로그램북 원고' },
  { type: '공지문', icon: '📢', desc: '단원 공지문' },
  { type: '체크리스트', icon: '✅', desc: '준비 체크리스트' },
  { type: '단원모집공고문', icon: '📣', desc: 'Guest 단원 모집 공고' },
  { type: '기획서', icon: '📋', desc: '연주회 기획서' },
  { type: '견적서', icon: '🧾', desc: '견적 주문서' },
];

export default function DocumentsTab() {
  const { concert } = useOutletContext<ConcertTabContext>();
  const concertId = concert.id;

  const [selectedType, setSelectedType] = useState<DocumentType>('곡목표');
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savedDocs, setSavedDocs] = useState<ConcertDocument[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [docTitle, setDocTitle] = useState('');

  const loadSaved = async () => {
    setSavedDocs(await getDocuments(concertId));
  };

  useEffect(() => {
    loadSaved();
    handlePreview('곡목표');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  // ---------- Raw data fetch (shared by all export functions) ----------
  const fetchAllData = async () => {
    const [programs, cms, rehearsals, budgets, cgs, checklists] = await Promise.all([
      getProgramItems(concertId),
      getConcertMembers(concertId),
      getRehearsals(concertId),
      getBudgets(concertId),
      getConcertGroups(concertId),
      getChecklists(concertId),
    ]);
    return { programs, cms, rehearsals, budgets, cgs, checklists };
  };

  const docNumber = () =>
    `ACM-${concertId.slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  // ---------- Text preview (unchanged) ----------
  const generateDocument = async (type: DocumentType): Promise<string> => {
    const { programs, cms, rehearsals, budgets, cgs, checklists } = await fetchAllData();

    const header = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${concert.title}
날짜: ${concert.date} ${concert.time}
장소: ${concert.place}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    if (type === '곡목표') {
      const totalDur = programs.reduce((s, p) => s + (p.duration ?? 0), 0);
      return (
        header +
        `【 곡 목 표 】\n\n` +
        programs
          .map(
            (p) =>
              `${p.order}. ${p.composer}\n   ${p.title}${
                p.movement ? ` (${p.movement})` : ''
              }${p.soloist ? `\n   협연: ${p.soloist}` : ''}\n   예상 시간: ${p.duration ?? '-'}분`
          )
          .join('\n\n') +
        `\n\n총 ${programs.length}곡 · 예상 ${totalDur}분`
      );
    }

    if (type === '단원명단') {
      const members = cms.filter((cm) => !cm.isReserve);
      const byPart: Record<string, typeof members> = {};
      members.forEach((m) => {
        const p = m.part || m.member?.part || '기타';
        if (!byPart[p]) byPart[p] = [];
        byPart[p].push(m);
      });
      return (
        header +
        `【 단 원 명 단 】\n총 ${members.length}명\n\n` +
        Object.entries(byPart)
          .map(
            ([part, mbs]) =>
              `▶ ${part} (${mbs.length}명)\n` +
              mbs.map((m) => `  · ${m.member?.name ?? '?'} (${m.role ?? m.member?.role ?? '-'})`).join('\n')
          )
          .join('\n\n')
      );
    }

    if (type === '리허설일정표') {
      return (
        header +
        `【 리허설 일정표 】\n\n` +
        (rehearsals.length === 0
          ? '등록된 연습 일정이 없습니다.'
          : rehearsals
              .map(
                (r) =>
                  `• ${r.date} ${r.time} | ${r.place}\n  유형: ${r.type}${
                    r.targetPieces?.length ? `\n  대상곡: ${r.targetPieces.join(', ')}` : ''
                  }${r.memo ? `\n  메모: ${r.memo}` : ''}`
              )
              .join('\n\n'))
      );
    }

    if (type === '정산표') {
      const income = budgets.filter((b) => b.type === '수입');
      const expense = budgets.filter((b) => b.type === '지출');
      const totalIncome = income.reduce((s, b) => s + b.plannedAmount, 0);
      const totalPaidIn = income.reduce((s, b) => s + b.paidAmount, 0);
      const totalPaid = expense.reduce((s, b) => s + b.paidAmount, 0);
      return (
        header +
        `【 정 산 표 】\n\n` +
        `▶ 수입\n` +
        income.map((b) => `  · ${b.title}: ${b.paidAmount.toLocaleString()}원 (계획 ${b.plannedAmount.toLocaleString()}원, ${b.paymentStatus})`).join('\n') +
        `\n  실집행 합계: ${totalPaidIn.toLocaleString()}원 / 계획 ${totalIncome.toLocaleString()}원\n\n` +
        `▶ 지출\n` +
        expense.map((b) => `  · ${b.title}: ${b.paidAmount.toLocaleString()}원 (${b.paymentStatus})`).join('\n') +
        `\n  실집행 합계: ${totalPaid.toLocaleString()}원\n\n` +
        `잔액: ${(totalPaidIn - totalPaid).toLocaleString()}원`
      );
    }

    if (type === '프로그램북원고') {
      return (
        header +
        `【 프로그램북 원고 】\n\n` +
        cgs.map((g: any) => `${g.role}: ${g.group?.name}`).join('\n') +
        `\n지휘: ${concert.conductor}${concert.coPerformer ? `\n협연: ${concert.coPerformer}` : ''}\n\n` +
        `─── 프로그램 ───\n\n` +
        programs
          .map(
            (p) =>
              `${p.composer}\n${p.title}${p.movement ? `\n${p.movement}` : ''}${
                p.soloist ? `\n\n협연: ${p.soloist}` : ''
              }`
          )
          .join('\n\n')
      );
    }

    if (type === '공지문') {
      const nextRehearsal = rehearsals.find((r) => r.date >= new Date().toISOString().split('T')[0]);
      return (
        header +
        `【 단원 공지문 】\n\n안녕하세요. ${concert.title} 관련 공지드립니다.\n\n` +
        `■ 공연 정보\n일시: ${concert.date} ${concert.time}\n장소: ${concert.place}\n지휘: ${concert.conductor}\n\n` +
        (nextRehearsal
          ? `■ 다음 연습\n일시: ${nextRehearsal.date} ${nextRehearsal.time}\n장소: ${nextRehearsal.place}\n유형: ${nextRehearsal.type}\n\n`
          : '') +
        `많은 참여 바랍니다. 감사합니다.`
      );
    }

    if (type === '체크리스트') {
      return (
        header +
        `【 준비 체크리스트 】\n\n` +
        checklists.map((c) => `${c.isDone ? '☑' : '☐'} ${c.title}`).join('\n')
      );
    }

    return '문서 생성 중...';
  };

  const handlePreview = async (type: DocumentType) => {
    setSelectedType(type);
    setLoading(true);
    const text = await generateDocument(type);
    setPreview(text);
    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview);
    alert('클립보드에 복사되었습니다.');
  };

  // ---------- PDF 내보내기 (print window — 테이블 형식) ----------
  const handleExportPDF = async () => {
    const { programs, cms, rehearsals, budgets, checklists } = await fetchAllData();
    const num = docNumber();
    const today = new Date().toLocaleDateString('ko-KR');

    const esc = (s: string | number) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const makeTable = (headers: string[], rows: (string | number)[][]) => {
      const ths = headers.map((h) => `<th>${esc(h)}</th>`).join('');
      const trs = rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    };

    let bodyHtml = '';

    if (selectedType === '곡목표') {
      const totalDur = programs.reduce((s, p) => s + (p.duration ?? 0), 0);
      bodyHtml =
        makeTable(
          ['순서', '작곡가', '곡명', '악장/부제', '협연자', '예상시간', '악보', '파트보'],
          programs.map((p) => [
            p.order, p.composer, p.title, p.movement || '-', p.soloist || '-',
            p.duration ? `${p.duration}분` : '-', p.scoreStatus, p.partScoreStatus,
          ])
        ) + `<p class="summary">총 ${programs.length}곡 · 예상 ${totalDur}분</p>`;
    } else if (selectedType === '단원명단') {
      const members = cms.filter((m) => !m.isReserve);
      bodyHtml =
        makeTable(
          ['파트', '이름', '역할', '연락처', '사례비', '등급'],
          members.map((m) => [
            m.part || m.member?.part || '기타',
            m.member?.name || '',
            m.role || m.member?.role || '',
            m.member?.phone || '',
            m.fee ? `${m.fee.toLocaleString()}원` : '',
            m.member?.abilityGrade || '',
          ])
        ) + `<p class="summary">총 ${members.length}명</p>`;
    } else if (selectedType === '리허설일정표') {
      bodyHtml = makeTable(
        ['날짜', '시간', '장소', '유형', '대상곡', '진행도', '메모'],
        rehearsals.map((r) => [
          r.date, r.time, r.place, r.type,
          (r.targetPieces || []).join(', '),
          r.progressRate != null ? `${r.progressRate}%` : '',
          r.memo || '',
        ])
      );
    } else if (selectedType === '정산표') {
      const income = budgets.filter((b) => b.type === '수입');
      const expense = budgets.filter((b) => b.type === '지출');
      const totalPaidIn = income.reduce((s, b) => s + b.paidAmount, 0);
      const totalPaid = expense.reduce((s, b) => s + b.paidAmount, 0);
      bodyHtml =
        makeTable(
          ['구분', '항목', '카테고리', '계획액(원)', '집행액(원)', '상태'],
          [
            ...income.map((b) => ['수입', b.title, b.category, b.plannedAmount.toLocaleString(), b.paidAmount.toLocaleString(), b.paymentStatus]),
            ...expense.map((b) => ['지출', b.title, b.category, b.plannedAmount.toLocaleString(), b.paidAmount.toLocaleString(), b.paymentStatus]),
          ]
        ) +
        `<p class="summary">수입 집행 ${totalPaidIn.toLocaleString()}원 · 지출 집행 ${totalPaid.toLocaleString()}원 · 잔액 ${(totalPaidIn - totalPaid).toLocaleString()}원</p>`;
    } else if (selectedType === '체크리스트') {
      bodyHtml = makeTable(
        ['순서', '항목', '완료여부'],
        checklists.map((c, i) => [i + 1, c.title, c.isDone ? '완료 ✓' : '미완료'])
      );
    } else {
      bodyHtml = `<pre>${esc(preview)}</pre>`;
    }

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${esc(concert.title)} — ${esc(selectedType)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans KR',sans-serif;padding:40px;color:#1a1a1a;font-size:11px;line-height:1.6}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1a2744;padding-bottom:12px;margin-bottom:18px}
    .org{font-size:16px;font-weight:700;color:#1a2744}
    .org-sub{font-size:10px;color:#888;margin-top:2px}
    .meta{text-align:right;font-size:10px;color:#555;line-height:1.8}
    h1{font-size:18px;font-weight:700;text-align:center;margin:0 0 20px;color:#1a2744}
    table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:10.5px}
    thead tr{background:#e8eef8}
    th{padding:7px 10px;text-align:left;font-weight:700;border:1px solid #c5d0e0;white-space:nowrap}
    td{padding:6px 10px;border:1px solid #dde4ed;vertical-align:top}
    tr:nth-child(even) td{background:#f8fafd}
    .summary{margin-top:8px;font-size:10px;color:#555;text-align:right}
    pre{font-family:'Noto Sans KR',sans-serif;white-space:pre-wrap;font-size:10.5px;line-height:1.9}
    @media print{@page{margin:15mm}body{padding:0}}
  </style>
</head>
<body>
  <div class="hd">
    <div>
      <div class="org">아첼 오케스트라</div>
      <div class="org-sub">ACCEL Orchestra</div>
    </div>
    <div class="meta">
      문서번호: ${esc(num)}<br>
      발행일자: ${esc(today)}<br>
      발행기관: 아첼 오케스트라
    </div>
  </div>
  <h1>${esc(selectedType)}</h1>
  ${bodyHtml}
</body>
</html>`;

    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) {
      alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.addEventListener('load', () => setTimeout(() => w.print(), 400));
  };

  // ---------- Excel 내보내기 ----------
  const handleExportExcel = async () => {
    const { programs, cms, rehearsals, budgets, checklists } = await fetchAllData();
    const num = docNumber();
    const today = new Date().toLocaleDateString('ko-KR');
    const filename = `${concert.title}_${selectedType}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const metaRows: (string | number)[][] = [
      ['아첼 오케스트라 (ACCEL Orchestra)'],
      [`문서번호: ${num}`, '', `발행일자: ${today}`],
      [`연주회: ${concert.title}`, '', `일시: ${concert.date} ${concert.time}`, '', `장소: ${concert.place}`],
      [],
    ];

    let dataRows: (string | number)[][] = [];

    if (selectedType === '곡목표') {
      const totalDur = programs.reduce((s, p) => s + (p.duration ?? 0), 0);
      dataRows = [
        ['【 곡 목 표 】'],
        ['순서', '작곡가', '곡명', '악장/부제', '협연자', '예상시간(분)', '악보', '파트보'],
        ...programs.map((p) => [
          p.order, p.composer, p.title, p.movement || '', p.soloist || '',
          p.duration ?? '', p.scoreStatus, p.partScoreStatus,
        ]),
        [],
        [`총 ${programs.length}곡`, '', '', '', '', `예상 ${totalDur}분`],
      ];
    } else if (selectedType === '단원명단') {
      const members = cms.filter((m) => !m.isReserve);
      dataRows = [
        ['【 단 원 명 단 】'],
        ['파트', '이름', '역할', '연락처', '사례비', '등급'],
        ...members.map((m) => [
          m.part || m.member?.part || '기타',
          m.member?.name || '',
          m.role || m.member?.role || '',
          m.member?.phone || '',
          m.fee ? `${m.fee.toLocaleString()}원` : '',
          m.member?.abilityGrade || '',
        ]),
        [],
        [`총 ${members.length}명`],
      ];
    } else if (selectedType === '리허설일정표') {
      dataRows = [
        ['【 리허설 일정표 】'],
        ['날짜', '시간', '장소', '유형', '대상곡', '진행도(%)', '메모'],
        ...rehearsals.map((r) => [
          r.date, r.time, r.place, r.type,
          (r.targetPieces || []).join(', '),
          r.progressRate ?? '',
          r.memo || '',
        ]),
      ];
    } else if (selectedType === '정산표') {
      const income = budgets.filter((b) => b.type === '수입');
      const expense = budgets.filter((b) => b.type === '지출');
      dataRows = [
        ['【 정 산 표 】'],
        ['구분', '항목', '카테고리', '계획액(원)', '집행액(원)', '상태'],
        ...income.map((b) => ['수입', b.title, b.category, b.plannedAmount, b.paidAmount, b.paymentStatus]),
        ...expense.map((b) => ['지출', b.title, b.category, b.plannedAmount, b.paidAmount, b.paymentStatus]),
        [],
        ['', '수입 합계', '', income.reduce((s, b) => s + b.plannedAmount, 0), income.reduce((s, b) => s + b.paidAmount, 0), ''],
        ['', '지출 합계', '', expense.reduce((s, b) => s + b.plannedAmount, 0), expense.reduce((s, b) => s + b.paidAmount, 0), ''],
        ['', '잔액', '', '', income.reduce((s, b) => s + b.paidAmount, 0) - expense.reduce((s, b) => s + b.paidAmount, 0), ''],
      ];
    } else if (selectedType === '체크리스트') {
      dataRows = [
        ['【 준비 체크리스트 】'],
        ['순서', '항목', '완료여부'],
        ...checklists.map((c, i) => [i + 1, c.title, c.isDone ? '완료' : '미완료']),
      ];
    } else {
      dataRows = [[preview]];
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...metaRows, ...dataRows]);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        ws[addr].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: false } };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, selectedType);
    XLSX.writeFile(wb, filename);
  };

  // ---------- Word 내보내기 ----------
  const handleExportWord = async () => {
    const { programs, cms, rehearsals, budgets, checklists } = await fetchAllData();
    const num = docNumber();
    const today = new Date().toLocaleDateString('ko-KR');
    const filename = `${concert.title}_${selectedType}_${new Date().toISOString().slice(0, 10)}.docx`;

    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      HeadingLevel, AlignmentType, WidthType,
    } = await import('docx');

    const makeCell = (text: string, bold = false, shading?: string) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold, size: 18 })],
          }),
        ],
        shading: shading ? { fill: shading } : undefined,
      });

    const headerSection = [
      new Paragraph({
        children: [
          new TextRun({ text: '아첼 오케스트라 (ACCEL Orchestra)', bold: true, size: 26, color: '1a2744' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `문서번호: ${num}     발행일자: ${today}`, size: 16, color: '666666' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `연주회: ${concert.title}  |  ${concert.date} ${concert.time}  |  ${concert.place}`, size: 18 }),
        ],
      }),
      new Paragraph({ children: [new TextRun({ text: '' })] }),
      new Paragraph({
        children: [new TextRun({ text: selectedType, bold: true, size: 36, color: '1a2744' })],
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({ children: [new TextRun({ text: '' })] }),
    ];

    let contentSection: InstanceType<typeof Paragraph | typeof Table>[] = [];

    if (selectedType === '곡목표') {
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['순서', '작곡가', '곡명', '악장', '협연자', '예상시간'].map(
              (h) => makeCell(h, true, 'E8EEF8')
            ),
            tableHeader: true,
          }),
          ...programs.map((p) =>
            new TableRow({
              children: [
                String(p.order), p.composer, p.title,
                p.movement || '-', p.soloist || '-',
                p.duration ? `${p.duration}분` : '-',
              ].map((c) => makeCell(c)),
            })
          ),
        ],
      });
      contentSection = [table];
    } else if (selectedType === '단원명단') {
      const members = cms.filter((m) => !m.isReserve);
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['파트', '이름', '역할', '연락처', '사례비', '등급'].map(
              (h) => makeCell(h, true, 'E8EEF8')
            ),
            tableHeader: true,
          }),
          ...members.map((m) =>
            new TableRow({
              children: [
                m.part || m.member?.part || '기타',
                m.member?.name || '',
                m.role || m.member?.role || '',
                m.member?.phone || '',
                m.fee ? `${m.fee.toLocaleString()}원` : '',
                m.member?.abilityGrade || '',
              ].map((c) => makeCell(c)),
            })
          ),
        ],
      });
      contentSection = [table];
    } else if (selectedType === '리허설일정표') {
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['날짜', '시간', '장소', '유형', '대상곡', '진행도'].map(
              (h) => makeCell(h, true, 'E8EEF8')
            ),
            tableHeader: true,
          }),
          ...rehearsals.map((r) =>
            new TableRow({
              children: [
                r.date, r.time, r.place, r.type,
                (r.targetPieces || []).join(', '),
                r.progressRate != null ? `${r.progressRate}%` : '',
              ].map((c) => makeCell(c)),
            })
          ),
        ],
      });
      contentSection = [table];
    } else if (selectedType === '정산표') {
      const income = budgets.filter((b) => b.type === '수입');
      const expense = budgets.filter((b) => b.type === '지출');
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['구분', '항목', '카테고리', '계획액', '집행액', '상태'].map(
              (h) => makeCell(h, true, 'E8EEF8')
            ),
            tableHeader: true,
          }),
          ...income.map((b) =>
            new TableRow({
              children: ['수입', b.title, b.category, `${b.plannedAmount.toLocaleString()}원`, `${b.paidAmount.toLocaleString()}원`, b.paymentStatus].map((c) => makeCell(c)),
            })
          ),
          ...expense.map((b) =>
            new TableRow({
              children: ['지출', b.title, b.category, `${b.plannedAmount.toLocaleString()}원`, `${b.paidAmount.toLocaleString()}원`, b.paymentStatus].map((c) => makeCell(c)),
            })
          ),
        ],
      });
      contentSection = [table];
    } else if (selectedType === '체크리스트') {
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['순서', '항목', '완료여부'].map((h) => makeCell(h, true, 'E8EEF8')),
            tableHeader: true,
          }),
          ...checklists.map((c, i) =>
            new TableRow({
              children: [String(i + 1), c.title, c.isDone ? '완료 ✓' : '미완료'].map((v) => makeCell(v)),
            })
          ),
        ],
      });
      contentSection = [table];
    } else {
      contentSection = preview.split('\n').map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, size: 20 })],
            spacing: { after: 80 },
          })
      );
    }

    const doc = new Document({
      sections: [{ children: [...headerSection, ...contentSection] }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!docTitle.trim()) {
      alert('문서 제목을 입력하세요.');
      return;
    }
    await createDocument(concertId, {
      type: selectedType,
      title: docTitle.trim(),
      fileFormat: 'txt',
      content: preview,
    });
    setShowSave(false);
    setDocTitle('');
    loadSaved();
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    loadSaved();
  };

  return (
    <div className="p-6 flex gap-6 h-full overflow-hidden">
      {/* 문서 유형 선택 + 저장된 문서 */}
      <div className="w-60 space-y-4 shrink-0 overflow-y-auto">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">문서 유형</p>
          <div className="space-y-1.5">
            {DOC_TYPES.map(({ type, icon, desc }) => (
              <button
                key={type}
                onClick={() => handlePreview(type)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                  selectedType === type
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{icon}</span>
                {type}
                <p className="text-[10px] text-gray-400 mt-0.5 ml-5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {savedDocs.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">저장된 문서</p>
            <div className="space-y-1.5">
              {savedDocs.map((d) => (
                <div
                  key={d.id}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{d.title}</p>
                    <p className="text-[10px] text-gray-400">{d.type}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="text-gray-300 hover:text-red-500 ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 미리보기 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Eye size={16} /> 미리보기 — {selectedType}
          </p>

          {preview && (
            <div className="flex gap-1.5 flex-wrap">
              <button className="btn-secondary text-xs" onClick={() => setShowSave(true)}>
                <Plus size={12} /> 저장
              </button>
              <button className="btn-secondary text-xs" onClick={handleCopy}>
                <Clipboard size={12} /> 복사
              </button>

              {/* 내보내기 버튼 그룹 */}
              <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white text-red-600 hover:bg-red-50 transition-colors"
                  title="PDF로 내보내기 (인쇄 다이얼로그)"
                >
                  <FileDown size={12} />
                  PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white text-green-600 hover:bg-green-50 border-l border-gray-200 transition-colors"
                  title="Excel(.xlsx)로 내보내기"
                >
                  <FileSpreadsheet size={12} />
                  Excel
                </button>
                <button
                  onClick={handleExportWord}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-white text-blue-600 hover:bg-blue-50 border-l border-gray-200 transition-colors"
                  title="Word(.docx)로 내보내기"
                >
                  <FileText size={12} />
                  Word
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card flex-1 p-5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">생성 중...</div>
          ) : selectedType === '단원모집공고문' ? (
            <RecruitmentNoticeBuilder concert={concert} onPreviewChange={setPreview} />
          ) : selectedType === '기획서' ? (
            <ConcertPlanBuilder concert={concert} concertId={concertId} />
          ) : selectedType === '견적서' ? (
            <EstimateBuilder concertId={concertId} />
          ) : preview ? (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {preview}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <FileText size={32} className="mb-2 opacity-30" />
              <p>왼쪽에서 문서 유형을 선택하세요</p>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2">
          ※ PDF는 인쇄 다이얼로그를 통해 저장됩니다. Excel·Word는 파일로 직접 다운로드됩니다.
        </p>
      </div>

      {showSave && (
        <Modal
          title="문서 저장"
          onClose={() => setShowSave(false)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowSave(false)}>
                취소
              </button>
              <button className="btn-primary" onClick={handleSave}>
                저장
              </button>
            </>
          }
        >
          <div>
            <label className="label">문서 제목</label>
            <input
              className="input"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder={`${concert.title} ${selectedType}`}
            />
            <p className="text-xs text-gray-500 mt-2">
              현재 미리보기 내용을 이 연주회의 문서 목록에 저장합니다.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ 3개의 빌더 컴포넌트 ============

interface BuilderProps {
  concert: Concert;
  onPreviewChange?: (preview: string) => void;
}

const DEFAULT_INSTRUMENTS = [
  '바이올린',
  '비올라',
  '첼로',
  '콘트라베이스',
  '플루트',
  '피콜로',
  '오보에',
  '잉글리시 호른',
  '클라리넷',
  '베이스 클라리넷',
  '바순',
  '콘트라바순',
  '호른',
  '트럼펫',
  '트롬본',
  '베이스 트롬본',
  '튜바',
  '팀파니',
  '타악기',
  '하프',
  '피아노',
  '오르간',
  '성악',
  '합창',
  '기타',
];

// 단원모집공고문 빌더
function RecruitmentNoticeBuilder({
  concert,
  onPreviewChange,
}: BuilderProps) {
  const [needList, setNeedList] = useState<{ instrument: string; count: number }[]>([]);
  const [guestMembers, setGuestMembers] = useState<Member[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [showPastGuests, setShowPastGuests] = useState(false);
  const [noticeText, setNoticeText] = useState('');

  useEffect(() => {
    const load = async () => {
      const allMembers = await getAllMembers();
      const guests = allMembers.filter((m) => m.role === '객원');
      let instrumentList = await getMasterItemValues('instrument');

      // 마스터 아이템이 비어있으면 기본 악기 목록 사용
      if (instrumentList.length === 0) {
        instrumentList = DEFAULT_INSTRUMENTS;
      }

      setGuestMembers(guests);
      setInstruments(instrumentList);
    };
    load();
  }, []);

  const generatePreview = () => {
    const needText = needList.length > 0
      ? needList.map((n) => `  - ${n.instrument}: ${n.count}명`).join('\n')
      : '(필요 인원 미지정)';

    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 단원 모집 공고 】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

안녕하세요.

이번 ${concert.title}을 위해 다음과 같이 단원을 모집합니다.

■ 공연 일시: ${concert.date} ${concert.time}
■ 공연 장소: ${concert.place}

■ 모집 인원:
${needText}

관심 있으신 분은 아래로 연락 주세요.
감사합니다.`;
  };

  useEffect(() => {
    const preview = generatePreview();
    setNoticeText(preview);
    onPreviewChange?.(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needList, concert]);

  const addNeed = () => {
    setNeedList([...needList, { instrument: instruments[0] || '', count: 1 }]);
  };

  const updateNeed = (idx: number, instrument: string, count: number) => {
    const newList = [...needList];
    newList[idx] = { instrument, count };
    setNeedList(newList);
  };

  const removeNeed = (idx: number) => {
    setNeedList(needList.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">모집 인원 설정</h3>
        <div className="space-y-2">
          {needList.map((n, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <select
                className="input flex-1"
                value={n.instrument}
                onChange={(e) => updateNeed(idx, e.target.value, n.count)}
              >
                {instruments.map((inst) => (
                  <option key={inst}>{inst}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="input w-16"
                value={n.count}
                onChange={(e) => updateNeed(idx, n.instrument, +e.target.value)}
              />
              <button
                onClick={() => removeNeed(idx)}
                className="text-gray-400 hover:text-red-600"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addNeed}
          className="btn-secondary text-sm mt-2"
        >
          <Plus size={14} /> 인원 추가
        </button>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-3">공고문 편집</h3>
        <textarea
          value={noticeText}
          onChange={(e) => {
            setNoticeText(e.target.value);
            onPreviewChange?.(e.target.value);
          }}
          className="input w-full h-64 font-mono text-sm"
          placeholder="공고문 내용을 편집하세요"
        />
      </div>

      <div className="border-t pt-4">
        <button
          onClick={() => setShowPastGuests(!showPastGuests)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${showPastGuests ? 'rotate-180' : ''}`}
          />
          이전 객원 단원 ({guestMembers.length}명)
        </button>

        {showPastGuests && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {guestMembers.length > 0 ? (
              guestMembers.map((m) => (
                <div key={m.id} className="text-xs p-2 bg-gray-50 rounded">
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-gray-600">
                    {m.instrument} {m.part ? `· ${m.part}` : ''}
                  </p>
                  {m.phone && <p className="text-gray-500">{m.phone}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-2">등록된 객원 단원이 없습니다.</p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => window.print()}
        className="btn-secondary w-full"
      >
        <FileDown size={14} /> 인쇄
      </button>
    </div>
  );
}

// 기획서 빌더
function ConcertPlanBuilder({ concert, concertId }: { concert: Concert; concertId: string }) {
  const [data, setData] = useState<{
    programs: any[];
    cms: any[];
    cgs: any[];
    memo: string;
  }>({ programs: [], cms: [], cgs: [], memo: '' });

  useEffect(() => {
    const load = async () => {
      const [programs, cms, cgs] = await Promise.all([
        getProgramItems(concertId),
        getConcertMembers(concertId),
        getConcertGroups(concertId),
      ]);
      setData({ programs, cms, cgs, memo: '' });
    };
    load();
  }, [concertId]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-2">연주회 기본 정보</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>제목:</strong> {concert.title}</p>
          <p><strong>일시:</strong> {concert.date} {concert.time}</p>
          <p><strong>장소:</strong> {concert.place}</p>
          <p><strong>지휘:</strong> {concert.conductor}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-2">프로그램</h3>
        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">순</th>
              <th className="px-2 py-1 text-left">작곡가</th>
              <th className="px-2 py-1 text-left">곡명</th>
              <th className="px-2 py-1 text-center">시간</th>
            </tr>
          </thead>
          <tbody>
            {data.programs.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-2 py-1">{p.order}</td>
                <td className="px-2 py-1">{p.composer}</td>
                <td className="px-2 py-1">{p.title}</td>
                <td className="px-2 py-1 text-center">{p.duration || '-'}분</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-2">출연 단원</h3>
        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">이름</th>
              <th className="px-2 py-1 text-left">악기</th>
              <th className="px-2 py-1 text-left">파트</th>
            </tr>
          </thead>
          <tbody>
            {data.cms.map((cm) => (
              <tr key={cm.id} className="border-t">
                <td className="px-2 py-1">{cm.member?.name}</td>
                <td className="px-2 py-1">{cm.member?.instrument}</td>
                <td className="px-2 py-1">{cm.part || cm.member?.part || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className="label">특이사항</label>
        <textarea
          className="input h-20 resize-none"
          value={data.memo}
          onChange={(e) => setData({ ...data, memo: e.target.value })}
          placeholder="기획서에 포함할 추가 사항을 입력하세요"
        />
      </div>

      <button
        onClick={() => window.print()}
        className="btn-secondary w-full"
      >
        <FileDown size={14} /> 인쇄
      </button>
    </div>
  );
}

// 견적서 빌더
function EstimateBuilder({ concertId }: { concertId: string }) {
  const [items, setItems] = useState<{ name: string; qty: number; unitPrice: number }[]>([]);
  const [recipient, setRecipient] = useState('');
  const [sender, setSender] = useState('');
  const [vatEnabled, setVatEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      const budgets = await getBudgets(concertId);
      const expenseItems = budgets
        .filter((b) => b.type === '지출')
        .map((b) => ({ name: b.title, qty: 1, unitPrice: b.plannedAmount }));
      setItems(expenseItems);
    };
    load();
  }, [concertId]);

  const totalSupply = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const totalVat = vatEnabled ? Math.round(totalSupply * 0.1) : 0;
  const totalAmount = totalSupply + totalVat;

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, unitPrice: 0 }]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">수신인</label>
          <input
            type="text"
            className="input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="거래처 명"
          />
        </div>
        <div>
          <label className="label">발신인</label>
          <input
            type="text"
            className="input"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="단체 명"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">견적 항목</h3>
          <button onClick={addItem} className="btn-secondary text-sm py-1 px-2">
            <Plus size={14} /> 추가
          </button>
        </div>

        <table className="w-full text-sm border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">항목명</th>
              <th className="px-2 py-1 text-center w-12">수량</th>
              <th className="px-2 py-1 text-center w-20">단가</th>
              <th className="px-2 py-1 text-right w-20">공급가액</th>
              <th className="px-2 py-1 text-center w-12"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const supply = item.qty * item.unitPrice;
              return (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      className="input w-full py-0.5"
                      value={item.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      placeholder="항목명"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="number"
                      min={1}
                      className="input w-full text-center py-0.5"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, 'qty', +e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      className="input w-full text-right py-0.5"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-right">{supply.toLocaleString()}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>공급가액:</span>
          <span className="font-semibold">{totalSupply.toLocaleString()}원</span>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
            />
            부가세 (10%)
          </label>
          <span className="font-semibold">{totalVat.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between text-base font-bold bg-blue-50 p-2 rounded">
          <span>합계:</span>
          <span>{totalAmount.toLocaleString()}원</span>
        </div>
      </div>

      <button
        onClick={() => window.print()}
        className="btn-secondary w-full"
      >
        <FileDown size={14} /> 인쇄
      </button>
    </div>
  );
}
