import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, count, eq, isNotNull, and, gte, desc } from 'drizzle-orm';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * Analytics ????????????怨쀫뮡????API
 * 
 * ????썹땟戮녹??醫딆맚嶺뚮㉡???롳펲???關?쒎첎????곌램伊?? ??????ㅻ쑋??????癰궽블뀮??ш퀚??????, ??棺堉?뤃????????쀫뼔塋???명돯??????됰Ŧ鍮????關?쒎첎?嫄?濚밸쮦???????썹땟戮녹??????꿔꺂??????
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit ?饔낅떽?????????(RATE_LIMIT KV????ル늉?? ??????깅즿???????濚밸Þ?쀧댆???汝뷴젆?????try-catch)
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
    const range = searchParams.get('range') || '????嶺뚮ㅎ???;

    // ??????읐? ?癲???????鶯ㅺ동??????    const now = Date.now();
    const today = Math.floor(now / 1000);
    const todayStart = today - (today % 86400); // ????嶺뚮ㅎ???00:00:00
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
      case '????嶺뚮ㅎ???:
      default:
        startDate = todayStartDate;
        break;
    }

    // ?????????????嚥싲갭큔???    let totalPublished = { count: 0 };
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

    // ????????????????ル늉?????????ㅻ쑋?꿔꺂??琉뷩궘??try-catch???饔낅떽???壤굿?戮㏐광??    try {
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

    // ??????ㅻ쑋??????癰궽블뀮??ш퀚?????? ?????
    const formattedTopPages = topPages.map((page) => {
      const slug = `${page.bizPlace.sido}-${page.bizPlace.sigungu}-${page.bizPlace.dong}-${page.bizPlace.category}`.toLowerCase();
      const url = `/shop/${slug}`;
      const title = page.bizPlace.name 
        ? `${page.bizPlace.name} - ${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong}`
        : `${page.bizPlace.sido} ${page.bizPlace.sigungu} ${page.bizPlace.dong} ${page.bizPlace.category}`;
      
      return {
        title,
        url,
        pageviews: 0, // ????????怨쀫뮡??????????댄뱼???????癲?????????노늾??????????살숲??????밸븶???        visitors: 0, // ?????????썹땟??貫沅???リ랜????????댄뱼???????癲?????????노늾??????????살숲??????밸븶???        duration: '0??, // ??????饔낅떽????????????????댄뱼???????癲?????????노늾??????????살숲??????밸븶???        source: 'Direct', // ???????????읐???뗫쑆???????筌륁?벖??????댄뱼???????癲?????????노늾??????????살숲??????밸븶???        publishedAt: page.lastPublishedAt
          ? new Date((page.lastPublishedAt as unknown as number) * 1000).toISOString()
          : null,
      };
    });

    // ??棺堉?뤃????????쀫뼔塋???명돯??????됰Ŧ鍮??(KV?????????ル늉????轅붽틓????筌뤾쑴裕?棺堉?뙴???
    let sitemapStatus = 'unknown';
    let lastIndexed = null;
    const indexNowLogs: Array<{ time: string; status: 'success' | 'fail'; engine: string }> = [];

    if (settingsKV) {
      try {
        // Sitemap ?????됰Ŧ鍮??        const sitemapStatusValue = await settingsKV.get('sitemap:status');
        sitemapStatus = sitemapStatusValue || 'unknown';

        // ?饔낅떽?????壤?????μ떜媛?걫?????????        const lastIndexedValue = await settingsKV.get('sitemap:last_indexed');
        if (lastIndexedValue) {
          lastIndexed = new Date(lastIndexedValue).toLocaleString('ko-KR');
        }

        // IndexNow ?癲??嶺??(?饔낅떽?????壤??10??
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

    // ????影?력????????????댁삩????????썹땟戮녹??醫딆맚嶺뚮㉡???롳펲??????(?饔낅떽??癰귥옕???ｋ궙????
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
      // ????썹땟戮녹??醫딆맚嶺뚮㉡???롳펲???關?쒎첎????곌램伊??      publishStats: {
        totalPublished: totalPublished?.count || 0,
        thisWeekNew: thisWeekNew?.count || 0,
        periodUpdated: periodUpdated?.count || 0,
      },
      // ??????ㅻ쑋??????癰궽블뀮??ш퀚??????
      topPages: formattedTopPages,
      // ??棺堉?뤃????????쀫뼔塋???명돯??????됰Ŧ鍮??      searchStatus: {
        sitemapStatus,
        lastIndexed,
        indexNowLogs,
      },
      // ?饔낅떽??癰귥옕???ｋ궙????????????
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


