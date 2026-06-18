import type { BackupBundle } from '../types';

export interface CloudSyncSettings {
  endpoint: string;
  token: string;
}

interface CloudStateResponse {
  ok?: boolean;
  exists?: boolean;
  data?: BackupBundle | null;
  updatedAt?: string | null;
}

const STORAGE_KEY = 'accel-cloud-sync-settings';
const DEFAULT_ENDPOINT = import.meta.env.VITE_CLOUD_SYNC_ENDPOINT || '/api/cloud-state';
const DEFAULT_TOKEN = import.meta.env.VITE_CLOUD_SYNC_TOKEN || '';

export function getCloudSyncSettings(): CloudSyncSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<CloudSyncSettings>;
      return {
        endpoint: parsed.endpoint || DEFAULT_ENDPOINT,
        token: parsed.token || DEFAULT_TOKEN,
      };
    }
  } catch {
    // Ignore malformed local settings and fall back to defaults.
  }

  return {
    endpoint: DEFAULT_ENDPOINT,
    token: DEFAULT_TOKEN,
  };
}

export function saveCloudSyncSettings(settings: CloudSyncSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      endpoint: settings.endpoint.trim() || DEFAULT_ENDPOINT,
      token: settings.token.trim(),
    })
  );
  window.dispatchEvent(new Event('accel-cloud-sync-settings-changed'));
}

export function isCloudSyncConfigured(settings = getCloudSyncSettings()): boolean {
  return Boolean(settings.endpoint.trim() && settings.token.trim());
}

async function requestCloudState(
  method: 'GET' | 'PUT',
  settings: CloudSyncSettings,
  data?: BackupBundle
): Promise<CloudStateResponse> {
  const endpoint = settings.endpoint.trim() || DEFAULT_ENDPOINT;
  const token = settings.token.trim();

  if (!endpoint || !token) {
    throw new Error('클라우드 주소와 동기화 코드를 먼저 입력해 주세요.');
  }

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Cloud-Sync-Token': token,
    },
    body: data ? JSON.stringify(data) : undefined,
    cache: 'no-store',
  });

  let payload: CloudStateResponse | { error?: string } | null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && 'error' in payload && payload.error
        ? payload.error
        : `클라우드 요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return (payload || {}) as CloudStateResponse;
}

export async function pullCloudData(settings = getCloudSyncSettings()): Promise<BackupBundle> {
  const payload = await requestCloudState('GET', settings);

  if (!payload.exists || !payload.data) {
    throw new Error('클라우드에 저장된 데이터가 아직 없습니다.');
  }

  return payload.data;
}

export async function pushCloudData(
  bundle: BackupBundle,
  settings = getCloudSyncSettings()
): Promise<CloudStateResponse> {
  return requestCloudState('PUT', settings, bundle);
}

export async function testCloudConnection(settings = getCloudSyncSettings()): Promise<CloudStateResponse> {
  return requestCloudState('GET', settings);
}
