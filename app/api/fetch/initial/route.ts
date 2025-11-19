import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../../types';
import { handleInitialFetch } from '@/workers/cron/initial-fetch';
import { logger } from '@/workers/utils/logger';
import type { Env } from '@/workers/types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { count } from 'drizzle-orm';

/**
 * 초기 수집 수동 트리거 API
 * 
 * 공공데이터 API에서 행정동별로 상가 데이터를 수집하여 raw_store 테이블에 저장합니다.
 * 
 * @example
 * POST /api/fetch/initial
 * Headers: { "Authorization": "Bearer YOUR_API_KEY" }
 */
export async function POST(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // API 키 검증 (선택사항)
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');
    const expectedKey = env.REVALIDATE_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!env?.DB || !env?.SETTINGS) {
      return NextResponse.json(
        { error: 'Database or Settings KV not available' },
        { status: 503 }
      );
    }
    
    // ExecutionContext 모의 객체 생성 (Cloudflare Workers 환경)
    // Pages에서는 실제 ExecutionContext가 없으므로 부분 구현
    const ctx: ExecutionContext = {
      waitUntil: (promise: Promise<unknown>) => {
        // Cloudflare Pages에서는 waitUntil이 없으므로 무시
        promise.catch((error) => {
          logger.error('waitUntil promise failed', {}, error instanceof Error ? error : new Error(String(error)));
        });
      },
      passThroughOnException: () => {
        // Cloudflare Pages에서는 passThroughOnException이 없으므로 무시
      },
    } as ExecutionContext;
    
    // 초기 수집 실행 전 데이터베이스 카운트 확인
    let beforeCountValue = 0;
    try {
      const db = drizzle(env.DB, { schema });
      const beforeCount = await db
        .select({ count: count() })
        .from(schema.rawStore)
        .get();
      beforeCountValue = beforeCount?.count || 0;
    } catch (dbError) {
      logger.warn('Failed to get before count, using 0', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
      beforeCountValue = 0;
    }
    
    // 초기 수집 실행
    // DB와 SETTINGS가 확인되었으므로 Env 타입으로 단언
    logger.info('Manual initial fetch triggered', {
      beforeCount: beforeCountValue,
    });
    
    try {
      // 수집 실행 전 로깅
      logger.info('Starting initial fetch', {
        beforeCount: beforeCountValue,
        timestamp: new Date().toISOString(),
      });
      
      await handleInitialFetch(env as Env, ctx);
      
      // 수집 후 데이터베이스 카운트 확인 (약간의 지연 후)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let afterCountValue = beforeCountValue;
      let insertedCount = 0;
      try {
        const db = drizzle(env.DB, { schema });
        const afterCount = await db
          .select({ count: count() })
          .from(schema.rawStore)
          .get();
        afterCountValue = afterCount?.count || 0;
        insertedCount = afterCountValue - beforeCountValue;
      } catch (dbError) {
        logger.warn('Failed to get after count', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
        // afterCountValue는 beforeCountValue 유지, insertedCount는 0
      }
      
      logger.info('Initial fetch completed', {
        beforeCount: beforeCountValue,
        afterCount: afterCountValue,
        insertedCount,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Initial fetch completed',
        data: {
          beforeCount: beforeCountValue,
          afterCount: afterCountValue,
          insertedCount,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError) {
      // 수집 실패 시에도 카운트 확인
      let afterCountValue = beforeCountValue;
      let insertedCount = 0;
      try {
        const db = drizzle(env.DB, { schema });
        const afterCount = await db
          .select({ count: count() })
          .from(schema.rawStore)
          .get();
        afterCountValue = afterCount?.count || 0;
        insertedCount = afterCountValue - beforeCountValue;
      } catch (dbError) {
        logger.warn('Failed to get after count after error', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
      
      logger.error('Initial fetch failed', {
        beforeCount: beforeCountValue,
        afterCount: afterCountValue,
        insertedCount,
      }, fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
      
      throw fetchError;
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to trigger initial fetch', {}, errorObj);
    
    return NextResponse.json(
      {
        error: 'Failed to trigger initial fetch',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

/**
 * 초기 수집 상태 확인
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    if (!env?.SETTINGS) {
      return NextResponse.json(
        { error: 'Settings KV not available' },
        { status: 503 }
      );
    }
    
    // KV에서 진행 상황 읽기 (타입 가드로 안전하게 처리)
    const settingsKV = env.SETTINGS;
    if (!settingsKV) {
      return NextResponse.json(
        { error: 'Settings KV not available' },
        { status: 503 }
      );
    }
    const nextDongIndex = await settingsKV.get('next_dong_index');
    const lastDong = await settingsKV.get('initial_fetch_last_dong');
    const lastPage = await settingsKV.get('initial_fetch_last_page');
    
    return NextResponse.json({
      status: 'ok',
      progress: {
        nextDongIndex: nextDongIndex ? parseInt(nextDongIndex, 10) : 0,
        lastDong: lastDong || null,
        lastPage: lastPage ? parseInt(lastPage, 10) : null,
        isResuming: !!(lastDong || lastPage),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to get initial fetch status', {}, errorObj);
    
    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

