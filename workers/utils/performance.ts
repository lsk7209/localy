import type { ExecutionContext } from '@cloudflare/workers-types';

/**
 * Cloudflare Workers 성능 모니터링 및 최적화 유틸리티
 */

/**
 * CPU 시간 측정 (Cloudflare Workers 환경)
 * 참고: 실제 CPU 시간은 Cloudflare에서 제공하는 메트릭을 통해 확인 가능
 */
export class CPUTimer {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 체크포인트 기록
   */
  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now());
  }

  /**
   * 체크포인트 간 경과 시간 계산
   */
  getElapsed(checkpoint1?: string, checkpoint2?: string): number {
    if (!checkpoint1) {
      return Date.now() - this.startTime;
    }
    const time1 = this.checkpoints.get(checkpoint1);
    if (!time1) {
      return 0;
    }
    if (!checkpoint2) {
      return Date.now() - time1;
    }
    const time2 = this.checkpoints.get(checkpoint2);
    if (!time2) {
      return 0;
    }
    return time2 - time1;
  }

  /**
   * 모든 체크포인트 반환
   */
  getCheckpoints(): Record<string, number> {
    const result: Record<string, number> = {};
    this.checkpoints.forEach((time, name) => {
      result[name] = time - this.startTime;
    });
    return result;
  }
}

/**
 * Cloudflare Workers 제한사항
 */
export const WORKER_LIMITS = {
  // Free tier
  FREE: {
    CPU_TIME_MS: 10, // CPU 시간 10ms
    TOTAL_TIME_MS: 30000, // 총 실행 시간 30초
    MEMORY_MB: 128, // 메모리 128MB
  },
  // Paid tier
  PAID: {
    CPU_TIME_MS: 50, // CPU 시간 50ms
    TOTAL_TIME_MS: 30000, // 총 실행 시간 30초
    MEMORY_MB: 128, // 메모리 128MB (기본)
  },
} as const;

/**
 * 실행 시간 경고 임계값 (밀리초)
 */
export const PERFORMANCE_THRESHOLDS = {
  WARNING_CPU_MS: 8, // CPU 시간 경고 (Free tier의 80%)
  WARNING_TOTAL_MS: 25000, // 총 실행 시간 경고 (30초의 83%)
  CRITICAL_CPU_MS: 9, // CPU 시간 위험 (Free tier의 90%)
  CRITICAL_TOTAL_MS: 28000, // 총 실행 시간 위험 (30초의 93%)
} as const;

/**
 * 성능 경고 로깅
 */
export function logPerformanceWarning(
  timer: CPUTimer,
  workerName: string,
  context?: Record<string, unknown>
): void {
  const totalTime = timer.getElapsed();
  
  if (totalTime > PERFORMANCE_THRESHOLDS.CRITICAL_TOTAL_MS) {
    console.error(`[PERFORMANCE CRITICAL] ${workerName} exceeded critical threshold:`, {
      worker: workerName,
      totalTimeMs: totalTime,
      threshold: PERFORMANCE_THRESHOLDS.CRITICAL_TOTAL_MS,
      checkpoints: timer.getCheckpoints(),
      ...context,
    });
  } else if (totalTime > PERFORMANCE_THRESHOLDS.WARNING_TOTAL_MS) {
    console.warn(`[PERFORMANCE WARNING] ${workerName} approaching limit:`, {
      worker: workerName,
      totalTimeMs: totalTime,
      threshold: PERFORMANCE_THRESHOLDS.WARNING_TOTAL_MS,
      checkpoints: timer.getCheckpoints(),
      ...context,
    });
  }
}

/**
 * ExecutionContext.waitUntil()을 사용하여 백그라운드 작업 처리
 * 중요: waitUntil()은 총 실행 시간에 포함되지만 CPU 시간에는 포함되지 않음
 */
export function scheduleBackgroundTask(
  ctx: ExecutionContext,
  task: Promise<unknown>,
  description?: string
): void {
  ctx.waitUntil(
    task.catch((error) => {
      console.error(`Background task failed${description ? `: ${description}` : ''}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    })
  );
}

/**
 * 배치 처리를 위한 청크 분할
 * 큰 배열을 작은 청크로 나누어 처리
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 비동기 작업을 배치로 처리 (병렬 처리 제한)
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayBetweenBatches: number = 0
): Promise<R[]> {
  const results: R[] = [];
  const chunks = chunkArray(items, batchSize);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // 마지막 청크가 아니면 대기
    if (i < chunks.length - 1 && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

/**
 * 타임아웃이 있는 Promise 래퍼
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * D1 쿼리 최적화: 배치 INSERT 크기 제한
 * Cloudflare D1은 한 번에 너무 많은 행을 INSERT하면 타임아웃될 수 있음
 */
export const D1_BATCH_LIMITS = {
  MAX_INSERT_ROWS: 500, // 한 번에 최대 500행
  MAX_UPDATE_ROWS: 1000, // 한 번에 최대 1000행
  MAX_SELECT_ROWS: 10000, // 한 번에 최대 10000행 조회
} as const;

/**
 * KV 배치 작업 최적화
 */
export const KV_BATCH_LIMITS = {
  MAX_LIST_KEYS: 1000, // list() 최대 키 수
  MAX_BATCH_OPERATIONS: 100, // 배치 작업 최대 수
} as const;

