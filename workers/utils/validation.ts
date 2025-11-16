/**
 * 데이터 검증 유틸리티
 * 입력 데이터의 유효성을 검증하고 SQL Injection, XSS 등을 방지
 */

/**
 * 문자열 정제 (XSS 방지)
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // HTML 태그 제거
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Slug 검증
 */
export function validateSlug(slug: string | null | undefined): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // slug는 영문, 숫자, 하이픈, 언더스코어만 허용
  const slugRegex = /^[a-z0-9_-]+$/;
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * 이메일 검증
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * URL 검증
 */
export function validateUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 숫자 범위 검증
 */
export function validateNumberRange(
  value: number | null | undefined,
  min: number,
  max: number
): boolean {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }

  return value >= min && value <= max;
}

/**
 * 좌표 검증 (위도/경도)
 */
export function validateCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }

  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }

  // 한국 좌표 범위 (대략)
  return (
    lat >= 33.0 && lat <= 38.6 && // 위도
    lng >= 124.6 && lng <= 132.0 // 경도
  );
}

/**
 * 페이지네이션 파라미터 검증
 */
export function validatePagination(
  page: number | null | undefined,
  limit: number | null | undefined
): { page: number; limit: number } {
  const validatedPage = typeof page === 'number' && page > 0 ? page : 1;
  const validatedLimit =
    typeof limit === 'number' && limit > 0 && limit <= 100 ? limit : 20;

  return {
    page: validatedPage,
    limit: validatedLimit,
  };
}

/**
 * 검색어 검증 및 정제
 */
export function validateSearchQuery(query: string | null | undefined): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // 최대 길이 제한
  const maxLength = 100;
  const sanitized = sanitizeString(query);

  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
}

/**
 * SQL Injection 방지를 위한 문자열 이스케이프
 * Drizzle ORM을 사용하므로 직접 SQL을 작성하지 않지만, 안전을 위해 추가
 */
export function escapeSqlString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // SQL 특수 문자 이스케이프
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * 배열 길이 검증
 */
export function validateArrayLength<T>(
  array: T[] | null | undefined,
  minLength: number,
  maxLength: number
): boolean {
  if (!Array.isArray(array)) {
    return false;
  }

  return array.length >= minLength && array.length <= maxLength;
}

/**
 * JSON 문자열 검증
 */
export function validateJsonString(jsonString: string | null | undefined): boolean {
  if (!jsonString || typeof jsonString !== 'string') {
    return false;
  }

  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * 날짜 문자열 검증 (ISO 8601)
 */
export function validateDateString(dateString: string | null | undefined): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 상가명 검증
 */
export function validateStoreName(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const sanitized = sanitizeString(name);
  return sanitized.length >= 1 && sanitized.length <= 200;
}

/**
 * 주소 검증
 */
export function validateAddress(address: string | null | undefined): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const sanitized = sanitizeString(address);
  return sanitized.length >= 1 && sanitized.length <= 500;
}

/**
 * 카테고리 검증
 */
export function validateCategory(category: string | null | undefined): boolean {
  if (!category || typeof category !== 'string') {
    return false;
  }

  const sanitized = sanitizeString(category);
  return sanitized.length >= 1 && sanitized.length <= 100;
}

/**
 * 지역명 검증 (시도, 시군구, 동)
 */
export function validateRegionName(regionName: string | null | undefined): boolean {
  if (!regionName || typeof regionName !== 'string') {
    return false;
  }

  const sanitized = sanitizeString(regionName);
  return sanitized.length >= 1 && sanitized.length <= 50;
}

/**
 * API 요청 본문 검증 결과
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 여러 검증 함수를 조합하여 사용하는 헬퍼
 */
export function combineValidations(
  ...results: Array<{ valid: boolean; error?: string }>
): ValidationResult {
  const errors: string[] = [];

  for (const result of results) {
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 안전한 parseInt (NaN 체크 포함)
 */
export function safeParseInt(
  value: string | null | undefined,
  defaultValue: number | null,
  min?: number,
  max?: number
): number | null {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    return defaultValue;
  }

  if (min !== undefined && parsed < min) {
    return defaultValue;
  }

  if (max !== undefined && parsed > max) {
    return defaultValue;
  }

  return parsed;
}

