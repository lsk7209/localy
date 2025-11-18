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
    
    // DB가 없으면 기본값 반환
    let rawStoreCount = { count: 0 };
    let bizPlaceCount = { count: 0 };
    let bizMetaCount = { count: 0 };
    
    if (env?.DB) {
      try {
        const db = drizzle(env.DB, { schema });
        
        // 데이터베이스 통계 조회
        rawStoreCount = (await db
          .select({ count: count() })
          .from(schema.rawStore)
          .get()) || { count: 0 };
        
        bizPlaceCount = (await db
          .select({ count: count() })
          .from(schema.bizPlace)
          .get()) || { count: 0 };
        
        bizMetaCount = (await db
          .select({ count: count() })
          .from(schema.bizMeta)
          .get()) || { count: 0 };
      } catch (dbError) {
        console.error('Database query failed:', dbError);
        // DB 쿼리 실패 시 기본값 유지
      }
    }
    
    // 초기 수집 진행 상황 (SETTINGS가 없으면 기본값)
    let nextDongIndex: string | null = null;
    let initialLastDong: string | null = null;
    let initialLastPage: string | null = null;
    let lastModDate: string | null = null;
    let incrementalLastPage: string | null = null;
    
    if (env?.SETTINGS) {
      try {
        nextDongIndex = await env.SETTINGS.get('next_dong_index');
        initialLastDong = await env.SETTINGS.get('initial_fetch_last_dong');
        initialLastPage = await env.SETTINGS.get('initial_fetch_last_page');
        lastModDate = await env.SETTINGS.get('last_mod_date');
        incrementalLastPage = await env.SETTINGS.get('incremental_fetch_last_page');
      } catch (kvError) {
        console.error('KV query failed:', kvError);
        // KV 쿼리 실패 시 기본값 유지
      }
    }
    
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

