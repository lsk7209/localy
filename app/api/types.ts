import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types';

/**
 * Cloudflare Pages Functions 환경 변수 타입 정의
 * Cloudflare Pages에서는 env가 런타임에 주입됨
 */
export interface CloudflareEnv {
  DB?: D1Database;
  SETTINGS?: KVNamespace;
  FETCH_FAIL_QUEUE?: KVNamespace;
  DEAD_FAIL_QUEUE?: KVNamespace;
  SITEMAP?: KVNamespace;
  CACHE?: KVNamespace;
  RATE_LIMIT?: KVNamespace;
  FETCH_QUEUE?: Queue;
  OPENAI_API_KEY?: string;
  PUBLIC_DATA_API_KEY?: string;
  REVALIDATE_API_KEY?: string;
}

/**
 * Cloudflare Pages Functions에서 env를 안전하게 가져오는 헬퍼 함수
 * 
 * Next.js 15에서 Cloudflare Pages Functions를 사용할 때:
 * - Cloudflare Pages는 Next.js API Routes를 자동으로 Functions로 변환
 * - 환경 변수는 런타임에 자동으로 주입됨
 * - D1, KV 등 바인딩은 process.env를 통해 접근 가능
 * 
 * 참고: Cloudflare Pages Functions에서는 바인딩이 자동으로 process.env에 주입됩니다.
 * Dashboard에서 설정한 바인딩 이름이 그대로 환경 변수 이름이 됩니다.
 */
export function getCloudflareEnv(): CloudflareEnv {
  // Cloudflare Pages Functions 환경에서 env는 런타임에 주입됨
  // Next.js 15에서는 process.env가 자동으로 설정됨
  // D1, KV 등 바인딩은 process.env를 통해 접근 가능
  
  // Cloudflare Pages Functions에서는 바인딩이 자동으로 주입됨
  // 예: DB 바인딩 → process.env.DB, SETTINGS KV → process.env.SETTINGS
  const env = (process.env as unknown as CloudflareEnv) || {};
  
  // 개발 환경에서는 빈 객체 반환 (로컬 개발 시)
  if (process.env.NODE_ENV === 'development' && !env.DB) {
    console.warn('Cloudflare environment variables not available in development mode');
  }
  
  return env;
}

