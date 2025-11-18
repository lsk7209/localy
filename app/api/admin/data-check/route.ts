import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../../types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { count, desc, sql } from 'drizzle-orm';
import { logger } from '@/workers/utils/logger';

/**
 * 수집된 데이터 확인 API
 * 
 * raw_store, biz_place, biz_meta 테이블의 데이터를 조회합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    if (!env?.DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const db = drizzle(env.DB, { schema });
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 전체 통계
    const rawStoreCount = await db
      .select({ count: count() })
      .from(schema.rawStore)
      .get();

    const bizPlaceCount = await db
      .select({ count: count() })
      .from(schema.bizPlace)
      .get();

    const bizMetaCount = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .get();

    // 최근 수집된 데이터 (raw_store)
    const recentRawStores = await db
      .select({
        sourceId: schema.rawStore.sourceId,
        nameRaw: schema.rawStore.nameRaw,
        addrRaw: schema.rawStore.addrRaw,
        categoryRaw: schema.rawStore.categoryRaw,
        fetchedAt: schema.rawStore.fetchedAt,
      })
      .from(schema.rawStore)
      .orderBy(desc(schema.rawStore.fetchedAt))
      .limit(limit)
      .all();

    // 최근 정규화된 데이터 (biz_place)
    const recentBizPlaces = await db
      .select({
        id: schema.bizPlace.id,
        name: schema.bizPlace.name,
        sido: schema.bizPlace.sido,
        sigungu: schema.bizPlace.sigungu,
        dong: schema.bizPlace.dong,
        category: schema.bizPlace.category,
        updatedAt: schema.bizPlace.updatedAt,
      })
      .from(schema.bizPlace)
      .orderBy(desc(schema.bizPlace.updatedAt))
      .limit(limit)
      .all();

    // 발행된 데이터 (biz_meta)
    const publishedStores = await db
      .select({
        bizId: schema.bizMeta.bizId,
        slug: schema.bizMeta.slug,
        lastPublishedAt: schema.bizMeta.lastPublishedAt,
        bizPlace: {
          name: schema.bizPlace.name,
          sido: schema.bizPlace.sido,
          sigungu: schema.bizPlace.sigungu,
          dong: schema.bizPlace.dong,
        },
      })
      .from(schema.bizMeta)
      .innerJoin(schema.bizPlace, sql`${schema.bizMeta.bizId} = ${schema.bizPlace.id}`)
      .where(sql`${schema.bizMeta.lastPublishedAt} IS NOT NULL`)
      .orderBy(desc(schema.bizMeta.lastPublishedAt))
      .limit(limit)
      .all();

    // 카테고리별 통계
    const categoryStats = await db
      .select({
        category: schema.rawStore.categoryRaw,
        count: count(),
      })
      .from(schema.rawStore)
      .groupBy(schema.rawStore.categoryRaw)
      .orderBy(desc(count()))
      .limit(10)
      .all();

    // 지역별 통계 (정규화된 데이터)
    const regionStats = await db
      .select({
        sido: schema.bizPlace.sido,
        sigungu: schema.bizPlace.sigungu,
        count: count(),
      })
      .from(schema.bizPlace)
      .groupBy(schema.bizPlace.sido, schema.bizPlace.sigungu)
      .orderBy(desc(count()))
      .limit(10)
      .all();

    return NextResponse.json({
      summary: {
        rawStore: rawStoreCount?.count || 0,
        bizPlace: bizPlaceCount?.count || 0,
        bizMeta: bizMetaCount?.count || 0,
      },
      recentRawStores: recentRawStores.map(store => ({
        ...store,
        fetchedAt: store.fetchedAt
          ? new Date((store.fetchedAt as unknown as number) * 1000).toISOString()
          : null,
      })),
      recentBizPlaces: recentBizPlaces.map(place => ({
        ...place,
        updatedAt: place.updatedAt
          ? new Date((place.updatedAt as unknown as number) * 1000).toISOString()
          : null,
      })),
      publishedStores: publishedStores.map(store => ({
        ...store,
        lastPublishedAt: store.lastPublishedAt
          ? new Date((store.lastPublishedAt as unknown as number) * 1000).toISOString()
          : null,
      })),
      categoryStats,
      regionStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to check data', {}, errorObj);
    
    return NextResponse.json(
      {
        error: 'Failed to check data',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

