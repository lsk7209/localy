import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../../types';
import { handleInitialFetch } from '@/workers/cron/initial-fetch';
import { logger } from '@/workers/utils/logger';

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
    
    if (!env?.DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }
    
    // ExecutionContext 모의 객체 생성 (Cloudflare Workers 환경)
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => {
        // Cloudflare Pages에서는 waitUntil이 없으므로 무시
        promise.catch((error) => {
          logger.error('waitUntil promise failed', {}, error instanceof Error ? error : new Error(String(error)));
        });
      },
      passThroughOnException: () => {
        // Cloudflare Pages에서는 passThroughOnException이 없으므로 무시
      },
    };
    
    // 초기 수집 실행
    logger.info('Manual initial fetch triggered');
    await handleInitialFetch(env, ctx as any);
    
    return NextResponse.json({
      success: true,
      message: 'Initial fetch started',
      timestamp: new Date().toISOString(),
    });
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
    
    // KV에서 진행 상황 읽기
    const nextDongIndex = await env.SETTINGS.get('next_dong_index');
    const lastDong = await env.SETTINGS.get('initial_fetch_last_dong');
    const lastPage = await env.SETTINGS.get('initial_fetch_last_page');
    
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

