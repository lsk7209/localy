import type { Env } from '../types';

/**
 * 환경 변수 검증 유틸리티
 */

/**
 * 필수 환경 변수 검증 (타입 안전)
 */
export function requireEnv<K extends keyof Env>(
  env: Env,
  key: K,
  message?: string
): NonNullable<Env[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(
      message || `Missing required environment variable: ${String(key)}`
    );
  }
  return value as NonNullable<Env[K]>;
}

/**
 * 선택적 환경 변수 가져오기
 */
export function getEnv<K extends keyof Env>(
  env: Env,
  key: K,
  defaultValue?: string
): string | undefined {
  const value = env[key];
  if (typeof value === 'string' && value) {
    return value;
  }
  return defaultValue;
}

/**
 * 환경 변수 검증 결과
 */
export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * 모든 필수 환경 변수 검증
 */
export function validateEnv(env: Env, requiredKeys: Array<keyof Env>): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of requiredKeys) {
    const value = env[key];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(String(key));
    }
  }

  // 선택적 환경 변수 경고
  if (!env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY is not set. AI generation will be skipped.');
  }
  if (!env.PUBLIC_DATA_API_KEY) {
    warnings.push('PUBLIC_DATA_API_KEY is not set. Data fetching will be skipped.');
  }
  if (!env.NEXTJS_URL) {
    warnings.push('NEXTJS_URL is not set. Revalidation will be skipped.');
  }
  if (!env.REVALIDATE_API_KEY) {
    warnings.push('REVALIDATE_API_KEY is not set. Revalidation will be skipped.');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * OpenAI API 키 검증
 */
export function requireOpenAIKey(env: Env): string {
  return requireEnv(env, 'OPENAI_API_KEY', 'OpenAI API key is required for AI generation');
}

/**
 * 공공데이터 API 키 검증
 */
export function requirePublicDataApiKey(env: Env): string {
  return requireEnv(env, 'PUBLIC_DATA_API_KEY', 'Public Data API key is required for data fetching');
}

/**
 * Next.js URL 검증
 */
export function requireNextjsUrl(env: Env): string {
  return requireEnv(env, 'NEXTJS_URL', 'Next.js URL is required for revalidation');
}

/**
 * Revalidate API 키 검증
 */
export function requireRevalidateApiKey(env: Env): string {
  return requireEnv(env, 'REVALIDATE_API_KEY', 'Revalidate API key is required for revalidation');
}

