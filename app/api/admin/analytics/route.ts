import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, count, eq, isNotNull, and, gte, desc } from 'drizzle-orm';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * Analytics ?怨쀬뵠??鈺곌퀬??API
 * 
 * 獄쏆뮉六??源껊궢, ?怨몄맄 ??륁뵠筌왖, 野꺜????쨌筌??怨밴묶 ?源놁뱽 獄쏆꼹???몃빍??
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit 筌ｋ똾寃?(RATE_LIMIT KV揶쎛 ??곷선????덉삂??롫즲嚥?try-catch)
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
    const range = searchParams.get('range') || '??삳뮎';

    // ?醫롮? 甕곕뗄???④쑴沅?    const now = Date.now();
    const today = Math.floor(now / 1000);
    const todayStart = today - (today % 86400); // ??삳뮎 00:00:00
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
      case '??삳뮎':
      default:
        startDate = todayStartDate;
        break;
    }

    // 疫꿸퀡??첎???쇱젟
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

    // 揶??묒눖?곭몴?揶쏆뮆??怨몄몵嚥?try-catch嚥?筌ｌ꼶??    try {
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

    // ?怨몄맄 ??륁뵠筌왖 ?????
    const formattedTopPages = topPages.map((page) => {
      const slug = `${page.bizPlace.sido}-${page.bizPlace.sigungu}-${page.bizPlace.dong}-${page.bizPlace.category}`.toLowerCase();
      const url = `/shop/${slug}`;
      const title = page.bizPlace.name 
        ? `${page.bizPlace.name} - ${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong}`
        : `${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong} ${page.bizPlace.category}`;
      
      return {
        title,
        url,
        pageviews: 0, // ?곕???鈺곌퀬????곕뗄????뽯뮞???닌뗭겱 ????낅쑓??꾨뱜
        visitors: 0, // ?곕???獄쎻뫖揆???곕뗄????뽯뮞???닌뗭겱 ????낅쑓??꾨뱜
        duration: '0??, // ?곕???筌ｋ?履??볦퍢 ?곕뗄????뽯뮞???닌뗭겱 ????낅쑓??꾨뱜
        source: 'Direct', // ?곕????醫롮뿯野껋럥以??곕뗄????뽯뮞???닌뗭겱 ????낅쑓??꾨뱜
        publishedAt: page.lastPublishedAt
          ? new Date((page.lastPublishedAt as unknown as number) * 1000).toISOString()
          : null,
      };
    });

    // 野꺜????쨌筌??怨밴묶 (KV?癒?퐣 揶쎛?紐꾩궎疫?
    let sitemapStatus = 'unknown';
    let lastIndexed = null;
    const indexNowLogs: Array<{ time: string; status: 'success' | 'fail'; engine: string }> = [];

    if (settingsKV) {
      try {
        // Sitemap ?怨밴묶
        const sitemapStatusValue = await settingsKV.get('sitemap:status');
        sitemapStatus = sitemapStatusValue || 'unknown';

        // 筌ㅼ뮄????깆뵥 ??볦퍢
        const lastIndexedValue = await settingsKV.get('sitemap:last_indexed');
        if (lastIndexedValue) {
          lastIndexed = new Date(lastIndexedValue).toLocaleString('ko-KR');
        }

        // IndexNow 嚥≪뮄??(筌ㅼ뮄??10揶?
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

    // ?醫뤾문??疫꿸퀗而???獄쏆뮉六?????(筌△뫂???
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
      // 獄쏆뮉六??源껊궢
      publishStats: {
        totalPublished: totalPublished?.count || 0,
        thisWeekNew: thisWeekNew?.count || 0,
        periodUpdated: periodUpdated?.count || 0,
      },
      // ?怨몄맄 ??륁뵠筌왖
      topPages: formattedTopPages,
      // 野꺜????쨌筌??怨밴묶
      searchStatus: {
        sitemapStatus,
        lastIndexed,
        indexNowLogs,
      },
      // 筌△뫂???怨쀬뵠??
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

