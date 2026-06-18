import { get, put } from '@vercel/blob';

interface BackupBundle {
  version: number;
  exportedAt: string;
  concerts: unknown[];
  repertoire: unknown[];
  programItems: unknown[];
  members: unknown[];
  [key: string]: unknown;
}

const STATE_PATH = process.env.CLOUD_STATE_PATH || 'accel-concert-manager/state.json';

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
  try {
    const result = await get(STATE_PATH, { access: 'private', useCache: false });
    if (!result?.stream) return null;
    return (await new Response(result.stream).json()) as BackupBundle;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found') || message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const unauthorized = assertAuthorized(request);
  if (unauthorized) return unauthorized;

  const data = await readCloudBundle();

  return json({
    ok: true,
    exists: Boolean(data),
    data,
    updatedAt: data?.exportedAt || null,
  });
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

  await put(STATE_PATH, JSON.stringify(bundle), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60,
  });

  return json({
    ok: true,
    exists: true,
    updatedAt: bundle.exportedAt,
  });
}

export async function POST(request: Request) {
  return PUT(request);
}
