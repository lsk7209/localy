import type { Env } from '../types';

/**
 * 모니터링 및 메트릭 수집 유틸리티
 */

/**
 * 워커 실행 메트릭 타입
 */
export interface WorkerMetrics {
  workerName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  itemsProcessed?: number;
  error?: string;
}

/**
 * 메트릭 저장 (KV에 저장)
 */
export async function saveMetrics(
  env: Env,
  metrics: WorkerMetrics
): Promise<void> {
  try {
    const key = `metrics:${metrics.workerName}:${Date.now()}`;
    const value = JSON.stringify({
      ...metrics,
      timestamp: new Date().toISOString(),
    });

    // SETTINGS KV에 메트릭 저장 (최근 1000개만 유지)
    await env.SETTINGS.put(key, value);
  } catch (error) {
    console.error('Failed to save metrics:', {
      error: error instanceof Error ? error.message : String(error),
      workerName: metrics.workerName,
    });
    // 메트릭 저장 실패해도 워커는 계속 실행
  }
}

/**
 * 워커 실행 시간 추적 헬퍼
 */
export class WorkerTimer {
  private startTime: number;
  private workerName: string;
  private env: Env;

  constructor(workerName: string, env: Env) {
    this.workerName = workerName;
    this.env = env;
    this.startTime = Date.now();
  }

  async finish(success: boolean, itemsProcessed?: number, error?: string): Promise<void> {
    const endTime = Date.now();
    const metrics: WorkerMetrics = {
      workerName: this.workerName,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      success,
      itemsProcessed,
      error,
    };

    await saveMetrics(this.env, metrics);
  }
}

/**
 * 에러 알림 (향후 확장 가능)
 * 현재는 로깅만 수행, 향후 Slack/Discord/Email 연동 가능
 */
export async function sendErrorAlert(
  env: Env,
  error: Error,
  context: Record<string, unknown>
): Promise<void> {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('Error Alert:', errorInfo);

  // TODO: 실제 알림 시스템 연동
  // 예: Slack webhook, Discord webhook, Email 등
  // if (env.SLACK_WEBHOOK_URL) {
  //   await fetch(env.SLACK_WEBHOOK_URL, {
  //     method: 'POST',
  //     body: JSON.stringify({ text: `Error: ${error.message}` }),
  //   });
  // }
}

/**
 * 성능 메트릭 수집
 */
export async function recordPerformanceMetric(
  env: Env,
  metricName: string,
  value: number,
  unit: string = 'ms'
): Promise<void> {
  try {
    const key = `perf:${metricName}:${Date.now()}`;
    const metric = {
      name: metricName,
      value,
      unit,
      timestamp: Date.now(),
    };

    await env.SETTINGS.put(key, JSON.stringify(metric));
  } catch (error) {
    console.error('Failed to record performance metric:', error);
  }
}

