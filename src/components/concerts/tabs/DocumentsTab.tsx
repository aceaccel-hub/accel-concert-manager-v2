import { useState } from 'react';
import { FileText, Download, Clipboard, Eye } from 'lucide-react';
import { db } from '../../../db/database';
import type { Concert } from '../../../types';

interface Props { concertId: string; concert: Concert; }

const DOC_TYPES = [
  { type: '곡목표', icon: '🎵', desc: '연주 곡목 전체 목록' },
  { type: '단원명단', icon: '👥', desc: '참여 단원 명단' },
  { type: '리허설일정표', icon: '📅', desc: '연습 일정 전체' },
  { type: '정산표', icon: '💰', desc: '예산 및 지출 내역' },
  { type: '프로그램북원고', icon: '📖', desc: '공연 프로그램북 원고' },
  { type: '공지문', icon: '📢', desc: '단원 공지문' },
  { type: '체크리스트', icon: '✅', desc: '준비 체크리스트' },
] as const;

export default function DocumentsTab({ concertId, concert }: Props) {
  const [selectedType, setSelectedType] = useState<string>('곡목표');
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateDocument = async (type: string): Promise<string> => {
    const programs = await db.programItems.where('concertId').equals(concertId).sortBy('order');
    const cms = await db.concertMembers.where('concertId').equals(concertId).toArray();
    const allMembers = await db.members.toArray();
    const rehearsals = await db.rehearsals.where('concertId').equals(concertId).sortBy('date');
    const budgets = await db.budgets.where('concertId').equals(concertId).toArray();
    const cgs = await db.concertGroups.where('concertId').equals(concertId).toArray();
    const allGroups = await db.groups.toArray();
    const checklists = await db.checklists.where('concertId').equals(concertId).sortBy('order');

    const header = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${concert.title}
날짜: ${concert.date} ${concert.time}
장소: ${concert.place}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (type === '곡목표') {
      const totalDur = programs.reduce((s, p) => s + (p.duration || 0), 0);
      return header + `【 곡 목 표 】\n\n` +
        programs.map(p => `${p.order}. ${p.composer}\n   ${p.title}${p.movement ? ` (${p.movement})` : ''}${p.soloist ? `\n   협연: ${p.soloist}` : ''}\n   예상 시간: ${p.duration || '-'}분`).join('\n\n') +
        `\n\n총 ${programs.length}곡 · 예상 ${totalDur}분`;
    }

    if (type === '단원명단') {
      const members = cms.map(cm => ({ ...cm, member: allMembers.find(m => m.id === cm.memberId) })).filter(cm => !cm.isReserve);
      const byPart: Record<string, typeof members> = {};
      members.forEach(m => { const p = m.part || m.member?.part || '기타'; if (!byPart[p]) byPart[p] = []; byPart[p].push(m); });
      return header + `【 단 원 명 단 】\n총 ${members.length}명\n\n` +
        Object.entries(byPart).map(([part, mbs]) =>
          `▶ ${part} (${mbs.length}명)\n` + mbs.map(m => `  · ${m.member?.name || '?'} (${m.role || m.member?.role})`).join('\n')
        ).join('\n\n');
    }

    if (type === '리허설일정표') {
      return header + `【 리허설 일정표 】\n\n` +
        (rehearsals.length === 0 ? '등록된 연습 일정이 없습니다.' :
          rehearsals.map(r => `• ${r.date} ${r.time} | ${r.place}\n  유형: ${r.type}${r.targetPieces?.length ? `\n  대상곡: ${r.targetPieces.join(', ')}` : ''}${r.memo ? `\n  메모: ${r.memo}` : ''}`).join('\n\n'));
    }

    if (type === '정산표') {
      const income = budgets.filter(b => b.type === '수입');
      const expense = budgets.filter(b => b.type === '지출');
      const totalIncome = income.reduce((s, b) => s + b.plannedAmount, 0);
      const totalPaid = expense.reduce((s, b) => s + b.paidAmount, 0);
      return header + `【 정 산 표 】\n\n` +
        `▶ 수입\n` + income.map(b => `  · ${b.title}: ${b.plannedAmount.toLocaleString()}원`).join('\n') +
        `\n  합계: ${totalIncome.toLocaleString()}원\n\n` +
        `▶ 지출\n` + expense.map(b => `  · ${b.title}: ${b.paidAmount.toLocaleString()}원 (${b.paymentStatus})`).join('\n') +
        `\n  합계: ${totalPaid.toLocaleString()}원\n\n` +
        `잔여 예산: ${(totalIncome - totalPaid).toLocaleString()}원`;
    }

    if (type === '프로그램북원고') {
      const groups = cgs.map(cg => ({ role: cg.role, group: allGroups.find(g => g.id === cg.groupId) }));
      return header + `【 프로그램북 원고 】\n\n` +
        groups.map(g => `${g.role}: ${g.group?.name}`).join('\n') +
        `\n지휘: ${concert.conductor}${concert.coPerformer ? `\n협연: ${concert.coPerformer}` : ''}\n\n` +
        `─── 프로그램 ───\n\n` +
        programs.map(p => `${p.composer}\n${p.title}${p.movement ? `\n${p.movement}` : ''}${p.soloist ? `\n\n협연: ${p.soloist}` : ''}`).join('\n\n');
    }

    if (type === '공지문') {
      const nextRehearsal = rehearsals.find(r => r.date >= new Date().toISOString().split('T')[0]);
      return header + `【 단원 공지문 】\n\n안녕하세요. ${concert.title} 관련 공지드립니다.\n\n` +
        `■ 공연 정보\n일시: ${concert.date} ${concert.time}\n장소: ${concert.place}\n지휘: ${concert.conductor}\n\n` +
        (nextRehearsal ? `■ 다음 연습\n일시: ${nextRehearsal.date} ${nextRehearsal.time}\n장소: ${nextRehearsal.place}\n유형: ${nextRehearsal.type}\n\n` : '') +
        `많은 참여 바랍니다. 감사합니다.`;
    }

    if (type === '체크리스트') {
      return header + `【 준비 체크리스트 】\n\n` +
        checklists.map(c => `${c.isDone ? '☑' : '☐'} ${c.title}`).join('\n');
    }

    return '문서 생성 중...';
  };

  const handlePreview = async (type: string) => {
    setSelectedType(type);
    setLoading(true);
    const text = await generateDocument(type);
    setPreview(text);
    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview);
    alert('클립보드에 복사되었습니다!');
  };

  const handleDownload = () => {
    const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${concert.title}_${selectedType}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 flex gap-6 h-full">
      {/* 문서 유형 선택 */}
      <div className="w-56 space-y-1.5 shrink-0">
        <p className="text-sm font-semibold text-gray-700 mb-3">문서 유형</p>
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

      {/* 미리보기 */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Eye size={16} /> 미리보기 — {selectedType}
          </p>
          {preview && (
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={handleCopy}>
                <Clipboard size={12} /> 복사
              </button>
              <button className="btn-primary text-xs" onClick={handleDownload}>
                <Download size={12} /> 텍스트 저장
              </button>
            </div>
          )}
        </div>
        <div className="card flex-1 p-5 overflow-y-auto">
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
        <p className="text-xs text-gray-400 mt-2">
          ※ 이 문서는 현재 선택된 연주회 데이터만 사용합니다.
        </p>
      </div>
    </div>
  );
}
