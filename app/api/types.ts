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
 */
export function getCloudflareEnv(): CloudflareEnv {
  // Cloudflare Pages Functions 환경에서 env는 런타임에 주입됨
  return (globalThis as any).process?.env || (globalThis as any).env || {};
}

