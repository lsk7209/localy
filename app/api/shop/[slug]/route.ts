import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cache } from '@/workers/utils/cache';
import { checkAPIRateLimit } from '@/workers/utils/rate-limit';
import { validateSlug } from '@/workers/utils/validation';
import { getCloudflareEnv } from '@/app/api/types';

/**
 * 상가 상세 정보 API
 * Cloudflare Pages Functions에서 env.DB를 통해 D1에 접근
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
  ) {
    try {
      const env = getCloudflareEnv();
      
      // Rate Limit 체크
      const rateLimitResult = await checkAPIRateLimit(env, request);
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
      
      if (!env?.DB) {
        // 개발 환경에서는 에러 반환
        return NextResponse.json(
          { error: 'Database not available in this environment' },
          { status: 503 }
        );
      }

      const db = drizzle(env.DB, { schema });
      const { slug } = await params;

      // Slug 검증
      if (!validateSlug(slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format' },
          { status: 400 }
        );
      }

      // 캐시 확인
      const cached = await cache.shopDetail.get(env, slug);
      if (cached) {
        return NextResponse.json(cached);
      }

      // slug로 상가 정보 조회
      const result = await db
      .select()
      .from(schema.bizMeta)
      .innerJoin(schema.bizPlace, eq(schema.bizMeta.bizId, schema.bizPlace.id))
      .where(eq(schema.bizMeta.slug, slug))
      .get();

    if (!result) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const { biz_meta: meta, biz_place: place } = result;

    // FAQ 파싱 (JSON 문자열일 수 있음)
    let faq: Array<{ question: string; answer: string }> = [];
    if (meta.aiFaq) {
      try {
        faq = JSON.parse(meta.aiFaq);
      } catch {
        // JSON이 아니면 텍스트로 처리
        faq = [];
      }
    }

    // 응답 데이터 생성
    const responseData = {
      id: place.id,
      slug: meta.slug,
      name: place.name,
      category: place.category,
      address: place.addrRoad || place.addrJibun,
      addrRoad: place.addrRoad,
      addrJibun: place.addrJibun,
      sido: place.sido,
      sigungu: place.sigungu,
      dong: place.dong,
      lat: place.lat,
      lng: place.lng,
      status: place.status,
      licenseDate: place.licenseDate,
      summary: meta.aiSummary,
      faq,
      lastPublishedAt: meta.lastPublishedAt,
    };

    // 캐시 저장
    await cache.shopDetail.set(env, slug, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    let errorSlug = 'unknown';
    try {
      const resolvedParams = await params;
      errorSlug = resolvedParams.slug;
    } catch {
      // params를 가져올 수 없는 경우 무시
    }
    
    console.error('Failed to fetch store:', {
      error: error instanceof Error ? error.message : String(error),
      slug: errorSlug,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

