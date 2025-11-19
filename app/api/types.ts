import type { D1Database, KVNamespace, Queue } from '@cloudflare/workers-types';

// OpenNext의 getCloudflareContext를 동적으로 import
// 빌드 시점에 require를 사용하면 Next.js가 번들에 포함시키려고 시도하므로
// 런타임에만 동적으로 로드하도록 수정
let getCloudflareContextFn: (() => { env: CloudflareEnv }) | null = null;

// 런타임에만 실행되도록 함수 내부에서 초기화
function initializeCloudflareContext() {
  if (getCloudflareContextFn !== null) {
    return; // 이미 초기화됨
  }
  
  try {
    // 런타임에만 require 사용 (빌드 시점에는 실행되지 않음)
    if (typeof require !== 'undefined') {
      // @ts-ignore: OpenNext의 getCloudflareContext는 런타임에만 사용 가능
      const openNextCloudflare = require('@opennextjs/cloudflare');
      if (typeof openNextCloudflare?.getCloudflareContext === 'function') {
        getCloudflareContextFn = openNextCloudflare.getCloudflareContext;
      }
    }
  } catch {
    // @opennextjs/cloudflare를 사용할 수 없는 경우
    getCloudflareContextFn = null;
  }
}

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
  // 런타임에 컨텍스트 초기화
  initializeCloudflareContext();
  
  // 1. @opennextjs/cloudflare의 getCloudflareContext 사용 (우선순위 1)
  if (getCloudflareContextFn) {
    try {
      const context = getCloudflareContextFn();
      if (context?.env) {
        return context.env as CloudflareEnv;
      }
    } catch (error) {
      // getCloudflareContext 호출 실패 시 다음 방법 시도
      console.warn('Failed to get Cloudflare context from getCloudflareContext:', error);
    }
  }
  
  // 2. OpenNext가 AsyncLocalStorage를 통해 저장한 컨텍스트 접근 (우선순위 2)
  try {
    const cloudflareContextSymbol = Symbol.for('__cloudflare-context__');
    // @ts-ignore: globalThis에 동적으로 추가됨
    const context = globalThis[cloudflareContextSymbol];
    if (context?.env) {
      return context.env as CloudflareEnv;
    }
  } catch {
    // 컨텍스트를 가져올 수 없는 경우
  }
  
  // 3. 런타임에만 접근하도록 보장 (빌드 시점 에러 방지)
  if (typeof process === 'undefined' || !process.env) {
    return {} as CloudflareEnv;
  }
  
  // 4. OpenNext가 populateProcessEnv를 통해 문자열 값만 process.env에 주입
  // D1/KV 등 객체 바인딩은 process.env에 없으므로 위의 방법 사용 필요
  const env = (process.env as unknown as CloudflareEnv) || {};
  
  // 개발 환경에서는 빈 객체 반환 (로컬 개발 시)
  if (process.env.NODE_ENV === 'development' && !env.DB) {
    console.warn('Cloudflare environment variables not available in development mode');
  }
  
  return env;
}

