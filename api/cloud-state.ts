import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, initializeFirestore } from 'firebase-admin/firestore';

interface BackupBundle {
  version: number;
  exportedAt: string;
  concerts: unknown[];
  repertoire: unknown[];
  programItems: unknown[];
  members: unknown[];
  [key: string]: unknown;
}

interface CloudStateDocument {
  bundle?: BackupBundle;
  updatedAt?: string;
}

const FIREBASE_COLLECTION = process.env.FIREBASE_SYNC_COLLECTION || 'appState';
const FIREBASE_DOCUMENT_ID = process.env.FIREBASE_SYNC_DOCUMENT_ID || 'accel-concert-manager';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }
  return value;
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n');
}

function getDb() {
  if (!getApps().length) {
    const app = initializeApp({
      credential: cert({
        projectId: getRequiredEnv('FIREBASE_PROJECT_ID'),
        clientEmail: getRequiredEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: normalizePrivateKey(getRequiredEnv('FIREBASE_PRIVATE_KEY')),
      }),
    });

    initializeFirestore(app, { ignoreUndefinedProperties: true });
  }

  return getFirestore();
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function getRequestToken(request: Request): string {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return bearer || request.headers.get('x-cloud-sync-token') || '';
}

function assertAuthorized(request: Request): Response | null {
  const expected = process.env.CLOUD_SYNC_TOKEN;

  if (!expected) {
    return json({ error: 'CLOUD_SYNC_TOKEN 환경변수가 설정되지 않았습니다.' }, 500);
  }

  if (getRequestToken(request) !== expected) {
    return json({ error: '동기화 코드가 올바르지 않습니다.' }, 401);
  }

  return null;
}

function isBackupBundle(value: unknown): value is BackupBundle {
  if (!value || typeof value !== 'object') return false;
  const bundle = value as Partial<BackupBundle>;
  return (
    bundle.version === 1 &&
    Array.isArray(bundle.concerts) &&
    Array.isArray(bundle.repertoire) &&
    Array.isArray(bundle.programItems) &&
    Array.isArray(bundle.members)
  );
}

async function readCloudBundle(): Promise<BackupBundle | null> {
  const snapshot = await getDb().collection(FIREBASE_COLLECTION).doc(FIREBASE_DOCUMENT_ID).get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() as CloudStateDocument | undefined;
  if (!data?.bundle) return null;
  return data.bundle;
}

function jsonError(error: unknown, fallbackMessage: string): Response {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return json({ error: message }, 500);
}

export async function GET(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const data = await readCloudBundle();

    return json({
      ok: true,
      exists: Boolean(data),
      data,
      updatedAt: data?.exportedAt || null,
    });
  } catch (error) {
    return jsonError(error, 'Firebase 클라우드 데이터를 불러오지 못했습니다.');
  }
}

export async function PUT(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) return unauthorized;

  const data = await request.json();
  if (!isBackupBundle(data)) {
    return json({ error: '올바른 아첼 백업 데이터 형식이 아닙니다.' }, 400);
  }

  const bundle: BackupBundle = {
    ...data,
    exportedAt: new Date().toISOString(),
  };

  try {
    await getDb().collection(FIREBASE_COLLECTION).doc(FIREBASE_DOCUMENT_ID).set({
      bundle,
      updatedAt: bundle.exportedAt,
      storage: 'firebase-firestore',
    });
  } catch (error) {
    return jsonError(error, 'Firebase 클라우드 데이터를 저장하지 못했습니다.');
  }

  return json({
    ok: true,
    exists: true,
    updatedAt: bundle.exportedAt,
  });
}

export async function POST(request: Request) {
  return PUT(request);
}
