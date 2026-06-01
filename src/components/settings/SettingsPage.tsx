import { useState } from 'react';
import { Save, RotateCcw, Download, Upload, Database } from 'lucide-react';
import { useStore } from '../../store/store';
import { db, initSampleData } from '../../db/database';

export default function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [form, setForm] = useState({ ...settings });
  const [msg, setMsg] = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    updateSettings(form);
    setMsg('설정이 저장되었습니다.');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleBackup = async () => {
    const data = {
      concerts: await db.concerts.toArray(),
      repertoire: await db.repertoire.toArray(),
      programItems: await db.programItems.toArray(),
      members: await db.members.toArray(),
      concertMembers: await db.concertMembers.toArray(),
      groups: await db.groups.toArray(),
      concertGroups: await db.concertGroups.toArray(),
      rehearsals: await db.rehearsals.toArray(),
      rehearsalAttendance: await db.rehearsalAttendance.toArray(),
      budgets: await db.budgets.toArray(),
      documents: await db.documents.toArray(),
      checklists: await db.checklists.toArray(),
      memos: await db.memos.toArray(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accel_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('백업 파일이 저장되었습니다.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('현재 데이터가 복원 파일로 교체됩니다.\n계속하시겠습니까?')) return;

    const text = await file.text();
    const data = JSON.parse(text);

    await db.concerts.clear(); await db.concerts.bulkAdd(data.concerts || []);
    await db.repertoire.clear(); await db.repertoire.bulkAdd(data.repertoire || []);
    await db.programItems.clear(); await db.programItems.bulkAdd(data.programItems || []);
    await db.members.clear(); await db.members.bulkAdd(data.members || []);
    await db.concertMembers.clear(); await db.concertMembers.bulkAdd(data.concertMembers || []);
    await db.groups.clear(); await db.groups.bulkAdd(data.groups || []);
    await db.concertGroups.clear(); await db.concertGroups.bulkAdd(data.concertGroups || []);
    await db.rehearsals.clear(); await db.rehearsals.bulkAdd(data.rehearsals || []);
    await db.rehearsalAttendance.clear(); await db.rehearsalAttendance.bulkAdd(data.rehearsalAttendance || []);
    await db.budgets.clear(); await db.budgets.bulkAdd(data.budgets || []);
    await db.documents.clear(); await db.documents.bulkAdd(data.documents || []);
    await db.checklists.clear(); await db.checklists.bulkAdd(data.checklists || []);
    await db.memos.clear(); await db.memos.bulkAdd(data.memos || []);

    setMsg('데이터가 복원되었습니다. 페이지를 새로고침합니다.');
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleSampleData = async () => {
    if (!confirm('샘플 데이터를 불러오시겠습니까?\n기존 데이터에 추가됩니다.')) return;
    await initSampleData();
    setMsg('샘플 데이터가 추가되었습니다.');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    if (!confirm('정말로 모든 데이터를 삭제합니까?')) return;
    await db.delete();
    window.location.reload();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
          {msg && <p className="text-sm text-green-600 font-medium">{msg}</p>}
        </div>

        {/* 기본 설정 */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">기본 설정</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">기본 연도</label>
              <input type="number" className="input" value={form.baseYear} onChange={e => set('baseYear', +e.target.value)} />
            </div>
            <div>
              <label className="label">문서 출력 형식</label>
              <select className="input" value={form.outputFormat} onChange={e => set('outputFormat', e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
              </select>
            </div>
            <div>
              <label className="label">자동 저장 간격 (분)</label>
              <input type="number" className="input" value={form.autoSaveInterval} onChange={e => set('autoSaveInterval', +e.target.value)} />
            </div>
            <div>
              <label className="label">자동 백업 주기 (일)</label>
              <input type="number" className="input" value={form.backupCycle} onChange={e => set('backupCycle', +e.target.value)} />
            </div>
          </div>
          <button className="btn-primary" onClick={handleSave}><Save size={14} /> 설정 저장</button>
        </section>

        {/* 개인정보 설정 */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">개인정보 표시</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">주민번호 마스킹</p>
                <p className="text-xs text-gray-500">920101-2****** 형식으로 표시</p>
              </div>
              <input type="checkbox" checked={form.maskResidentNumber} onChange={e => set('maskResidentNumber', e.target.checked)} className="w-4 h-4 rounded" />
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">계좌번호 마스킹</p>
                <p className="text-xs text-gray-500">110-123-****89 형식으로 표시</p>
              </div>
              <input type="checkbox" checked={form.maskBankAccount} onChange={e => set('maskBankAccount', e.target.checked)} className="w-4 h-4 rounded" />
            </label>
          </div>
          <button className="btn-primary" onClick={handleSave}><Save size={14} /> 저장</button>
        </section>

        {/* 데이터 관리 */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">데이터 관리</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary flex items-center gap-2" onClick={handleBackup}>
              <Download size={14} /> 백업 내보내기
            </button>
            <label className="btn-secondary flex items-center gap-2 cursor-pointer">
              <Upload size={14} /> 백업 복원
              <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
            </label>
            <button className="btn-secondary flex items-center gap-2" onClick={handleSampleData}>
              <Database size={14} /> 샘플 데이터
            </button>
            <button className="btn-danger flex items-center gap-2" onClick={handleClearAll}>
              <RotateCcw size={14} /> 전체 초기화
            </button>
          </div>
          <p className="text-xs text-gray-400">
            백업 파일은 JSON 형식으로 저장됩니다. 복원 시 현재 데이터가 교체됩니다.
          </p>
        </section>

        {/* 시스템 정보 */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">시스템 정보</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>버전: Accel Concert Manager v2.0</p>
            <p>저장소: IndexedDB (로컬)</p>
            <p>개발: Claude Code by Anthropic</p>
          </div>
        </section>
      </div>
    </div>
  );
}
