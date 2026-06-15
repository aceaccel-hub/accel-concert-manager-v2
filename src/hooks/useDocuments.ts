/**
 * 문서(ConcertDocument) CRUD
 *
 * 콘서트별 문서 자료. concertId 필수.
 */

import { db } from '../db/database';
import type { ConcertDocument } from '../types';

export type DocumentCreateInput = Omit<
  ConcertDocument,
  'id' | 'concertId' | 'createdAt'
>;

export async function getDocuments(
  concertId: string
): Promise<ConcertDocument[]> {
  if (!concertId) return [];
  const list = await db.documents.where('concertId').equals(concertId).toArray();
  // 최신순
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDocument(
  concertId: string,
  data: DocumentCreateInput
): Promise<void> {
  if (!concertId) throw new Error('CONCERT_ID_REQUIRED');
  const doc: ConcertDocument = {
    ...data,
    id: crypto.randomUUID(),
    concertId,
    createdAt: new Date().toISOString(),
  };
  await db.documents.add(doc);
}

export async function updateDocument(
  id: string,
  data: Partial<DocumentCreateInput>
): Promise<void> {
  await db.documents.update(id, data);
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
}
