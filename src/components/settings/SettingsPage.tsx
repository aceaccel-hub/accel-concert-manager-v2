import { useState, useRef } from 'react';
import { Save, RotateCcw, Download, Upload, Database, AlertTriangle, Plus, Cloud } from 'lucide-react';
import { useStore } from '../../store/store';
import { initSampleData, exportAllData, importAllData, clearAllData, addMembersFromList } from '../../db/database';
import {
  getCloudSyncSettings,
  saveCloudSyncSettings,
  testCloudConnection,
  pullCloudData,
  pushCloudData,
  type CloudSyncSettings,
} from '../../services/cloudSync';
import Modal from '../common/Modal';
import type { BackupBundle, Settings } from '../../types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '오류';
}

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useStore();
  const [form, setForm] = useState<Settings>({ ...settings });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cloudSettings, setCloudSettings] = useState<CloudSyncSettings>(getCloudSyncSettings());
  const [cloudBusy, setCloudBusy] = useState<'test' | 'pull' | 'push' | null>(null);
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
    } catch (error: unknown) {
      flash('err', '백업 실패: ' + getErrorMessage(error));
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
    } catch (error: unknown) {
      if (getErrorMessage(error) === 'INVALID_BACKUP_VERSION') {
        flash('err', '백업 파일 버전이 호환되지 않습니다.');
      } else {
        flash('err', '복원 실패: ' + getErrorMessage(error));
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

  const handleAddMembers = async () => {
    if (!confirm('단원명단 21명을 추가하시겠습니까? (기존 데이터는 유지됩니다)')) return;
    try {
      await addMembersFromList();
      flash('ok', '단원명단이 추가되었습니다. 페이지를 새로고침합니다.', 1500);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: unknown) {
      flash('err', '단원명단 추가 실패: ' + getErrorMessage(error));
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllData();
      flash('ok', '모든 데이터가 초기화되었습니다. 페이지를 새로고침합니다.', 1500);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: unknown) {
      flash('err', '초기화 실패: ' + getErrorMessage(error));
    }
  };

  const handleSaveCloudSettings = () => {
    saveCloudSyncSettings(cloudSettings);
    flash('ok', '클라우드 DB 설정이 저장되었습니다.');
  };

  const handleTestCloud = async () => {
    try {
      setCloudBusy('test');
      saveCloudSyncSettings(cloudSettings);
      const result = await testCloudConnection(cloudSettings);
      flash(
        'ok',
        result.exists
          ? `클라우드 연결 성공. 마지막 저장: ${result.updatedAt?.slice(0, 16) ?? '확인됨'}`
          : '클라우드 연결 성공. 아직 저장된 데이터는 없습니다.',
        3500
      );
    } catch (error: unknown) {
      flash('err', '클라우드 연결 실패: ' + getErrorMessage(error), 4000);
    } finally {
      setCloudBusy(null);
    }
  };

  const handlePullCloud = async () => {
    if (!confirm('현재 컴퓨터의 데이터가 클라우드 데이터로 교체됩니다.\n계속하시겠습니까?')) return;

    try {
      setCloudBusy('pull');
      saveCloudSyncSettings(cloudSettings);
      const bundle = await pullCloudData(cloudSettings);
      await importAllData(bundle);
      flash('ok', '클라우드 데이터를 불러왔습니다. 페이지를 새로고침합니다.', 1500);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: unknown) {
      flash('err', '클라우드 불러오기 실패: ' + getErrorMessage(error), 4000);
    } finally {
      setCloudBusy(null);
    }
  };

  const handlePushCloud = async () => {
    if (!confirm('이 컴퓨터의 현재 데이터를 클라우드 기준 데이터로 저장합니다.\n계속하시겠습니까?')) return;

    try {
      setCloudBusy('push');
      saveCloudSyncSettings(cloudSettings);
      const bundle = await exportAllData();
      const result = await pushCloudData(bundle, cloudSettings);
      flash(
        'ok',
        `클라우드에 저장되었습니다. ${result.updatedAt?.slice(0, 16) ?? ''}`,
        3500
      );
    } catch (error: unknown) {
      flash('err', '클라우드 저장 실패: ' + getErrorMessage(error), 4000);
    } finally {
      setCloudBusy(null);
    }
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setCloud = <K extends keyof CloudSyncSettings>(k: K, v: CloudSyncSettings[K]) =>
    setCloudSettings((current) => ({ ...current, [k]: v }));

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

        {/* 클라우드 DB */}
        <section className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">클라우드 DB</h2>
            <span className="badge bg-blue-50 text-blue-700">Vercel Blob</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">클라우드 API 주소</label>
              <input
                className="input"
                placeholder="/api/cloud-state 또는 https://.../api/cloud-state"
                value={cloudSettings.endpoint}
                onChange={(e) => setCloud('endpoint', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Vercel에 배포한 사이트에서는 기본값 /api/cloud-state 를 그대로 사용할 수 있습니다.
              </p>
            </div>
            <div>
              <label className="label">동기화 코드</label>
              <input
                type="password"
                className="input"
                placeholder="선생님과 공유할 동기화 코드"
                value={cloudSettings.token}
                onChange={(e) => setCloud('token', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Vercel 환경변수 CLOUD_SYNC_TOKEN 과 같은 값을 입력해야 합니다.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary justify-center" onClick={handleSaveCloudSettings}>
              <Save size={14} /> 클라우드 설정 저장
            </button>
            <button
              className="btn-secondary justify-center"
              onClick={handleTestCloud}
              disabled={cloudBusy !== null}
            >
              <Cloud size={14} /> {cloudBusy === 'test' ? '확인 중...' : '연결 확인'}
            </button>
            <button
              className="btn-secondary justify-center"
              onClick={handlePullCloud}
              disabled={cloudBusy !== null}
            >
              <Download size={14} /> {cloudBusy === 'pull' ? '불러오는 중...' : '클라우드에서 불러오기'}
            </button>
            <button
              className="btn-primary justify-center"
              onClick={handlePushCloud}
              disabled={cloudBusy !== null}
            >
              <Upload size={14} /> {cloudBusy === 'push' ? '저장 중...' : '클라우드로 올리기'}
            </button>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 leading-relaxed">
            기존 데이터가 있는 컴퓨터에서 먼저 클라우드로 올리고, 다른 컴퓨터에서는 클라우드에서
            불러오기를 누르세요. 동시에 여러 사람이 같은 항목을 수정하는 실시간 공동 편집은 다음
            단계에서 충돌 방지 규칙을 추가해야 합니다.
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
              className="btn-secondary flex items-center gap-2 justify-center"
              onClick={handleAddMembers}
            >
              <Plus size={14} /> 단원명단 추가
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
            <p>저장소: IndexedDB (로컬 캐시) + Vercel Blob 클라우드 동기화</p>
            <p>스택: React 19 · React Router 7 · Zustand · Dexie · Tailwind 4 · Vercel Blob</p>
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
