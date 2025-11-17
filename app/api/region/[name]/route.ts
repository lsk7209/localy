import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, eq, or, and, isNotNull, count } from 'drizzle-orm';
import { cache } from '@/workers/utils/cache';
import { checkAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { validateRegionName, sanitizeString } from '@/workers/utils/validation';
import { getCloudflareEnv } from '../../types';

/**
 * 지역별 통계 API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const env = getCloudflareEnv();
    
    if (!env?.DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const db = drizzle(env.DB, { schema });
    const { name } = await params;
    const rawRegionName = decodeURIComponent(name);
    const regionName = sanitizeString(rawRegionName);

    // 지역명 검증
    if (!validateRegionName(regionName)) {
      return NextResponse.json(
        { error: 'Invalid region name format' },
        { status: 400 }
      );
    }

    // Rate Limit 체크
    const rateLimitResult = await checkAPIRateLimit(env, request);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 캐시 확인
    const cached = await cache.regionStats.get(env, regionName);
      if (cached) {
        return NextResponse.json(cached);
      }

      // 지역 조건 (동, 시군구, 시도 모두 검색)
    const regionCondition = or(
      eq(schema.bizPlace.dong, regionName),
      eq(schema.bizPlace.sigungu, regionName),
      eq(schema.bizPlace.sido, regionName)
    )!;

    // 총 상가 개수
    const totalResult = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
      .where(
        and(
          regionCondition,
          isNotNull(schema.bizMeta.lastPublishedAt)
        )
      )
      .get();

    const totalStores = totalResult?.count || 0;

    // 업종별 통계
    const categoryStats = await db
      .select({
        category: schema.bizPlace.category,
        count: count(),
      })
      .from(schema.bizMeta)
      .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
      .where(
        and(
          regionCondition,
          isNotNull(schema.bizMeta.lastPublishedAt),
          sql`${schema.bizPlace.category} IS NOT NULL`
        )
      )
      .groupBy(schema.bizPlace.category)
      .orderBy(sql`count DESC`)
      .limit(10)
      .all();

    // 업종별 통계 계산
    const categories = categoryStats.map((stat) => ({
      name: stat.category || '기타',
      count: stat.count,
      percentage: totalStores > 0 ? ((stat.count / totalStores) * 100).toFixed(1) : '0',
    }));

    // 주요 업종 목록 (카운트가 많은 순)
      const mainCategories = categoryStats
        .slice(0, 6)
        .map((stat) => stat.category || '기타')
        .filter(Boolean);

      const responseData = {
        regionName,
        totalStores,
        categories,
        mainCategories,
      };

    // 캐시 저장
    await cache.regionStats.set(env, regionName, responseData);

      return NextResponse.json(responseData);
  } catch (error) {
    let errorName = 'unknown';
    try {
      const resolvedParams = await params;
      errorName = resolvedParams.name;
    } catch {
      // params를 가져올 수 없는 경우 무시
    }
    
    console.error('Failed to fetch region stats:', {
      error: error instanceof Error ? error.message : String(error),
      regionName: errorName,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

