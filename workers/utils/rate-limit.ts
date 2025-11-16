import type { Env } from '../types';
import { safeParseInt } from './validation';
import { logger } from './logger';

/**
 * Rate Limiting 설정
 */
const RATE_LIMIT_CONFIG = {
  // API 엔드포인트별 제한
  API: {
    window: 60, // 1분
    maxRequests: 100, // 최대 100회
  },
  ADMIN_API: {
    window: 60, // 1분
    maxRequests: 30, // 최대 30회
  },
  REVALIDATE_API: {
    window: 60, // 1분
    maxRequests: 50, // 최대 50회
  },
} as const;

/**
 * Rate Limit 키 생성
 */
function getRateLimitKey(prefix: string, identifier: string, window: number): string {
  const windowStart = Math.floor(Date.now() / 1000 / window) * window;
  return `rate_limit:${prefix}:${identifier}:${windowStart}`;
}

/**
 * Rate Limit 결과
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // 초 단위
}

/**
 * Rate Limit 체크 및 증가
 */
export async function checkRateLimit(
  env: Env,
  prefix: string,
  identifier: string,
  config: { window: number; maxRequests: number }
): Promise<RateLimitResult> {
  if (!env.RATE_LIMIT) {
    // Rate Limit KV가 없으면 제한 없음
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Math.floor(Date.now() / 1000) + config.window,
    };
  }

  const key = getRateLimitKey(prefix, identifier, config.window);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / config.window) * config.window;
  const reset = windowStart + config.window;

  try {
    // 현재 카운트 가져오기
    const current = await env.RATE_LIMIT.get(key);
    const count = safeParseInt(current, 0, 0);

    if (count >= config.maxRequests) {
      // 제한 초과
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        reset,
        retryAfter: reset - now,
      };
    }

    // 카운트 증가
    const newCount = count + 1;
    await env.RATE_LIMIT.put(key, String(newCount), {
      expirationTtl: config.window + 10, // 윈도우 시간 + 여유 시간
    });

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - newCount,
      reset,
    };
  } catch (error) {
    logger.error('Rate limit check failed', {
      prefix,
      identifier,
    }, error instanceof Error ? error : new Error(String(error)));
    // 에러 발생 시 허용 (fail-open)
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset,
    };
  }
}

/**
 * IP 주소 추출 (Cloudflare Workers)
 */
export function getClientIP(request: Request): string {
  // Cloudflare Workers에서는 CF-Connecting-IP 헤더 사용
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Fallback: X-Forwarded-For 헤더
  const forwardedFor = request.headers.get('X-Forwarded-IP');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // 최종 Fallback
  return 'unknown';
}

/**
 * API Rate Limit 체크
 */
export async function checkAPIRateLimit(
  env: Env,
  request: Request
): Promise<RateLimitResult> {
  const identifier = getClientIP(request);
  return checkRateLimit(env, 'api', identifier, RATE_LIMIT_CONFIG.API);
}

/**
 * Admin API Rate Limit 체크
 */
export async function checkAdminAPIRateLimit(
  env: Env,
  request: Request
): Promise<RateLimitResult> {
  const identifier = getClientIP(request);
  return checkRateLimit(env, 'admin', identifier, RATE_LIMIT_CONFIG.ADMIN_API);
}

/**
 * Revalidate API Rate Limit 체크
 */
export async function checkRevalidateAPIRateLimit(
  env: Env,
  request: Request
): Promise<RateLimitResult> {
  const identifier = getClientIP(request);
  return checkRateLimit(env, 'revalidate', identifier, RATE_LIMIT_CONFIG.REVALIDATE_API);
}

/**
 * Rate Limit 응답 생성
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = new Headers({
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  });

  if (!result.allowed) {
    if (result.retryAfter) {
      headers.set('Retry-After', String(result.retryAfter));
    }
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers,
      }
    );
  }

  return new Response(null, { status: 200, headers });
}

