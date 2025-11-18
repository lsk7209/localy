import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../../types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { count } from 'drizzle-orm';
import { logger } from '@/workers/utils/logger';

/**
 * 수집 상태 종합 조회 API
 * 
 * 초기 수집 및 증분 수집의 진행 상황과 데이터베이스 통계를 조회합니다.
 * 
 * @example
 * GET /api/fetch/status
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    if (!env?.DB || !env?.SETTINGS) {
      return NextResponse.json(
        { error: 'Database or Settings KV not available' },
        { status: 503 }
      );
    }
    
    const db = drizzle(env.DB, { schema });
    
    // 데이터베이스 통계 조회
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
    
    // 초기 수집 진행 상황
    const nextDongIndex = await env.SETTINGS.get('next_dong_index');
    const initialLastDong = await env.SETTINGS.get('initial_fetch_last_dong');
    const initialLastPage = await env.SETTINGS.get('initial_fetch_last_page');
    
    // 증분 수집 진행 상황
    const lastModDate = await env.SETTINGS.get('last_mod_date');
    const incrementalLastPage = await env.SETTINGS.get('incremental_fetch_last_page');
    
    // 환경 변수 확인
    const hasPublicDataApiKey = !!env.PUBLIC_DATA_API_KEY;
    const hasOpenAIApiKey = !!env.OPENAI_API_KEY;
    
    return NextResponse.json({
      status: 'ok',
      database: {
        rawStore: rawStoreCount?.count || 0,
        bizPlace: bizPlaceCount?.count || 0,
        bizMeta: bizMetaCount?.count || 0,
      },
      initialFetch: {
        nextDongIndex: nextDongIndex ? parseInt(nextDongIndex, 10) : 0,
        lastDong: initialLastDong || null,
        lastPage: initialLastPage ? parseInt(initialLastPage, 10) : null,
        isResuming: !!(initialLastDong || initialLastPage),
      },
      incrementalFetch: {
        lastModDate: lastModDate || null,
        lastPage: incrementalLastPage ? parseInt(incrementalLastPage, 10) : null,
        isResuming: !!incrementalLastPage,
      },
      environment: {
        hasPublicDataApiKey,
        hasOpenAIApiKey,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to get fetch status', {}, errorObj);
    
    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

