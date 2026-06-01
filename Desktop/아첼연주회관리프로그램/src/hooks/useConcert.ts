/**
 * 콘서트 CRUD 훅
 *
 * - 콘서트 생성 시 기본 체크리스트 10개를 자동으로 생성한다.
 * - 콘서트 삭제 시 cascade 로 모든 junction 데이터를 정리한다.
 *   (단, masters: members / repertoire / groups 는 절대 삭제하지 않는다.)
 */

import { db, deleteConcertCascade } from '../db/database';
import type { Concert, Checklist } from '../types';

const DEFAULT_CHECKLIST_TITLES = [
  '장소 예약 완료',
  '곡목 확정',
  '악보 준비 완료',
  '단원 섭외 완료',
  '연습 일정 확정',
  '포스터 제작 완료',
  '프로그램북 제작 완료',
  '홍보 시작',
  '리허설 완료',
  '정산 완료',
];

export type ConcertCreateInput = Omit<
  Concert,
  'id' | 'createdAt' | 'updatedAt' | 'progressRate'
> & {
  progressRate?: number;
};

export type ConcertUpdateInput = Partial<
  Omit<Concert, 'id' | 'createdAt'>
>;

export async function getAllConcerts(): Promise<Concert[]> {
  const list = await db.concerts.toArray();
  // 최신(연주일 기준 내림차순) 정렬
  return list.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getConcertById(
  id: string
): Promise<Concert | undefined> {
  return db.concerts.get(id);
}

export async function createConcert(
  data: ConcertCreateInput
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const concert: Concert = {
    ...data,
    id,
    progressRate: data.progressRate ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  const checklists: Checklist[] = DEFAULT_CHECKLIST_TITLES.map((title, i) => ({
    id: crypto.randomUUID(),
    concertId: id,
    title,
    isDone: false,
    order: i + 1,
  }));

  await db.transaction('rw', db.concerts, db.checklists, async () => {
    await db.concerts.add(concert);
    await db.checklists.bulkAdd(checklists);
  });

  return id;
}

export async function updateConcert(
  id: string,
  data: ConcertUpdateInput
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db.concerts.update(id, { ...data, updatedAt });
}

/**
 * 콘서트 cascade 삭제.
 * masters(members/repertoire/groups)는 보존된다.
 */
export async function deleteConcert(id: string): Promise<void> {
  await deleteConcertCascade(id);
}
