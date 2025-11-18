import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, count, eq, isNotNull, isNull, and, gte } from 'drizzle-orm';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * 관리자 대시보드 통계 API
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit 체크 (RATE_LIMIT KV가 없어도 동작하도록 try-catch)
    let rateLimitResult;
    try {
      rateLimitResult = await checkAdminAPIRateLimit(env, request);
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult);
      }
    } catch (rateLimitError) {
      // Rate Limit 체크 실패 시에도 계속 진행 (개발 환경 고려)
      console.warn('Rate limit check failed, continuing:', rateLimitError);
    }
    
    if (!env?.DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const db = drizzle(env.DB, { schema });

    // 오늘 날짜 계산 (Unix timestamp)
    const today = Math.floor(Date.now() / 1000);
    const todayStart = today - (today % 86400); // 오늘 00:00:00
    const sevenDaysAgo = todayStart - (7 * 86400);
    const todayStartDate = new Date(todayStart * 1000);
    const sevenDaysAgoDate = new Date(sevenDaysAgo * 1000);

    // 기본값 설정
    let totalStores = { count: 0 };
    let todayNewFetched = { count: 0 };
    let todayUpdated = { count: 0 };
    let todayPublished = { count: 0 };
    let totalPublished = { count: 0 };
    let pendingPublish = { count: 0 };
    let publishedLast7Days = { count: 0 };
    let totalRegions = { count: 0 };
    let lastUpdatedResult = null;

    // 각 쿼리를 개별적으로 try-catch로 처리
    try {
      totalStores = (await db
        .select({ count: count() })
        .from(schema.bizPlace)
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch totalStores:', error);
    }

    try {
      todayNewFetched = (await db
        .select({ count: count() })
        .from(schema.rawStore)
        .where(gte(schema.rawStore.fetchedAt, todayStartDate))
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch todayNewFetched:', error);
    }

    try {
      todayUpdated = (await db
        .select({ count: count() })
        .from(schema.rawStore)
        .where(gte(schema.rawStore.fetchedAt, todayStartDate))
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch todayUpdated:', error);
    }

    try {
      todayPublished = (await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(
          and(
            isNotNull(schema.bizMeta.lastPublishedAt),
            gte(schema.bizMeta.lastPublishedAt, todayStartDate)
          )
        )
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch todayPublished:', error);
    }

    try {
      totalPublished = (await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(isNotNull(schema.bizMeta.lastPublishedAt))
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch totalPublished:', error);
    }

    try {
      pendingPublish = (await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(
          and(
            eq(schema.bizMeta.isPublishable, true),
            isNull(schema.bizMeta.lastPublishedAt)
          )
        )
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch pendingPublish:', error);
    }

    try {
      publishedLast7Days = (await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(
          and(
            isNotNull(schema.bizMeta.lastPublishedAt),
            gte(schema.bizMeta.lastPublishedAt, sevenDaysAgoDate)
          )
        )
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch publishedLast7Days:', error);
    }

    try {
      totalRegions = (await db
        .select({ count: sql<number>`COUNT(DISTINCT ${schema.bizPlace.sido})` })
        .from(schema.bizPlace)
        .innerJoin(schema.bizMeta, eq(schema.bizPlace.id, schema.bizMeta.bizId))
        .where(isNotNull(schema.bizMeta.lastPublishedAt))
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch totalRegions:', error);
    }

    try {
      lastUpdatedResult = await db
        .select({ lastPublishedAt: schema.bizMeta.lastPublishedAt })
        .from(schema.bizMeta)
        .where(isNotNull(schema.bizMeta.lastPublishedAt))
        .orderBy(sql`${schema.bizMeta.lastPublishedAt} DESC`)
        .limit(1)
        .get();
    } catch (error) {
      console.error('Failed to fetch lastUpdatedResult:', error);
    }

    const publishedStores = totalPublished?.count || 0;

    return NextResponse.json({
      totalStores: totalStores?.count || 0,
      todayNewFetched: todayNewFetched?.count || 0,
      todayUpdated: todayUpdated?.count || 0,
      todayPublished: todayPublished?.count || 0,
      totalPublished: publishedStores,
      publishedStores, // 홈페이지용 별칭
      pendingPublish: pendingPublish?.count || 0,
      publishedLast7Days: publishedLast7Days?.count || 0,
      totalRegions: (totalRegions?.count as number) || 0,
      lastUpdated: lastUpdatedResult?.lastPublishedAt
        ? new Date((lastUpdatedResult.lastPublishedAt as unknown as number) * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

