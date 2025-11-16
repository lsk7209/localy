import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { checkRevalidateAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { validateSlug } from '@/workers/utils/validation';
import { getCloudflareEnv } from '../types';

/**
 * ISR on-demand revalidate API
 * Workers에서 발행 시 호출
 */
export async function POST(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit 체크 (인증 전에 체크)
    const rateLimitResult = await checkRevalidateAPIRateLimit(env, request);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }
    
    // API 키 검증
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.REVALIDATE_API_KEY || env?.REVALIDATE_API_KEY;

    if (!apiKey) {
      console.error('REVALIDATE_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await request.json();

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    // Slug 검증
    if (!validateSlug(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 }
      );
    }

    // 특정 경로 revalidate
    revalidatePath(`/shop/${slug}`);

    return NextResponse.json({ revalidated: true, slug });
  } catch (error) {
    console.error('Revalidation failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 }
    );
  }
}

