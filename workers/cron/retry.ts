import type { Env, FailQueueMessage } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getFailQueueMessages, moveToDeadQueue, addToFailQueue } from '../utils/kv';
import { WORKER_CONFIG } from '../constants';
import { handleInitialFetch } from './initial-fetch';
import { handleIncrementalFetch } from './incremental-fetch';
import { CPUTimer, logPerformanceWarning, processBatch, withTimeout } from '../utils/performance';
import { logger } from '../utils/logger';

/**
 * 재시도 워커
 * 실패 큐의 메시지를 재처리
 */
export async function handleRetry(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const cpuTimer = new CPUTimer();
  cpuTimer.checkpoint('start');

  try {
    const messages = await getFailQueueMessages(env, 100);
    cpuTimer.checkpoint('fetched');

    if (messages.length === 0) {
      logger.info('No failed messages to retry');
      return;
    }

    // 영구 실패 큐로 이동할 메시지와 재시도할 메시지 분리
    const deadMessages: FailQueueMessage[] = [];
    const retryMessages: FailQueueMessage[] = [];

    for (const message of messages) {
      if (message.retryCount >= WORKER_CONFIG.RETRY_MAX_COUNT) {
        deadMessages.push(message);
      } else {
        retryMessages.push(message);
      }
    }

    // 영구 실패 큐로 이동 (병렬 처리)
    const moveToDeadPromises = deadMessages.map((message) =>
      moveToDeadQueue(env, message).catch((error) => {
        logger.error('Failed to move message to dead queue', {
          payload: message.payload,
        }, error instanceof Error ? error : new Error(String(error)));
      })
    );
    await Promise.all(moveToDeadPromises);

    cpuTimer.checkpoint('moved-to-dead');

    // 재시도 처리 (배치 처리로 최적화)
    const processRetry = async (message: FailQueueMessage): Promise<{ success: boolean; message: FailQueueMessage }> => {
      try {
        // 재시도 횟수에 따라 대기 시간 증가 (지수 백오프)
        const backoffDelay = Math.min(1000 * Math.pow(2, message.retryCount), 30000); // 최대 30초
        if (backoffDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }

        // 타임아웃 설정 (25초, 총 실행 시간 제한 고려)
        await withTimeout(
          processFailedMessage(message.payload, env, ctx),
          25000,
          `Retry timeout for message type: ${(message.payload as Record<string, unknown>)?.type}`
        );

        logger.info('Successfully retried message', {
          payload: message.payload,
        });
        return { success: true, message };
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Retry failed for message', {
          payload: message.payload,
          retryCount: message.retryCount,
        }, errorObj);

        // 재시도 실패 시 retryCount 증가하여 다시 큐에 추가
        await addToFailQueue(
          env,
          message.payload,
          errorObj.message,
          message.retryCount + 1
        );

        return { success: false, message };
      }
    };

    // 배치 처리로 재시도 (병렬 처리 제한)
    const retryResults = await processBatch(
      retryMessages,
      processRetry,
      5, // 최대 5개 동시 재시도
      200 // 배치 간 200ms 대기
    );

    cpuTimer.checkpoint('retried');
    logPerformanceWarning(cpuTimer, 'retry', {
      totalMessages: messages.length,
      retried: retryMessages.length,
      movedToDead: deadMessages.length,
    });

    const retried = retryResults.filter((r) => r.success).length;
    logger.info('Retry completed', {
      retried,
      totalRetryMessages: retryMessages.length,
      movedToDead: deadMessages.length,
    });
  } catch (error) {
    logger.error('Retry failed', {}, error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 실패한 메시지 재처리
 */
async function processFailedMessage(
  payload: unknown,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  // payload 타입 확인 및 처리
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload format');
  }

  const payloadObj = payload as Record<string, unknown>;
  const messageType = payloadObj.type;

  switch (messageType) {
    case 'initial_fetch':
      // 초기 수집 재시도
      await handleInitialFetch(env, ctx);
      break;

    case 'incremental_fetch':
      // 증분 수집 재시도
      await handleIncrementalFetch(env, ctx);
      break;

    default:
      throw new Error(`Unknown message type: ${String(messageType)}`);
  }
}

