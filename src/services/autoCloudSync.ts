import { db, exportAllData, importAllData } from '../db/database';
import type { BackupBundle } from '../types';
import {
  getCloudSyncSettings,
  isCloudSyncConfigured,
  pushCloudData,
  testCloudConnection,
} from './cloudSync';

const AUTO_SYNC_INTERVAL_MS = 8000;
const META_KEY = 'accel-cloud-sync-meta';
const DIRTY_KEY = 'accel-cloud-sync-local-dirty';

const TABLE_NAMES = [
  'concerts',
  'repertoire',
  'programItems',
  'members',
  'concertMembers',
  'groups',
  'concertGroups',
  'rehearsals',
  'rehearsalAttendance',
  'budgets',
  'documents',
  'checklists',
  'memos',
  'masterItems',
] as const;

interface AutoSyncMeta {
  fingerprint: string;
  cloudUpdatedAt: string | null;
}

interface AutoSyncController {
  stop: () => void;
  syncNow: () => Promise<void>;
}

let controller: AutoSyncController | null = null;
let hooksRegistered = false;
let suppressLocalTracking = false;
let localDirty = false;

function markLocalDirty(): void {
  if (suppressLocalTracking) return;
  localDirty = true;
  localStorage.setItem(DIRTY_KEY, '1');
}

function registerDbHooks(): void {
  if (hooksRegistered) return;

  for (const tableName of TABLE_NAMES) {
    const table = db.table(tableName);
    table.hook('creating', markLocalDirty);
    table.hook('updating', markLocalDirty);
    table.hook('deleting', markLocalDirty);
  }

  hooksRegistered = true;
}

function getMeta(): AutoSyncMeta | null {
  try {
    const saved = localStorage.getItem(META_KEY);
    return saved ? (JSON.parse(saved) as AutoSyncMeta) : null;
  } catch {
    return null;
  }
}

function saveMeta(meta: AutoSyncMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function clearDirty(): void {
  localDirty = false;
  localStorage.removeItem(DIRTY_KEY);
}

function hasDirtyLocalChanges(localFingerprint: string, meta: AutoSyncMeta | null): boolean {
  if (localDirty || localStorage.getItem(DIRTY_KEY) === '1') return true;
  return Boolean(meta?.fingerprint && meta.fingerprint !== localFingerprint);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

async function fingerprintBundle(bundle: BackupBundle): Promise<string> {
  const stableBundle: Partial<BackupBundle> = { ...bundle };
  delete stableBundle.exportedAt;
  const source = stableStringify(stableBundle);
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function applyRemoteBundle(bundle: BackupBundle, cloudUpdatedAt: string | null): Promise<void> {
  suppressLocalTracking = true;
  try {
    await importAllData(bundle);
  } finally {
    suppressLocalTracking = false;
  }

  const fingerprint = await fingerprintBundle(bundle);
  saveMeta({ fingerprint, cloudUpdatedAt });
  clearDirty();
  sessionStorage.setItem('accel-cloud-sync-last-applied', cloudUpdatedAt || new Date().toISOString());
  window.location.reload();
}

export function startAutoCloudSync(): AutoSyncController {
  if (controller) return controller;

  registerDbHooks();

  let timer: number | null = null;
  let running = false;

  const syncNow = async () => {
    const settings = getCloudSyncSettings();
    if (!isCloudSyncConfigured(settings) || running) return;

    running = true;
    try {
      const localBundle = await exportAllData();
      const localFingerprint = await fingerprintBundle(localBundle);
      const meta = getMeta();
      const cloud = await testCloudConnection(settings);

      if (cloud.exists && cloud.data) {
        const cloudFingerprint = await fingerprintBundle(cloud.data);

        if (cloudFingerprint === localFingerprint) {
          saveMeta({
            fingerprint: localFingerprint,
            cloudUpdatedAt: cloud.updatedAt ?? meta?.cloudUpdatedAt ?? null,
          });
          clearDirty();
          return;
        }

        if (!meta) {
          await applyRemoteBundle(cloud.data, cloud.updatedAt ?? null);
          return;
        }

        const dirty = hasDirtyLocalChanges(localFingerprint, meta);

        if (dirty) {
          const result = await pushCloudData(localBundle, settings);
          saveMeta({
            fingerprint: localFingerprint,
            cloudUpdatedAt: result.updatedAt ?? new Date().toISOString(),
          });
          clearDirty();
          return;
        }

        await applyRemoteBundle(cloud.data, cloud.updatedAt ?? null);
        return;
      }

      if (!cloud.exists && !meta && localBundle.concerts.length > 0) {
        const result = await pushCloudData(localBundle, settings);
        saveMeta({
          fingerprint: localFingerprint,
          cloudUpdatedAt: result.updatedAt ?? new Date().toISOString(),
        });
        clearDirty();
      }
    } catch (error) {
      console.warn('Auto cloud sync failed:', error);
    } finally {
      running = false;
    }
  };

  const startTimer = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = window.setInterval(syncNow, AUTO_SYNC_INTERVAL_MS);
    void syncNow();
  };

  const syncWhenOnline = () => {
    void syncNow();
  };

  const syncWhenVisible = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };

  window.addEventListener('accel-cloud-sync-settings-changed', startTimer);
  window.addEventListener('online', syncWhenOnline);
  document.addEventListener('visibilitychange', syncWhenVisible);
  startTimer();

  controller = {
    stop: () => {
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener('accel-cloud-sync-settings-changed', startTimer);
      window.removeEventListener('online', syncWhenOnline);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      controller = null;
    },
    syncNow,
  };

  return controller;
}
