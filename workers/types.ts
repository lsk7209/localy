import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types';

/**
 * Cloudflare Workers 환경 변수 타입 정의
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  SETTINGS: KVNamespace;
  FETCH_FAIL_QUEUE: KVNamespace;
  DEAD_FAIL_QUEUE: KVNamespace;
  SITEMAP?: KVNamespace; // Sitemap 저장용 KV
  CACHE?: KVNamespace; // 캐시 저장용 KV
  RATE_LIMIT?: KVNamespace; // Rate Limit 저장용 KV

  // Queue
  FETCH_QUEUE: Queue;

  // Secrets
  OPENAI_API_KEY?: string;
  PUBLIC_DATA_API_KEY?: string;
  NEXTJS_URL?: string;
  REVALIDATE_API_KEY?: string;
}

/**
 * 공공데이터 API 응답 타입
 */
export interface PublicDataStore {
  source_id: string;
  name: string;
  address: string;
  category: string;
  lat?: number;
  lng?: number;
  license_date?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * 실패 큐 메시지 타입
 */
export interface FailQueueMessage {
  payload: unknown;
  retryCount: number;
  error: string;
  timestamp: number;
}

/**
 * 설정 키 타입
 */
export type SettingsKey =
  | 'next_dong_index'
  | 'last_mod_date'
  | 'ai_enabled'
  | 'publish_rate_limit'
  | 'incremental_fetch_last_page'
  | 'initial_fetch_last_dong'
  | 'initial_fetch_last_page';

