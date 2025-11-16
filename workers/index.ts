import type { ExportedHandler, ScheduledController, MessageBatch, ExecutionContext } from '@cloudflare/workers-types';
import type { Env } from './types';
import { handleInitialFetch } from './cron/initial-fetch';
import { handleIncrementalFetch } from './cron/incremental-fetch';
import { handleNormalize } from './cron/normalize';
import { handleRetry } from './cron/retry';
import { handleAIGeneration } from './cron/ai-generation';
import { handlePublish } from './cron/publish';
import { handleQueue } from './queue/handler';
import { logger } from './utils/logger';
import { validateEnv } from './utils/env';

/**
 * Cloudflare Workers 메인 엔트리 포인트
 */
const worker = {
  /**
   * HTTP 요청 핸들러
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      // 환경 변수 검증 포함
      const validation = validateEnv(env, ['DB', 'SETTINGS', 'FETCH_FAIL_QUEUE', 'DEAD_FAIL_QUEUE']);
      
      return Response.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: {
          valid: validation.valid,
          missing: validation.missing,
          warnings: validation.warnings,
        },
      }, { status: validation.valid ? 200 : 503 });
    }

    // API 라우트는 별도 핸들러로 분리 가능
    return new Response('Not Found', { status: 404 });
  },

  /**
   * Cron 작업 핸들러
   */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = controller.cron;
    const startTime = Date.now();

    // 런타임 환경 변수 검증 (각 워커 실행 전)
    try {
      const validation = validateEnv(env, ['DB', 'SETTINGS', 'FETCH_FAIL_QUEUE', 'DEAD_FAIL_QUEUE']);
      if (!validation.valid) {
        logger.workerError(`cron-${cron}`, new Error(`Missing required environment variables: ${validation.missing.join(', ')}`), {
          cron,
          missing: validation.missing,
          warnings: validation.warnings,
        });
        return;
      }

      // 경고가 있으면 로깅
      if (validation.warnings.length > 0) {
        logger.warn(`Environment warnings for cron ${cron}`, {
          cron,
          warnings: validation.warnings,
        });
      }
    } catch (error) {
      logger.workerError(`cron-${cron}`, error instanceof Error ? error : new Error(String(error)), { cron });
      return;
    }

    try {
      let workerName: string;
      
      switch (cron) {
        case '0 * * * *': // 초기 수집 (매 시간)
          workerName = 'initial-fetch';
          logger.workerStart(workerName, { cron });
          await handleInitialFetch(env, ctx);
          break;

        case '30 * * * *': // 증분 수집 (매 시간 30분)
          workerName = 'incremental-fetch';
          logger.workerStart(workerName, { cron });
          await handleIncrementalFetch(env, ctx);
          break;

        case '*/10 * * * *': // 정규화 워커 (10분마다)
          workerName = 'normalize';
          logger.workerStart(workerName, { cron });
          await handleNormalize(env, ctx);
          break;

        case '*/15 * * * *': // 재시도 워커 (15분마다)
          workerName = 'retry';
          logger.workerStart(workerName, { cron });
          await handleRetry(env, ctx);
          break;

        case '*/20 * * * *': // AI 생성 워커 (20분마다)
          workerName = 'ai-generation';
          logger.workerStart(workerName, { cron });
          await handleAIGeneration(env, ctx);
          break;

        case '0 */3 * * *': // 발행 워커 (3시간마다)
          workerName = 'publish';
          logger.workerStart(workerName, { cron });
          await handlePublish(env, ctx);
          break;

        default:
          logger.warn(`Unknown cron: ${cron}`, { cron });
          return;
      }

      const duration = Date.now() - startTime;
      logger.workerComplete(workerName, 0, duration, { cron });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.workerError(`cron-${cron}`, errorObj, { cron });
      // 에러는 로깅만 하고 재시도는 큐에서 처리
    }
  },

  /**
   * Queue 메시지 핸들러
   */
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    // 런타임 환경 변수 검증
    try {
      const validation = validateEnv(env, ['DB', 'SETTINGS', 'FETCH_FAIL_QUEUE', 'DEAD_FAIL_QUEUE']);
      if (!validation.valid) {
        logger.workerError('queue-handler', new Error(`Missing required environment variables: ${validation.missing.join(', ')}`), {
          missing: validation.missing,
          warnings: validation.warnings,
        });
        return;
      }

      if (validation.warnings.length > 0) {
        logger.warn('Environment warnings for queue handler', {
          warnings: validation.warnings,
        });
      }
    } catch (error) {
      logger.workerError('queue-handler', error instanceof Error ? error : new Error(String(error)), {});
      return;
    }

    await handleQueue(batch, env, ctx);
  },
};

export default worker as unknown as ExportedHandler<Env>;

