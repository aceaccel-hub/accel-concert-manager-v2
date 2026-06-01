import { useState, useRef } from 'react';
import { Save, RotateCcw, Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/store';
import { db, initSampleData, exportAllData, importAllData } from '../../db/database';
import Modal from '../common/Modal';
import type { BackupBundle, Settings } from '../../types';

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useStore();
  const [form, setForm] = useState<Settings>({ ...settings });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flash = (kind: 'ok' | 'err', text: string, ms = 2000) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), ms);
  };

  const handleSave = () => {
    updateSettings(form);
    flash('ok', '설정이 저장되었습니다.');
  };

  const handleBackup = async () => {
    try {
      const bundle = await exportAllData();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accel_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash('ok', '백업 파일이 저장되었습니다.', 3000);
    } catch (e: any) {
      flash('err', '백업 실패: ' + (e?.message ?? '오류'));
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('현재 데이터가 복원 파일로 교체됩니다.\n계속하시겠습니까?')) {
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const data: BackupBundle = JSON.parse(text);
      await importAllData(data);
      flash('ok', '데이터가 복원되었습니다. 페이지를 새로고침합니다.', 1500);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      if (err?.message === 'INVALID_BACKUP_VERSION') {
        flash('err', '백업 파일 버전이 호환되지 않습니다.');
      } else {
        flash('err', '복원 실패: ' + (err?.message ?? '오류'));
      }
    } finally {
      e.target.value = '';
    }
  };

  const handleSampleData = async () => {
    if (!confirm('샘플 데이터를 불러오시겠습니까? (DB가 비어있을 때만 추가됩니다)')) return;
    await initSampleData();
    flash('ok', '샘플 데이터 시드가 완료되었습니다.');
  };

  const handleClearAll = async () => {
    await db.delete();
    window.location.reload();
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
          {msg && (
            <p
              className={`text-sm font-medium ${
                msg.kind === 'ok' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>

        {/* 기본 설정 */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            기본 설정
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">기본 연도</label>
              <input
                type="number"
                className="input"
                value={form.baseYear}
                onChange={(e) => set('baseYear', +e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">대시보드 통계의 기준 연도</p>
            </div>
            <div>
              <label className="label">문서 출력 형식</label>
              <select
                className="input"
                value={form.outputFormat}
                onChange={(e) => set('outputFormat', e.target.value as Settings['outputFormat'])}
              >
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
              </select>
            </div>
            <div>
              <label className="label">자동 저장 간격 (분)</label>
              <input
                type="number"
                className="input"
                value={form.autoSaveInterval}
                onChange={(e) => set('autoSaveInterval', +e.target.value)}
              />
            </div>
            <div>
              <label className="label">자동 백업 주기 (일)</label>
              <input
                type="number"
                className="input"
                value={form.backupCycle}
                onChange={(e) => set('backupCycle', +e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={handleSave}>
              <Save size={14} /> 설정 저장
            </button>
            <button className="btn-secondary" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} /> 기본값 복구
            </button>
          </div>
        </section>


        {/* 데이터 관리 */}
        <section className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            데이터 관리
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary flex items-center gap-2 justify-center" onClick={handleBackup}>
              <Download size={14} /> 백업 내보내기
            </button>
            <button
              className="btn-secondary flex items-center gap-2 justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> 백업 복원
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestore}
              />
            </button>
            <button
              className="btn-secondary flex items-center gap-2 justify-center"
              onClick={handleSampleData}
            >
              <Database size={14} /> 샘플 데이터 삽입
            </button>
            <button
              className="btn-danger flex items-center gap-2 justify-center"
              onClick={() => setConfirmClear(true)}
            >
              <AlertTriangle size={14} /> 전체 초기화
            </button>
          </div>
          <p className="text-xs text-gray-400">
            백업 파일은 JSON 형식으로 저장되며 (version: 1), 복원 시 현재 데이터가 모두 교체됩니다.
          </p>
        </section>

        {/* 시스템 정보 */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">
            시스템 정보
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>버전: Accel Concert Manager v1.0</p>
            <p>저장소: IndexedDB (로컬)</p>
            <p>스택: React 19 · React Router 7 · Zustand · Dexie · Tailwind 4</p>
          </div>
        </section>
      </div>

      {confirmReset && (
        <Modal
          title="기본값 복구"
          onClose={() => setConfirmReset(false)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setConfirmReset(false)}>
                취소
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  resetSettings();
                  setForm({ ...useStore.getState().settings });
                  setConfirmReset(false);
                  flash('ok', '설정을 기본값으로 복구했습니다.');
                }}
              >
                복구
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-700">모든 설정을 기본값으로 되돌리시겠습니까?</p>
        </Modal>
      )}

      {confirmClear && (
        <Modal
          title="모든 데이터 초기화"
          onClose={() => setConfirmClear(false)}
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>
                취소
              </button>
              <button className="btn-danger" onClick={handleClearAll}>
                초기화
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-700 font-medium">
            모든 연주회·단원·곡목·예산 등 데이터를 영구 삭제합니다.
          </p>
          <p className="text-xs text-red-600 mt-2">이 작업은 되돌릴 수 없습니다.</p>
        </Modal>
      )}
    </div>
  );
}
