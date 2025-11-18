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
    const thirtyDaysAgo = todayStart - (30 * 86400);

    // 총 등록 상가 수
    const totalStores = await db
      .select({ count: count() })
      .from(schema.bizPlace)
      .get();

    // 오늘 신규 수집 (raw_store에서 오늘 추가된 것)
    const todayNewFetched = await db
      .select({ count: count() })
      .from(schema.rawStore)
      .where(gte(schema.rawStore.fetchedAt, new Date(todayStart * 1000)))
      .get();

    // 오늘 정보 수정 (증분 수집으로 업데이트된 것)
    const todayUpdated = await db
      .select({ count: count() })
      .from(schema.rawStore)
      .where(gte(schema.rawStore.fetchedAt, new Date(todayStart * 1000)))
      .get();

    // 오늘 발행 페이지 수
    // todayStart는 이미 초 단위이므로 Date 객체로 변환
    const todayStartDate = new Date(todayStart * 1000);
    const todayPublished = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .where(
        and(
          isNotNull(schema.bizMeta.lastPublishedAt),
          gte(schema.bizMeta.lastPublishedAt, todayStartDate)
        )
      )
      .get();

    // 전체 발행 페이지 수
    const totalPublished = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .where(isNotNull(schema.bizMeta.lastPublishedAt))
      .get();

    // 발행 대기 수
    const pendingPublish = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .where(
        and(
          eq(schema.bizMeta.isPublishable, true),
          isNull(schema.bizMeta.lastPublishedAt)
        )
      )
      .get();

    // 최근 7일 발행량
    // sevenDaysAgo는 이미 초 단위이므로 Date 객체로 변환
    const sevenDaysAgoDate = new Date(sevenDaysAgo * 1000);
    const publishedLast7Days = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .where(
        and(
          isNotNull(schema.bizMeta.lastPublishedAt),
          gte(schema.bizMeta.lastPublishedAt, sevenDaysAgoDate)
        )
      )
      .get();

    // 발행된 상가 수 (홈페이지용)
    const publishedStores = totalPublished?.count || 0;

    // 지역 수 (고유한 시도 수)
    const totalRegions = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${schema.bizPlace.sido})` })
      .from(schema.bizPlace)
      .innerJoin(schema.bizMeta, eq(schema.bizPlace.id, schema.bizMeta.bizId))
      .where(isNotNull(schema.bizMeta.lastPublishedAt))
      .get();

    // 최종 업데이트 시간 (가장 최근 발행 시간)
    const lastUpdatedResult = await db
      .select({ lastPublishedAt: schema.bizMeta.lastPublishedAt })
      .from(schema.bizMeta)
      .where(isNotNull(schema.bizMeta.lastPublishedAt))
      .orderBy(sql`${schema.bizMeta.lastPublishedAt} DESC`)
      .limit(1)
      .get();

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

