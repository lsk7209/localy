import { logger } from './logger';

/**
 * 재시도 설정 옵션
 */
export interface RetryOptions {
  /** 최대 재시도 횟수 (기본값: 3) */
  maxRetries?: number;
  /** 초기 백오프 지연 시간 (밀리초, 기본값: 1000) */
  initialDelayMs?: number;
  /** 최대 백오프 지연 시간 (밀리초, 기본값: 10000) */
  maxDelayMs?: number;
  /** 지수 백오프 사용 여부 (기본값: true) */
  exponential?: boolean;
  /** 재시도 가능한 에러인지 판단하는 함수 */
  shouldRetry?: (error: unknown) => boolean;
  /** 재시도 전 호출되는 콜백 */
  onRetry?: (attempt: number, error: unknown) => void;
  /** 재시도 실패 시 호출되는 콜백 */
  onFailure?: (error: unknown, attempts: number) => void;
}

/**
 * 지수 백오프 지연 시간 계산
 * 
 * @param attempt - 현재 시도 횟수 (1부터 시작)
 * @param initialDelayMs - 초기 지연 시간
 * @param maxDelayMs - 최대 지연 시간
 * @returns 지연 시간 (밀리초)
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 10000
): number {
  // 지수 백오프: 2^(attempt-1) * initialDelayMs
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
  return Math.min(exponentialDelay, maxDelayMs);
}

/**
 * 재시도 가능한 에러인지 판단
 * 
 * @param error - 에러 객체
 * @returns 재시도 가능 여부
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  // 네트워크 에러
  if (error.message.includes('timeout') || 
      error.message.includes('network') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')) {
    return true;
  }

  // HTTP 에러 (5xx, 429)
  if (error.message.includes('503') || 
      error.message.includes('504') ||
      error.message.includes('429')) {
    return true;
  }

  // Cloudflare D1 에러
  if (error.message.includes('D1_') ||
      error.message.includes('database') ||
      error.message.includes('SQLITE')) {
    return true;
  }

  return false;
}

/**
 * 지수 백오프를 사용한 재시도 로직
 * 
 * @param operation - 실행할 비동기 작업
 * @param options - 재시도 옵션
 * @returns 작업 결과
 * @throws 최대 재시도 횟수 초과 시 마지막 에러
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await fetchData(),
 *   {
 *     maxRetries: 3,
 *     initialDelayMs: 1000,
 *     onRetry: (attempt, error) => {
 *       logger.warn(`Retry attempt ${attempt}`, { error });
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    exponential = true,
    shouldRetry = isRetryableError,
    onRetry,
    onFailure,
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await operation();
      
      // 성공 시 재시도 카운터 리셋 로그 (첫 시도가 아닌 경우)
      if (attempt > 0) {
        logger.info('Operation succeeded after retry', {
          attempt,
          totalAttempts: attempt + 1,
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      attempt++;

      // 최대 재시도 횟수 초과
      if (attempt > maxRetries) {
        logger.error('Operation failed after max retries', {
          maxRetries,
          totalAttempts: attempt,
        }, error instanceof Error ? error : new Error(String(error)));
        
        if (onFailure) {
          onFailure(error, attempt);
        }
        
        throw error;
      }

      // 재시도 불가능한 에러인 경우 즉시 실패
      if (!shouldRetry(error)) {
        logger.warn('Error is not retryable, failing immediately', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // 재시도 전 대기
      const delay = exponential
        ? calculateBackoffDelay(attempt, initialDelayMs, maxDelayMs)
        : initialDelayMs;

      if (onRetry) {
        onRetry(attempt, error);
      } else {
        logger.warn('Retrying operation', {
          attempt,
          maxRetries,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // 이 코드는 실행되지 않아야 하지만 TypeScript를 위해 필요
  throw lastError;
}

/**
 * 간단한 재시도 래퍼 (기본 설정 사용)
 * 
 * @param operation - 실행할 비동기 작업
 * @param maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @returns 작업 결과
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(operation, { maxRetries });
}

