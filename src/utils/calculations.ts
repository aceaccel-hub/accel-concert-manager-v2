/**
 * 숫자에 세자리수 콤마 포맷팅을 적용합니다.
 * @param value 입력된 문자열 값
 * @returns 포맷팅된 문자열 (예: "1234567" -> "1,234,567")
 */
export function formatNumberInput(value: string): string {
  // 숫자만 추출
  const numStr = value.replace(/[^0-9]/g, '');

  // 빈 문자열이면 반환
  if (!numStr) return '';

  // 세자리수마다 콤마 추가
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 포맷팅된 문자열에서 숫자를 추출합니다.
 * @param value 포맷팅된 문자열 (예: "1,234,567")
 * @returns 숫자 값 (예: 1234567)
 */
export function parseFormattedNumber(value: string): number {
  const numStr = value.replace(/[^0-9]/g, '');
  return numStr ? parseInt(numStr, 10) : 0;
}
