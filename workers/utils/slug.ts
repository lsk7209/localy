/**
 * Slug 생성 규칙:
 * - 기본 형식: {name}-{dong}
 * - 소문자 변환
 * - 공백 → 하이픈
 * - 특수문자 제거
 * - 중복 시 4자리 해시 추가
 */
export function generateSlug(name: string, dong: string): string {
  // 기본 slug 생성
  const baseSlug = `${name}-${dong}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return baseSlug;
}

/**
 * 중복 시 해시 추가하여 고유한 slug 생성
 * Cloudflare Workers 환경에서 사용 가능한 방식으로 구현
 */
export function generateUniqueSlug(name: string, dong: string, baseSlug?: string): string {
  const slug = baseSlug || generateSlug(name, dong);

  // 중복 시 고유한 suffix 추가 (Cloudflare Workers 호환)
  // timestamp, 랜덤 값, 그리고 crypto를 사용하여 고유성 보장
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  
  // crypto.randomUUID()의 일부를 사용하여 추가 고유성 보장
  let uuidSuffix = '';
  try {
    const uuid = crypto.randomUUID();
    uuidSuffix = uuid.substring(0, 4).replace(/-/g, '');
  } catch {
    // crypto.randomUUID()가 실패하면 timestamp와 random만 사용
  }
  
  const suffix = `${timestamp}-${random}${uuidSuffix}`.substring(0, 8);

  return `${slug}-${suffix}`;
}

