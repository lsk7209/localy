import type { Env } from '../types';
import type { KVNamespace } from '@cloudflare/workers-types';
import { KV_BATCH_LIMITS } from './performance';

/**
 * 캐시 설정
 */
const CACHE_TTL = {
  SHOP_LIST: 300, // 5분
  SHOP_DETAIL: 3600, // 1시간
  REGION_STATS: 3600, // 1시간
  ADMIN_STATS: 60, // 1분
} as const;

/**
 * 캐시 키 생성
 */
export function getCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

/**
 * 캐시 엔트리 인터페이스
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 캐시에 데이터 저장
 */
export async function setCache<T>(
  env: { CACHE?: KVNamespace },
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  if (!env.CACHE) {
    console.warn('CACHE KV namespace not configured. Skipping cache storage.');
    return;
  }

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // TTL을 초 단위로 변환하여 KV에 저장
    await env.CACHE.put(key, JSON.stringify(entry), {
      expirationTtl: ttl,
    });
  } catch (error) {
    console.error('Failed to set cache:', {
      error: error instanceof Error ? error.message : String(error),
      key,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 캐시에서 데이터 가져오기
 */
export async function getCache<T>(env: { CACHE?: KVNamespace }, key: string): Promise<T | null> {
  if (!env.CACHE) {
    return null;
  }

  try {
    const cached = await env.CACHE.get(key);
    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;

    // TTL 체크
    if (age > entry.ttl * 1000) {
      // 만료된 캐시 삭제
      await env.CACHE.delete(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to get cache:', {
      error: error instanceof Error ? error.message : String(error),
      key,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}

/**
 * 캐시 삭제
 */
export async function deleteCache(env: { CACHE?: KVNamespace }, key: string): Promise<void> {
  if (!env.CACHE) {
    return;
  }

  try {
    await env.CACHE.delete(key);
  } catch (error) {
    console.error('Failed to delete cache:', {
      error: error instanceof Error ? error.message : String(error),
      key,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 패턴으로 캐시 삭제 (예: 특정 prefix의 모든 캐시)
 * Cloudflare KV 배치 처리 최적화 적용
 */
export async function deleteCachePattern(env: { CACHE?: KVNamespace }, pattern: string): Promise<void> {
  if (!env.CACHE) {
    return;
  }

  try {
    // KV는 패턴 삭제를 직접 지원하지 않으므로, 목록을 가져와서 필터링
    // 주의: KV는 목록 조회가 제한적이므로, 실제로는 키를 직접 관리하는 것이 좋음
    const keys = await env.CACHE.list({ prefix: pattern, limit: KV_BATCH_LIMITS.MAX_LIST_KEYS });
    
    if (keys.keys.length === 0) {
      return;
    }

    // 배치 삭제: Promise.all로 병렬 처리하여 성능 향상
    const deletePromises = keys.keys.map((key) =>
      env.CACHE.delete(key.name).catch((error) => {
        console.error(`Failed to delete cache key: ${key.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      })
    );

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Failed to delete cache pattern:', {
      error: error instanceof Error ? error.message : String(error),
      pattern,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 캐시 헬퍼 함수들
 */
export const cache = {
  /**
   * 상가 목록 캐시
   */
  shopList: {
    get: (env: { CACHE?: KVNamespace }, params: { search?: string; category?: string; region?: string; page: number; sortBy: string }) => {
      const key = getCacheKey('shop:list', JSON.stringify(params));
      return getCache(env, key);
    },
    set: (env: { CACHE?: KVNamespace }, params: { search?: string; category?: string; region?: string; page: number; sortBy: string }, data: unknown) => {
      const key = getCacheKey('shop:list', JSON.stringify(params));
      return setCache(env, key, data, CACHE_TTL.SHOP_LIST);
    },
    delete: (env: { CACHE?: KVNamespace }) => {
      return deleteCachePattern(env, 'shop:list:');
    },
  },

  /**
   * 상가 상세 캐시
   */
  shopDetail: {
    get: (env: { CACHE?: KVNamespace }, slug: string) => {
      const key = getCacheKey('shop:detail', slug);
      return getCache(env, key);
    },
    set: (env: { CACHE?: KVNamespace }, slug: string, data: unknown) => {
      const key = getCacheKey('shop:detail', slug);
      return setCache(env, key, data, CACHE_TTL.SHOP_DETAIL);
    },
    delete: (env: { CACHE?: KVNamespace }, slug: string) => {
      const key = getCacheKey('shop:detail', slug);
      return deleteCache(env, key);
    },
  },

  /**
   * 지역 통계 캐시
   */
  regionStats: {
    get: (env: { CACHE?: KVNamespace }, regionName: string) => {
      const key = getCacheKey('region:stats', regionName);
      return getCache(env, key);
    },
    set: (env: { CACHE?: KVNamespace }, regionName: string, data: unknown) => {
      const key = getCacheKey('region:stats', regionName);
      return setCache(env, key, data, CACHE_TTL.REGION_STATS);
    },
    delete: (env: { CACHE?: KVNamespace }, regionName: string) => {
      const key = getCacheKey('region:stats', regionName);
      return deleteCache(env, key);
    },
  },

  /**
   * 관리자 통계 캐시
   */
  adminStats: {
    get: (env: { CACHE?: KVNamespace }) => {
      const key = getCacheKey('admin:stats');
      return getCache(env, key);
    },
    set: (env: { CACHE?: KVNamespace }, data: unknown) => {
      const key = getCacheKey('admin:stats');
      return setCache(env, key, data, CACHE_TTL.ADMIN_STATS);
    },
    delete: (env: { CACHE?: KVNamespace }) => {
      const key = getCacheKey('admin:stats');
      return deleteCache(env, key);
    },
  },
};

