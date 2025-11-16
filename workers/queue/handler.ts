import type { Env } from '../types';
import type { MessageBatch, ExecutionContext } from '@cloudflare/workers-types';
import { addToFailQueue } from '../utils/kv';
import { logger } from '../utils/logger';

/**
 * Queue 메시지 타입
 */
interface QueueMessage {
  type: 'fetch' | 'normalize' | 'publish' | 'ai_generation';
  payload: unknown;
}

/**
 * Queue 메시지 핸들러
 * Cloudflare Queue에서 받은 메시지를 처리
 */
export async function handleQueue(
  batch: MessageBatch,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const queueMessage = message.body as QueueMessage;

      if (!queueMessage || !queueMessage.type) {
        logger.error('Invalid queue message format', {
          body: message.body,
        });
        message.ack(); // 잘못된 메시지는 삭제
        continue;
      }

      await processQueueMessage(queueMessage, env, ctx);
      message.ack();
      logger.info('Processed queue message', {
        type: queueMessage.type,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to process queue message', {
        body: message.body,
      }, errorObj);

      // 실패한 메시지는 실패 큐에 추가
      try {
        await addToFailQueue(
          env,
          message.body,
          error instanceof Error ? error.message : 'Unknown error'
        );
        message.ack(); // 실패 큐에 추가했으므로 원본 메시지는 삭제
      } catch (failError) {
        logger.error('Failed to add message to fail queue', {
          body: message.body,
        }, failError instanceof Error ? failError : new Error(String(failError)));
        message.retry(); // 실패 큐 추가 실패 시 재시도
      }
    }
  }
}

/**
 * 큐 메시지 처리
 */
async function processQueueMessage(
  message: QueueMessage,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  switch (message.type) {
    case 'fetch':
      // 수집 작업은 Cron으로 처리되므로 여기서는 로깅만
      logger.info('Fetch message received (handled by Cron)', {
        payload: message.payload,
      });
      break;

    case 'normalize':
      // 정규화 작업은 Cron으로 처리되므로 여기서는 로깅만
      logger.info('Normalize message received (handled by Cron)', {
        payload: message.payload,
      });
      break;

    case 'publish':
      // 발행 작업은 Cron으로 처리되므로 여기서는 로깅만
      logger.info('Publish message received (handled by Cron)', {
        payload: message.payload,
      });
      break;

    case 'ai_generation':
      // AI 생성 작업은 Cron으로 처리되므로 여기서는 로깅만
      logger.info('AI generation message received (handled by Cron)', {
        payload: message.payload,
      });
      break;

    default:
      throw new Error(`Unknown queue message type: ${message.type}`);
  }
}

