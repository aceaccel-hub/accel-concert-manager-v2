/**
 * 프로그램 아이템 (콘서트 곡목) CRUD
 *
 * - 같은 콘서트 내에서 같은 (composer, title, movement) 조합 중복 금지.
 *   중복 시 'DUPLICATE_REPERTOIRE' 를 throw 한다.
 * - removeProgramItem 은 program_items 행만 제거. repertoire 마스터 DB 는 절대 건드리지 않는다.
 */

import { db } from '../db/database';
import type { Concert, ProgramItem } from '../types';

export type ProgramItemCreateInput = Omit<ProgramItem, 'id' | 'concertId' | 'order'> & {
  order?: number;
};

export type ProgramItemUpdateInput = Partial<Omit<ProgramItem, 'id' | 'concertId'>>;

export async function getProgramItems(concertId: string): Promise<ProgramItem[]> {
  if (!concertId) return [];
  const list = await db.programItems.where('concertId').equals(concertId).toArray();
  return list.sort((a, b) => a.order - b.order);
}

/**
 * 프로그램 아이템 추가. 같은 콘서트 내 (composer + title + movement) 중복 시
 * 'DUPLICATE_REPERTOIRE' 에러를 throw 한다.
 */
export async function addProgramItem(
  concertId: string,
  data: ProgramItemCreateInput
): Promise<void> {
  if (!concertId) throw new Error('CONCERT_ID_REQUIRED');

  const existing = await db.programItems
    .where('concertId')
    .equals(concertId)
    .toArray();

  const composer = (data.composer ?? '').trim().toLowerCase();
  const title = (data.title ?? '').trim().toLowerCase();
  const movement = (data.movement ?? '').trim().toLowerCase();

  const isDup = existing.some((p) => {
    return (
      (p.composer ?? '').trim().toLowerCase() === composer &&
      (p.title ?? '').trim().toLowerCase() === title &&
      (p.movement ?? '').trim().toLowerCase() === movement
    );
  });

  if (isDup) throw new Error('DUPLICATE_REPERTOIRE');

  const nextOrder =
    data.order ??
    (existing.length === 0
      ? 1
      : Math.max(...existing.map((p) => p.order)) + 1);

  const item: ProgramItem = {
    id: crypto.randomUUID(),
    concertId,
    repertoireId: data.repertoireId,
    order: nextOrder,
    composer: data.composer,
    title: data.title,
    movement: data.movement,
    duration: data.duration,
    soloist: data.soloist,
    scoreStatus: data.scoreStatus ?? '미준비',
    partScoreStatus: data.partScoreStatus ?? '미준비',
    note: data.note,
  };

  await db.programItems.add(item);
}

export async function updateProgramItem(
  id: string,
  data: ProgramItemUpdateInput
): Promise<void> {
  await db.programItems.update(id, data);
}

/**
 * 프로그램 아이템 제거. repertoire 마스터 DB 는 건드리지 않는다.
 */
export async function removeProgramItem(id: string): Promise<void> {
  await db.programItems.delete(id);
}

/**
 * 같은 곡(composer + title)이 사용된 모든 연주회 이력을 반환한다.
 * 날짜 오름차순 정렬.
 */
export async function getConcertHistoryForPiece(
  composer: string,
  title: string
): Promise<{ programItem: ProgramItem; concert: Concert }[]> {
  const comp = composer.trim().toLowerCase();
  const ttl = title.trim().toLowerCase();

  const allItems = await db.programItems.toArray();
  const matched = allItems.filter(
    (p) =>
      (p.composer ?? '').trim().toLowerCase() === comp &&
      (p.title ?? '').trim().toLowerCase() === ttl
  );

  const results = await Promise.all(
    matched.map(async (p) => {
      const concert = await db.concerts.get(p.concertId);
      return concert ? { programItem: p, concert } : null;
    })
  );

  return (results.filter(Boolean) as { programItem: ProgramItem; concert: Concert }[])
    .sort((a, b) => a.concert.date.localeCompare(b.concert.date));
}

/**
 * 해당 콘서트의 전체 연주 시간(분) 합계.
 */
export async function getTotalDuration(concertId: string): Promise<number> {
  if (!concertId) return 0;
  const items = await db.programItems.where('concertId').equals(concertId).toArray();
  return items.reduce((sum, p) => sum + (p.duration ?? 0), 0);
}
