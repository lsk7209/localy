import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, count, isNotNull, eq, and } from 'drizzle-orm';
import { logger } from '@/workers/utils/logger';

/**
 * 업종별 통계 및 목록 조회 API
 * 
 * @example
 * GET /api/categories - 모든 업종 통계
 * GET /api/categories?category=음식점 - 특정 업종의 매장 목록
 * GET /api/categories?category=음식점&page=1&limit=20 - 페이지네이션
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
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // 특정 업종의 매장 목록 조회
    if (category) {
      try {
        // 총 개수 조회
        const totalResult = await db
          .select({ count: count() })
          .from(schema.bizMeta)
          .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
          .where(
            and(
              eq(schema.bizPlace.category, category),
              isNotNull(schema.bizMeta.lastPublishedAt)
            )
          )
          .get();

        const total = totalResult?.count || 0;

        // 매장 목록 조회
        const stores = await db
          .select({
            id: schema.bizPlace.id,
            slug: schema.bizMeta.slug,
            name: schema.bizPlace.name,
            category: schema.bizPlace.category,
            address: schema.bizPlace.addrRoad || schema.bizPlace.addrJibun,
            sido: schema.bizPlace.sido,
            sigungu: schema.bizPlace.sigungu,
            dong: schema.bizPlace.dong,
            lastPublishedAt: schema.bizMeta.lastPublishedAt,
          })
          .from(schema.bizMeta)
          .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
          .where(
            and(
              eq(schema.bizPlace.category, category),
              isNotNull(schema.bizMeta.lastPublishedAt)
            )
          )
          .orderBy(schema.bizPlace.name)
          .limit(limit)
          .offset(offset)
          .all();

        return NextResponse.json({
          category,
          stores: stores.map((store) => ({
            ...store,
            lastPublishedAt: store.lastPublishedAt
              ? new Date((store.lastPublishedAt as unknown as number) * 1000).toISOString()
              : null,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (dbError) {
        logger.error('Failed to fetch stores by category', {
          category,
        }, dbError instanceof Error ? dbError : new Error(String(dbError)));
        throw dbError;
      }
    }

    // 모든 업종 통계 조회
    try {
      const categoryStats = await db
        .select({
          category: schema.bizPlace.category,
          count: count(),
        })
        .from(schema.bizMeta)
        .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
        .where(
          and(
            isNotNull(schema.bizPlace.category),
            isNotNull(schema.bizMeta.lastPublishedAt)
          )
        )
        .groupBy(schema.bizPlace.category)
        .orderBy(sql`count DESC`)
        .all();

      // 총 발행된 매장 수
      const totalResult = await db
        .select({ count: count() })
        .from(schema.bizMeta)
        .where(isNotNull(schema.bizMeta.lastPublishedAt))
        .get();

      const totalStores = totalResult?.count || 0;

      return NextResponse.json({
        categories: categoryStats.map((stat) => ({
          name: stat.category || '기타',
          count: stat.count,
          percentage: totalStores > 0
            ? ((stat.count / totalStores) * 100).toFixed(1)
            : '0',
        })),
        totalStores,
      });
    } catch (dbError) {
      logger.error('Failed to fetch category statistics', {}, dbError instanceof Error ? dbError : new Error(String(dbError)));
      throw dbError;
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to fetch categories', {}, errorObj);

    return NextResponse.json(
      {
        error: 'Failed to fetch categories',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

