import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, count, eq, isNotNull, and, gte, desc } from 'drizzle-orm';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * Analytics ?�이??조회 API
 * 
 * 발행 ?�과, ?�위 ?�이지, 검???�롤�??�태 ?�을 반환?�니??
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit 체크 (RATE_LIMIT KV가 ?�어???�작?�도�?try-catch)
    let rateLimitResult;
    try {
      rateLimitResult = await checkAdminAPIRateLimit(env, request);
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult);
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, continuing:', rateLimitError);
    }
    
    if (!env?.DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const db = drizzle(env.DB, { schema });
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '?�늘';

    // ?�짜 범위 계산
    const now = Date.now();
    const today = Math.floor(now / 1000);
    const todayStart = today - (today % 86400); // ?�늘 00:00:00
    const todayStartDate = new Date(todayStart * 1000);
    
    let startDate: Date;
    switch (range) {
      case '7??:
        startDate = new Date((todayStart - 7 * 86400) * 1000);
        break;
      case '30??:
        startDate = new Date((todayStart - 30 * 86400) * 1000);
        break;
      case '90??:
        startDate = new Date((todayStart - 90 * 86400) * 1000);
        break;
      case '?�늘':
      default:
        startDate = todayStartDate;
        break;
    }

    // 기본�??�정
    let totalPublished = { count: 0 };
    let thisWeekNew = { count: 0 };
    let periodUpdated = { count: 0 };
    let topPages: Array<{
      bizId: string;
      lastPublishedAt: number | Date | null;
      bizPlace: {
        name: string | null;
        sido: string | null;
        sigungu: string | null;
        dong: string | null;
        category: string | null;
      };
    }> = [];
    let publishedStats: Array<{ date: string; count: number }> = [];

    // �?쿼리�?개별?�으�?try-catch�?처리
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
      const weekAgo = new Date((todayStart - 7 * 86400) * 1000);
      thisWeekNew = (await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(
          and(
            isNotNull(schema.bizMeta.lastPublishedAt),
            gte(schema.bizMeta.lastPublishedAt, weekAgo)
          )
        )
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch thisWeekNew:', error);
    }

    try {
      periodUpdated = (await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(
          and(
            isNotNull(schema.bizMeta.lastPublishedAt),
            gte(schema.bizMeta.lastPublishedAt, startDate)
          )
        )
        .get()) || { count: 0 };
    } catch (error) {
      console.error('Failed to fetch periodUpdated:', error);
    }

    try {
      topPages = await db
        .select({
          bizId: schema.bizMeta.bizId,
          lastPublishedAt: schema.bizMeta.lastPublishedAt,
          bizPlace: {
            name: schema.bizPlace.name,
            sido: schema.bizPlace.sido,
            sigungu: schema.bizPlace.sigungu,
            dong: schema.bizPlace.dong,
            category: schema.bizPlace.category,
          },
        })
        .from(schema.bizMeta)
        .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
        .where(isNotNull(schema.bizMeta.lastPublishedAt))
        .orderBy(desc(schema.bizMeta.lastPublishedAt))
        .limit(10)
        .all();
    } catch (error) {
      console.error('Failed to fetch topPages:', error);
      topPages = [];
    }

    // ?�위 ?�이지 ?�맷??
    const formattedTopPages = topPages.map((page) => {
      const slug = `${page.bizPlace.sido}-${page.bizPlace.sigungu}-${page.bizPlace.dong}-${page.bizPlace.category}`.toLowerCase();
      const url = `/shop/${slug}`;
      const title = page.bizPlace.name 
        ? `${page.bizPlace.name} - ${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong}`
        : `${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong} ${page.bizPlace.category}`;
      
      return {
        title,
        url,
        pageviews: 0, // 추후 조회??추적 ?�스??구현 ???�데?�트
        visitors: 0, // 추후 방문??추적 ?�스??구현 ???�데?�트
        duration: '0�?, // 추후 체류?�간 추적 ?�스??구현 ???�데?�트
        source: 'Direct', // 추후 ?�입경로 추적 ?�스??구현 ???�데?�트
        publishedAt: page.lastPublishedAt
          ? new Date((page.lastPublishedAt as unknown as number) * 1000).toISOString()
          : null,
      };
    });

    // 검???�롤�??�태 (KV?�서 가?�오�?
    let sitemapStatus = 'unknown';
    let lastIndexed = null;
    const indexNowLogs: Array<{ time: string; status: 'success' | 'fail'; engine: string }> = [];

    if (settingsKV) {
      try {
        // Sitemap ?�태
        const sitemapStatusValue = await settingsKV.get('sitemap:status');
        sitemapStatus = sitemapStatusValue || 'unknown';

        // 최근 ?�인 ?�간
        const lastIndexedValue = await settingsKV.get('sitemap:last_indexed');
        if (lastIndexedValue) {
          lastIndexed = new Date(lastIndexedValue).toLocaleString('ko-KR');
        }

        // IndexNow 로그 (최근 10�?
        const indexNowList = await settingsKV.list({ prefix: 'indexnow:' });
        const indexNowEntries = await Promise.all(
          indexNowList.keys.slice(0, 10).map(async (key) => {
            try {
              const value = await settingsKV.get(key.name);
              if (!value) return null;
              const log = JSON.parse(value);
              return {
                time: new Date(log.timestamp).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                status: log.success ? 'success' as const : 'fail' as const,
                engine: log.engine || 'Unknown',
              };
            } catch {
              return null;
            }
          })
        );
        indexNowLogs.push(...indexNowEntries.filter((log): log is NonNullable<typeof log> => log !== null));
      } catch (kvError) {
        console.error('Failed to fetch KV data:', kvError);
      }
    }

    // ?�택??기간 ??발행 ?�계 (차트??
    try {
      publishedStats = await db
        .select({
          date: sql<string>`DATE(${schema.bizMeta.lastPublishedAt}, 'unixepoch') as date`,
          count: count(),
        })
        .from(schema.bizMeta)
        .where(
          and(
            isNotNull(schema.bizMeta.lastPublishedAt),
            gte(schema.bizMeta.lastPublishedAt, startDate)
          )
        )
        .groupBy(sql`DATE(${schema.bizMeta.lastPublishedAt}, 'unixepoch')`)
        .orderBy(sql`DATE(${schema.bizMeta.lastPublishedAt}, 'unixepoch')`)
        .all();
    } catch (error) {
      console.error('Failed to fetch publishedStats:', error);
      publishedStats = [];
    }

    return NextResponse.json({
      // 발행 ?�과
      publishStats: {
        totalPublished: totalPublished?.count || 0,
        thisWeekNew: thisWeekNew?.count || 0,
        periodUpdated: periodUpdated?.count || 0,
      },
      // ?�위 ?�이지
      topPages: formattedTopPages,
      // 검???�롤�??�태
      searchStatus: {
        sitemapStatus,
        lastIndexed,
        indexNowLogs,
      },
      // 차트 ?�이??
      chartData: publishedStats.map((stat) => ({
        date: stat.date,
        count: stat.count,
      })),
      range,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

