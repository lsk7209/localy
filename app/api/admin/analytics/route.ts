import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, count, eq, isNotNull, and, gte, desc } from 'drizzle-orm';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * Analytics ????????????곗뒭????API
 * 
 * ??ш끽維뽳쭩?좊쐪筌먲퐢?쒎＄???μ떜媛?슙?癰귥쥙?? ?????⑤뜪癲?????蹂κ텤?熬곎逾????, ??β뼯援???????뉗떜竊??⑸퉲?????釉먮빱????μ떜媛?걫?繹먃????ш끽維뽳쭩????癲ル슢?????
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit ?轅붽틓??????⒟?(RATE_LIMIT KV???ル봿?? ?????욱룑???????繹먭퍗爰???棺堉?댆???try-catch)
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
    const range = searchParams.get('range') || '????筌뤾쑵??;

    // ?????댟? ?嶺???????壤굿?????    const now = Date.now();
    const today = Math.floor(now / 1000);
    const todayStart = today - (today % 86400); // ????筌뤾쑵??00:00:00
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
      case '????筌뤾쑵??:
      default:
        startDate = todayStartDate;
        break;
    }

    // ????????癲????濚밸Ŧ???    let totalPublished = { count: 0 };
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

    // ???????????????ル봿????????⑤뜪癲ル슢?뤺キ??try-catch???轅붽틓??影?뽧걤??    try {
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

    // ?????⑤뜪癲?????蹂κ텤?熬곎逾???? ?????
    const formattedTopPages = topPages.map((page) => {
      const slug = `${page.bizPlace.sido}-${page.bizPlace.sigungu}-${page.bizPlace.dong}-${page.bizPlace.category}`.toLowerCase();
      const url = `/shop/${slug}`;
      const title = page.bizPlace.name 
        ? `${page.bizPlace.name} - ${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong}`
        : `${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong} ${page.bizPlace.category}`;
      
      return {
        title,
        url,
        pageviews: 0, // ????????곗뒭?????????살퓢癲????癲?嶺????????삳눇?????????띻콣?????썹땟???        visitors: 0, // ???????ш끽維??λ궔??醫귣쇀??????살퓢癲????癲?嶺????????삳눇?????????띻콣?????썹땟???        duration: '0??, // ??????轅붽틓??????????????살퓢癲????癲?嶺????????삳눇?????????띻콣?????썹땟???        source: 'Direct', // ??????????댟??る뜦???????紐쀦퓴?????살퓢癲????癲?嶺????????삳눇?????????띻콣?????썹땟???        publishedAt: page.lastPublishedAt
          ? new Date((page.lastPublishedAt as unknown as number) * 1000).toISOString()
          : null,
      };
    });

    // ??β뼯援???????뉗떜竊??⑸퉲?????釉먮빱??(KV????????ル봿????꿔꺂????紐꾩뮏?β뼯猷???
    let sitemapStatus = 'unknown';
    let lastIndexed = null;
    const indexNowLogs: Array<{ time: string; status: 'success' | 'fail'; engine: string }> = [];

    if (settingsKV) {
      try {
        // Sitemap ????釉먮빱??        const sitemapStatusValue = await settingsKV.get('sitemap:status');
        sitemapStatus = sitemapStatusValue || 'unknown';

        // ?轅붽틓????彛????嚥싲갭큔?????????        const lastIndexedValue = await settingsKV.get('sitemap:last_indexed');
        if (lastIndexedValue) {
          lastIndexed = new Date(lastIndexedValue).toLocaleString('ko-KR');
        }

        // IndexNow ?黎??筌??(?轅붽틓????彛??10??
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

    // ????節떷???????????援온?????ш끽維뽳쭩?좊쐪筌먲퐢?쒎＄??????(?轅붽틓?蹂잛젂?④낮釉???
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
      // ??ш끽維뽳쭩?좊쐪筌먲퐢?쒎＄???μ떜媛?슙?癰귥쥙??      publishStats: {
        totalPublished: totalPublished?.count || 0,
        thisWeekNew: thisWeekNew?.count || 0,
        periodUpdated: periodUpdated?.count || 0,
      },
      // ?????⑤뜪癲?????蹂κ텤?熬곎逾????
      topPages: formattedTopPages,
      // ??β뼯援???????뉗떜竊??⑸퉲?????釉먮빱??      searchStatus: {
        sitemapStatus,
        lastIndexed,
        indexNowLogs,
      },
      // ?轅붽틓?蹂잛젂?④낮釉???????????
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

