/**
 * 아첼 연주회 관리 프로그램 - 자동 계산 및 포매팅 유틸리티
 *
 * 모든 함수는 부수효과 없는 pure function 으로 작성한다.
 * DB 에 저장되지 않는 파생값(예: budget balance) 계산은 모두 여기서 수행한다.
 */

// ---------- Masking ----------

/**
 * 주민등록번호를 "######-1******" 형식으로 마스킹한다.
 * 빈 값이면 빈 문자열을 반환한다.
 */
export function maskResidentNumber(num?: string): string {
  if (!num) return '';
  // 하이픈 제거 후 정규화
  const digits = num.replace(/[^0-9]/g, '');
  if (digits.length < 7) return num;
  const front = digits.slice(0, 6);
  const genderDigit = digits.charAt(6);
  return `${front}-${genderDigit}******`;
}

/**
 * 계좌번호를 마스킹한다. 앞 3자리와 뒤 2자리만 노출, 가운데는 '*'.
 * 너무 짧은 경우(<= 5자) 원본 그대로 반환.
 */
export function maskBankAccount(acc?: string): string {
  if (!acc) return '';
  const trimmed = acc.trim();
  if (trimmed.length <= 5) return trimmed;
  const front = trimmed.slice(0, 3);
  const back = trimmed.slice(-2);
  const middle = '*'.repeat(Math.max(trimmed.length - 5, 1));
  return `${front}${middle}${back}`;
}

// ---------- Budget ----------

/**
 * 예산 잔액 = 계획 - 지급(실집행) 금액.
 * NaN/음수 input 도 안전하게 처리한다.
 */
export function calcBudgetBalance(planned: number, paid: number): number {
  const p = Number.isFinite(planned) ? planned : 0;
  const x = Number.isFinite(paid) ? paid : 0;
  return p - x;
}

// ---------- Duration ----------

/**
 * 분(minutes) 값을 "1시간 20분" 형태의 한국어 문자열로 포맷한다.
 * - 0 또는 음수 -> "0분"
 * - 60 분 미만 -> "X분"
 * - 시간 단위가 있고 분이 0 이면 "X시간"
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0분';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

// ---------- Progress ----------

/**
 * 진행률(0~100)을 정수로 계산한다.
 * total <= 0 인 경우 0 반환.
 */
export function calcProgressRate(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0;
  const pct = (done / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
