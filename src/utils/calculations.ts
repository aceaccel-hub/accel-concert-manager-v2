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

// ---------- Number Formatting ----------

/**
 * 숫자를 세자리수 콤마 형식으로 변환 (1000 → "1,000")
 */
export function formatNumber(num: number | string | undefined): string {
  if (num === undefined || num === '' || num === null) return '';
  const n = Number(num);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('ko-KR');
}

/**
 * 콤마가 있는 문자열을 숫자로 변환 ("1,000" → 1000)
 */
export function parseFormattedNumber(str: string | undefined): number {
  if (!str) return 0;
  const num = parseInt(str.replace(/,/g, ''), 10);
  return Number.isFinite(num) ? num : 0;
}

/**
 * 입력 필드용 실시간 포맷팅
 * 숫자만 입력받아서 콤마를 추가하면서 커서 위치 고려
 */
export function formatNumberInput(value: string): string {
  if (!value) return '';
  // 숫자가 아닌 문자 제거 (콤마도 제거)
  const digitsOnly = value.replace(/[^0-9]/g, '');
  if (!digitsOnly) return '';
  // 선행 0 제거
  const trimmed = digitsOnly.replace(/^0+/, '') || '0';
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

// ---------- Withholding Tax ----------

/**
 * 원천징수액을 계산한다.
 * 사업소득: 3%
 * 기타소득: 3%
 */
export function calcWithholding(
  amount: number,
  incomeType: '사업소득' | '기타소득'
): { incomeTax: number; localTax: number; total: number; net: number } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { incomeTax: 0, localTax: 0, total: 0, net: amount };
  }

  // 소득세: 3%, 지방소득세: 1% (총 4%)
  const incomeTax = Math.round(amount * 0.03);
  const localTax = Math.round(amount * 0.01);
  const total = incomeTax + localTax;
  const net = amount - total;

  return { incomeTax, localTax, total, net };
}
