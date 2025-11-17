import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext Cloudflare 설정
 * Next.js 15를 Cloudflare Pages에 배포하기 위한 설정
 */
export default defineCloudflareConfig({
  // 기본 설정 사용
  // 필요시 추가 설정 가능:
  // - incrementalCache: R2 또는 KV 캐시 설정
  // - tagCache: 태그 기반 캐시 설정
  // - queue: 큐 설정
});

