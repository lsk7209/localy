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
 * OpenNext Cloudflare 어댑터를 사용할 때:
 * - OpenNext가 AsyncLocalStorage를 통해 Cloudflare 컨텍스트를 저장
 * - globalThis[Symbol.for("__cloudflare-context__")]를 통해 접근 가능
 * - populateProcessEnv는 문자열 값만 주입하므로 D1/KV는 직접 접근 필요
 * 
 * 참고: OpenNext는 런타임에 env를 AsyncLocalStorage에 저장합니다.
 * Dashboard에서 설정한 바인딩 이름이 그대로 환경 변수 이름이 됩니다.
 */
export function getCloudflareEnv(): CloudflareEnv {
  // OpenNext가 AsyncLocalStorage를 통해 저장한 컨텍스트 접근
  try {
    // @ts-expect-error: OpenNext의 심볼은 런타임에만 사용 가능
    const cloudflareContextSymbol = Symbol.for('__cloudflare-context__');
    // @ts-expect-error: globalThis에 동적으로 추가됨
    const context = globalThis[cloudflareContextSymbol];
    if (context?.env) {
      return context.env as CloudflareEnv;
    }
  } catch {
    // 컨텍스트를 가져올 수 없는 경우
  }
  
  // @opennextjs/cloudflare 패키지의 getCloudflareContext 사용 시도
  try {
    // @ts-expect-error: OpenNext의 getCloudflareContext는 런타임에만 사용 가능
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    if (typeof getCloudflareContext === 'function') {
      const context = getCloudflareContext();
      if (context?.env) {
        return context.env as CloudflareEnv;
      }
    }
  } catch {
    // getCloudflareContext를 사용할 수 없는 경우
  }
  
  // 런타임에만 접근하도록 보장 (빌드 시점 에러 방지)
  if (typeof process === 'undefined' || !process.env) {
    return {} as CloudflareEnv;
  }
  
  // OpenNext가 populateProcessEnv를 통해 문자열 값만 process.env에 주입
  // D1/KV 등 객체 바인딩은 process.env에 없으므로 위의 방법 사용 필요
  const env = (process.env as unknown as CloudflareEnv) || {};
  
  // 개발 환경에서는 빈 객체 반환 (로컬 개발 시)
  if (process.env.NODE_ENV === 'development' && !env.DB) {
    console.warn('Cloudflare environment variables not available in development mode');
  }
  
  return env;
}

