/**
 * 공통 유틸리티 함수
 */

/**
 * 클래스명 병합 유틸리티
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  return d.toLocaleDateString('ko-KR');
}

/**
 * 주소 포맷팅
 */
export function formatAddress(
  sido?: string | null,
  sigungu?: string | null,
  dong?: string | null,
  addrRoad?: string | null
): string {
  const parts = [sido, sigungu, dong, addrRoad].filter(Boolean);
  return parts.join(' ') || '주소 정보 없음';
}

