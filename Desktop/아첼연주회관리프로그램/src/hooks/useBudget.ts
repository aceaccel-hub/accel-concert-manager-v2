/**
 * 예산(Budget) CRUD + 자동 계산
 *
 * 핵심 원칙: balance 필드는 절대 DB에 저장하지 않는다.
 * - getBudgets 가 plannedAmount - paidAmount 로 매번 계산해 반환
 * - updateBudget 호출 시 들어오는 데이터에 balance 가 있어도 strip 한다
 */

import { db } from '../db/database';
import type { Budget, BudgetWithBalance } from '../types';
import { calcBudgetBalance } from '../utils/calculations';

export type BudgetCreateInput = Omit<Budget, 'id' | 'concertId' | 'createdAt'>;
export type BudgetUpdateInput = Partial<
  Omit<Budget, 'id' | 'concertId' | 'createdAt'>
>;

export interface BudgetSummary {
  income: number;
  expense: number;
  balance: number; // income - expense
}

/**
 * 콘서트의 모든 예산을 balance 가 계산된 형태로 반환한다.
 */
export async function getBudgets(
  concertId: string
): Promise<BudgetWithBalance[]> {
  if (!concertId) return [];
  const list = await db.budgets.where('concertId').equals(concertId).toArray();
  return list.map((b) => ({
    ...b,
    balance: calcBudgetBalance(b.plannedAmount, b.paidAmount),
  }));
}

/**
 * 콘서트 예산 요약. 수입 / 지출 / 잔액.
 * - income = 모든 '수입' 의 paidAmount 합 (실집행 기준)
 * - expense = 모든 '지출' 의 paidAmount 합
 * - balance = income - expense
 */
export async function getBudgetSummary(
  concertId: string
): Promise<BudgetSummary> {
  if (!concertId) return { income: 0, expense: 0, balance: 0 };
  const list = await db.budgets.where('concertId').equals(concertId).toArray();

  let income = 0;
  let expense = 0;
  for (const b of list) {
    if (b.type === '수입') income += b.paidAmount ?? 0;
    else if (b.type === '지출') expense += b.paidAmount ?? 0;
  }
  return { income, expense, balance: income - expense };
}

export async function createBudget(
  concertId: string,
  data: BudgetCreateInput
): Promise<void> {
  if (!concertId) throw new Error('CONCERT_ID_REQUIRED');
  const b: Budget = {
    ...data,
    id: crypto.randomUUID(),
    concertId,
    createdAt: new Date().toISOString(),
  };
  await db.budgets.add(b);
}

/**
 * 예산 수정. balance 필드가 입력에 섞여 있어도 무시한다.
 */
export async function updateBudget(
  id: string,
  data: BudgetUpdateInput
): Promise<void> {
  // balance 는 파생값이므로 DB 에 저장 금지
  const sanitized = { ...data } as BudgetUpdateInput & { balance?: number };
  if ('balance' in sanitized) delete sanitized.balance;
  await db.budgets.update(id, sanitized);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}
