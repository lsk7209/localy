import type { Env } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDb } from '../utils/db';
import { bizMeta, bizPlace } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { generateSlug, generateUniqueSlug } from '../utils/slug';
import { WORKER_CONFIG, API_CONFIG } from '../constants';
import { requireNextjsUrl, requireRevalidateApiKey } from '../utils/env';
import { updateSitemap } from '../utils/sitemap';
import { pingIndexNow } from '../utils/indexnow';
import { WorkerTimer, sendErrorAlert } from '../utils/monitoring';
import { cache } from '../utils/cache';
import { CPUTimer, logPerformanceWarning, scheduleBackgroundTask, withTimeout } from '../utils/performance';
import { logger } from '../utils/logger';

/**
 * 발행 워커
 * is_publishable=1이고 아직 발행되지 않은 상가를 발행
 */
export async function handlePublish(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const db = getDb(env);
  const timer = new WorkerTimer('publish', env);
  const cpuTimer = new CPUTimer();
  cpuTimer.checkpoint('start');

  // Next.js URL 및 API 키 검증
  let nextjsUrl: string | undefined;
  let revalidateApiKey: string | undefined;
  
  try {
    nextjsUrl = requireNextjsUrl(env);
    revalidateApiKey = requireRevalidateApiKey(env);
  } catch (error) {
    logger.warn('Next.js URL or Revalidate API key not set. Skipping revalidation.', {
      error: error instanceof Error ? error.message : String(error),
    });
    // API 키가 없어도 발행은 계속 진행 (로컬 개발 환경 등)
  }

  // 발행된 URL 목록 (sitemap 및 IndexNow용)
  const publishedUrls: string[] = [];

  try {
    // 발행할 상가 조회
    const results = await db
      .select()
      .from(bizMeta)
      .innerJoin(bizPlace, eq(bizMeta.bizId, bizPlace.id))
      .where(
        and(
          eq(bizMeta.isPublishable, true),
          isNull(bizMeta.lastPublishedAt)
        )
      )
      .limit(WORKER_CONFIG.PUBLISH_BATCH_SIZE)
      .all();

    if (results.length === 0) {
      logger.info('No stores to publish');
      return;
    }

    for (const { biz_meta: meta, biz_place: place } of results) {
      try {
        // slug가 없으면 생성 및 중복 체크
        let slug = meta.slug;
        if (!slug) {
          const baseSlug = place.name && place.dong
            ? generateSlug(place.name, place.dong)
            : `store-${meta.bizId.substring(0, 8)}`;

          // 중복 체크 및 고유한 slug 생성
          let candidateSlug = baseSlug;
          let attempts = 0;
          const maxAttempts = 10; // 무한 루프 방지

          while (attempts < maxAttempts) {
            const existing = await db
              .select()
              .from(bizMeta)
              .where(eq(bizMeta.slug, candidateSlug))
              .get();

            if (!existing || existing.bizId === meta.bizId) {
              // 중복이 없거나 자기 자신이면 사용
              slug = candidateSlug;
              break;
            }

            // 중복이 있으면 고유한 slug 생성
            candidateSlug = generateUniqueSlug(
              place.name || 'unknown',
              place.dong || 'unknown',
              baseSlug
            );
            attempts++;
          }

          if (!slug) {
            // 최대 시도 횟수 초과 시 bizId 기반 slug 사용
            slug = `store-${meta.bizId.substring(0, 8)}-${Date.now().toString(36).substring(0, 4)}`;
            logger.warn('Failed to generate unique slug after max attempts, using fallback', {
              bizId: meta.bizId,
              fallbackSlug: slug,
            });
          }
        }

          // slug와 발행 시간을 하나의 UPDATE로 통합 (D1 쿼리 수 최적화)
          // Note: Drizzle ORM의 SQLite 타입 추론 제한으로 인해 'as any' 캐스팅 필요
          const updateData: { slug?: string; lastPublishedAt: number } = {
            lastPublishedAt: Math.floor(Date.now() / 1000),
          };
          if (!meta.slug && slug) {
            updateData.slug = slug;
          }

          await db
            .update(bizMeta)
            .set(updateData as any)
            .where(eq(bizMeta.bizId, meta.bizId));

        // Next.js ISR on-demand revalidate 호출 (타임아웃 설정)
        if (nextjsUrl && revalidateApiKey && slug) {
          try {
            const revalidateUrl = `${nextjsUrl}${API_CONFIG.REVALIDATE_ENDPOINT}`;
            const response = await withTimeout(
              fetch(revalidateUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${revalidateApiKey}`,
                },
                body: JSON.stringify({ slug }),
              }),
              10000, // 10초 타임아웃
              `Revalidation timeout for slug: ${slug}`
            );

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Revalidation failed: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            logger.info('Revalidated store', {
              slug,
              result,
            });
          } catch (error) {
            logger.error('Failed to revalidate store', {
              slug,
            }, error instanceof Error ? error : new Error(String(error)));
            // Revalidation 실패해도 발행은 계속 진행
          }
        }

        // 캐시 무효화 (상가 상세 페이지 캐시 삭제)
        if (slug) {
          try {
            await cache.shopDetail.delete(env, slug);
            // 상가 목록 캐시도 삭제 (전체 목록 캐시 무효화)
            await cache.shopList.delete(env);
          } catch (cacheError) {
            logger.warn('Failed to invalidate cache for store', {
              slug,
              error: cacheError instanceof Error ? cacheError.message : String(cacheError),
            });
            // 캐시 삭제 실패해도 발행은 계속 진행
          }
        }

        // 발행된 URL 추가
        if (nextjsUrl && slug) {
          publishedUrls.push(`${nextjsUrl}/shop/${slug}`);
        }

        logger.info('Published store', {
          slug,
          bizId: meta.bizId,
        });
      } catch (error) {
        logger.error('Failed to publish store', {
          bizId: meta.bizId,
          slug: meta.slug || 'unknown',
        }, error instanceof Error ? error : new Error(String(error)));
        // 개별 실패는 로깅만 하고 계속 진행
      }
    }

    cpuTimer.checkpoint('published');
    logPerformanceWarning(cpuTimer, 'publish', { 
      publishedCount: results.length,
    });

    // Sitemap 갱신 및 IndexNow ping은 백그라운드 작업으로 처리
    // ExecutionContext.waitUntil()을 사용하여 CPU 시간에 포함되지 않도록 함
    if (nextjsUrl && publishedUrls.length > 0) {
      const publishedSlugs = publishedUrls.map((url) => {
        const match = url.match(/\/shop\/([^\/]+)$/);
        return match ? match[1] : '';
      }).filter(Boolean);

      // Sitemap 갱신을 백그라운드 작업으로 처리
      scheduleBackgroundTask(
        ctx,
        updateSitemap(env, publishedSlugs, nextjsUrl).catch((error) => {
          logger.error('Failed to update sitemap', {}, error instanceof Error ? error : new Error(String(error)));
        }),
        'sitemap update'
      );

      // IndexNow ping을 백그라운드 작업으로 처리
      scheduleBackgroundTask(
        ctx,
        pingIndexNow(publishedUrls, nextjsUrl).catch((error) => {
          logger.error('Failed to ping IndexNow', {}, error instanceof Error ? error : new Error(String(error)));
        }),
        'IndexNow ping'
      );
    }

    logger.info('Published stores', {
      count: results.length,
    });
    await timer.finish(true, results.length);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Publish failed', {}, errorObj);

    await sendErrorAlert(env, errorObj, {
      worker: 'publish',
    });

    await timer.finish(false, 0, errorObj.message);
  }
}

