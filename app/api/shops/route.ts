import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { sql, eq, and, or, like, isNotNull, count, desc, asc } from 'drizzle-orm';
import { cache } from '@/workers/utils/cache';
import { checkAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import {
  validatePagination,
  validateSearchQuery,
  validateCategory,
  validateRegionName,
  sanitizeString,
} from '@/workers/utils/validation';
import { getCloudflareEnv } from '../types';
import { logger } from '@/workers/utils/logger';

/**
 * 상가 목록 API
 * 검색, 필터링, 페이지네이션 지원
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit 체크 (RATE_LIMIT KV가 없어도 동작하도록 try-catch)
    let rateLimitResult;
    try {
      rateLimitResult = await checkAPIRateLimit(env, request);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(rateLimitResult.limit),
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
              'X-RateLimit-Reset': String(rateLimitResult.reset),
              ...(rateLimitResult.retryAfter && {
                'Retry-After': String(rateLimitResult.retryAfter),
              }),
            },
          }
        );
      }
    } catch (rateLimitError) {
      // Rate limit check failed, continuing (e.g., in development)
      logger.warn('Rate limit check failed, continuing', {
        error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError),
      });
    }
    
    if (!env?.DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const db = drizzle(env.DB, { schema });
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 파싱 및 검증
    const rawSearch = searchParams.get('search') || '';
    const rawCategory = searchParams.get('category') || '';
    const rawRegion = searchParams.get('region') || '';
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const rawSortBy = searchParams.get('sortBy') || 'name';

    // 데이터 검증 및 정제
    const search = validateSearchQuery(rawSearch);
    const category = rawCategory ? sanitizeString(rawCategory) : '';
    const region = rawRegion ? sanitizeString(rawRegion) : '';
    const { page, limit } = validatePagination(rawPage, rawLimit);
    const sortBy = rawSortBy === 'latest' ? 'latest' : 'name'; // 허용된 값만 사용
    const offset = (page - 1) * limit;

    // 카테고리 및 지역명 검증
    if (category && !validateCategory(category)) {
      return NextResponse.json(
        { error: 'Invalid category format' },
        { status: 400 }
      );
    }

    if (region && !validateRegionName(region)) {
      return NextResponse.json(
        { error: 'Invalid region format' },
        { status: 400 }
      );
    }

    // WHERE 조건 구성
    const conditions = [];

    // 발행된 상가만 조회
    conditions.push(isNotNull(schema.bizMeta.lastPublishedAt));

    // 검색 조건
    if (search) {
      conditions.push(
        or(
          like(schema.bizPlace.name, `%${search}%`),
          like(schema.bizPlace.category, `%${search}%`),
          like(schema.bizPlace.addrRoad, `%${search}%`),
          like(schema.bizPlace.addrJibun, `%${search}%`)
        )!
      );
    }

    // 카테고리 필터
    if (category) {
      conditions.push(eq(schema.bizPlace.category, category));
    }

    // 지역 필터
    if (region) {
      conditions.push(
        or(
          eq(schema.bizPlace.dong, region),
          eq(schema.bizPlace.sigungu, region),
          eq(schema.bizPlace.sido, region)
        )!
      );
    }

    // 캐시 키 생성
    const cacheParams = { search, category, region, page, sortBy };
    
    // 캐시 확인
    const cached = await cache.shopList.get(env, cacheParams);
    if (cached) {
      return NextResponse.json(cached);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 정렬 조건
    let orderBy;
    switch (sortBy) {
      case 'latest':
        orderBy = desc(schema.bizMeta.lastPublishedAt);
        break;
      case 'name':
      default:
        orderBy = asc(schema.bizPlace.name);
        break;
    }

    // 총 개수 조회
    const totalResult = await db
      .select({ count: count() })
      .from(schema.bizMeta)
      .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
      .where(whereClause)
      .get();

    const total = totalResult?.count || 0;

    // 데이터 조회
    const results = await db
      .select({
        id: schema.bizPlace.id,
        slug: schema.bizMeta.slug,
        name: schema.bizPlace.name,
        category: schema.bizPlace.category,
        address: schema.bizPlace.addrRoad,
        sido: schema.bizPlace.sido,
        sigungu: schema.bizPlace.sigungu,
        dong: schema.bizPlace.dong,
        lastPublishedAt: schema.bizMeta.lastPublishedAt,
      })
      .from(schema.bizMeta)
      .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)
      .all();

    const responseData = {
      shops: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 캐시 저장
    await cache.shopList.set(env, cacheParams, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to fetch shops', {
      url: request.url,
      searchParams: Object.fromEntries(new URL(request.url).searchParams),
    }, errorObj);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? errorObj.message : 'An error occurred while fetching shops',
      },
      { status: 500 }
    );
  }
}

