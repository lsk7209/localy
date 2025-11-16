import type { Env } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDb } from '../utils/db';
import { bizMeta, bizPlace } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import OpenAI from 'openai';
import { requireOpenAIKey } from '../utils/env';
import { WORKER_CONFIG, API_CONFIG, MESSAGES } from '../constants';
import { WorkerTimer, sendErrorAlert } from '../utils/monitoring';
import { CPUTimer, logPerformanceWarning, processBatch } from '../utils/performance';
import { logger } from '../utils/logger';

/**
 * AI 생성 워커
 * OpenAI를 사용하여 요약 및 FAQ 생성
 */
export async function handleAIGeneration(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const db = getDb(env);
  const timer = new WorkerTimer('ai-generation', env);
  const cpuTimer = new CPUTimer();
  cpuTimer.checkpoint('start');

  // OpenAI API 키 검증
  let openai: OpenAI;
  try {
    const apiKey = requireOpenAIKey(env);
    openai = new OpenAI({
      apiKey,
    });
  } catch (error) {
    logger.warn('OpenAI API key not set. Skipping AI generation.', {
      error: error instanceof Error ? error.message : String(error),
    });
    await timer.finish(false, 0, 'OpenAI API key not set');
    return;
  }

  try {
    // 발행 가능하지 않고 AI 요약이 없는 여러 건 선택 (처리량 개선)
    const results = await db
      .select()
      .from(bizMeta)
      .innerJoin(bizPlace, eq(bizMeta.bizId, bizPlace.id))
      .where(
        and(
          eq(bizMeta.isPublishable, false),
          isNull(bizMeta.aiSummary)
        )
      )
      .limit(WORKER_CONFIG.AI_GENERATION_BATCH_SIZE)
      .all();

    if (results.length === 0) {
      logger.info('No stores to generate AI content for');
      return;
    }

    cpuTimer.checkpoint('selected');

    // 병렬 처리로 처리량 개선 (Cloudflare Workers 제한 고려)
    const processItem = async ({ biz_meta: meta, biz_place: place }: { biz_meta: typeof bizMeta.$inferSelect; biz_place: typeof bizPlace.$inferSelect }) => {
      try {
        // AI 요약과 FAQ를 병렬로 생성
        const [summaryResponse, faqResponse] = await Promise.all([
          openai.chat.completions.create({
            model: API_CONFIG.OPENAI_MODEL,
            messages: [
              {
                role: 'system',
                content: MESSAGES.AI_SYSTEM_SUMMARY,
              },
              {
                role: 'user',
                content: `다음 상가 정보를 요약해주세요:\n상호: ${place.name}\n주소: ${place.addrRoad || place.addrJibun}\n업종: ${place.category}`,
              },
            ],
            max_tokens: API_CONFIG.AI_SUMMARY_MAX_TOKENS,
          }),
          openai.chat.completions.create({
            model: API_CONFIG.OPENAI_MODEL,
            messages: [
              {
                role: 'system',
                content: MESSAGES.AI_SYSTEM_FAQ,
              },
              {
                role: 'user',
                content: `다음 상가 정보에 대한 FAQ를 생성해주세요:\n상호: ${place.name}\n주소: ${place.addrRoad || place.addrJibun}\n업종: ${place.category}`,
              },
            ],
            max_tokens: API_CONFIG.AI_FAQ_MAX_TOKENS,
          }),
        ]);

        const aiSummary = summaryResponse.choices[0]?.message?.content || null;
        const aiFaq = faqResponse.choices[0]?.message?.content || null;

        // 업데이트
        await db
          .update(bizMeta)
          .set({
            aiSummary: aiSummary || MESSAGES.AI_SUMMARY_DEFAULT,
            aiFaq,
            isPublishable: true, // 발행 가능 상태로 변경
          })
          .where(eq(bizMeta.bizId, meta.bizId));

        logger.info('AI generation completed for store', {
          bizId: meta.bizId,
        });
        return { success: true, bizId: meta.bizId };
      } catch (error) {
        logger.error('AI generation failed for store', {
          bizId: meta.bizId,
        }, error instanceof Error ? error : new Error(String(error)));
        // 실패 시 템플릿 문장으로 대체하고 발행 가능 상태로 변경
        await db
          .update(bizMeta)
          .set({
            aiSummary: MESSAGES.AI_SUMMARY_DEFAULT,
            aiFaq: null,
            isPublishable: true,
          })
          .where(eq(bizMeta.bizId, meta.bizId));
        return { success: false, bizId: meta.bizId };
      }
    };

    // 배치 처리로 병렬 처리 제한 (Cloudflare Workers CPU 시간 제한 고려)
    const processedResults = await processBatch(
      results,
      processItem,
      WORKER_CONFIG.MAX_PARALLEL_TASKS,
      100 // 배치 간 100ms 대기
    );

    cpuTimer.checkpoint('processed');
    logPerformanceWarning(cpuTimer, 'ai-generation', { 
      totalItems: results.length,
      batchSize: WORKER_CONFIG.MAX_PARALLEL_TASKS,
    });

    // 성공/실패 집계
    const successful = processedResults.filter((r) => r.success).length;
    const failed = processedResults.length - successful;

    logger.info('AI generation batch completed', {
      successful,
      failed,
      total: results.length,
    });
    await timer.finish(successful > 0, successful);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('AI generation worker failed', {}, errorObj);

    await sendErrorAlert(env, errorObj, {
      worker: 'ai-generation',
    });

    await timer.finish(false, 0, errorObj.message);
  }
}

