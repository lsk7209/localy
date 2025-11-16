/**
 * Next.js에서 사용할 데이터베이스 클라이언트
 * Cloudflare D1은 Workers에서만 직접 접근 가능하므로
 * API 라우트를 통해 접근하거나 별도 설정 필요
 */

// TODO: Cloudflare Pages에서 D1 접근 방법 구현
// 참고: https://developers.cloudflare.com/pages/platform/functions/d1-databases/

export async function getDb() {
  // Cloudflare Pages Functions에서 env.DB 사용
  // 또는 API 라우트를 통해 Workers와 통신
  throw new Error('Database access not implemented yet');
}

