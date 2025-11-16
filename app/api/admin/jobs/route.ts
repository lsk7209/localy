import { NextRequest, NextResponse } from 'next/server';
import { getJobMetrics, getAggregatedMetrics } from '@/workers/utils/monitoring';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * 관리자 Jobs 로그 API
 * KV에서 메트릭 데이터를 읽어서 반환
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    // Rate Limit 체크
    const rateLimitResult = await checkAdminAPIRateLimit(env, request);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }
    
    if (!env?.SETTINGS) {
      return NextResponse.json(
        { error: 'KV not available' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get('type') || '전체';
    const status = searchParams.get('status') || '전체';
    const period = searchParams.get('period') || '최근 7일';

    // 기간 계산
    const now = Date.now();
    let startTime = 0;
    switch (period) {
      case '최근 7일':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case '최근 30일':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '최근 90일':
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case '전체':
        startTime = 0;
        break;
    }

    // KV에서 메트릭 목록 가져오기
    const list = await env.SETTINGS.list({ prefix: 'metrics:' });
    const jobs: Array<{
      id: string;
      time: string;
      type: string;
      count: number;
      status: 'success' | 'fail';
      message: string;
    }> = [];

    for (const key of list.keys) {
      try {
        const value = await env.SETTINGS.get(key.name);
        if (!value) continue;

        const metric = JSON.parse(value);
        const metricTime = new Date(metric.timestamp).getTime();

        // 기간 필터링
        if (metricTime < startTime) continue;

        // 작업 타입 매핑
        const typeMap: Record<string, string> = {
          'normalize': '정규화',
          'ai-generation': 'AI',
          'publish': '발행',
          'initial-fetch': '수집',
          'incremental-fetch': '수집',
          'retry': '재시도',
        };

        const displayType = typeMap[metric.workerName] || metric.workerName;

        // 타입 필터링
        if (jobType !== '전체' && displayType !== jobType) continue;

        // 상태 필터링
        if (status !== '전체') {
          if (status === '성공' && !metric.success) continue;
          if (status === '실패' && metric.success) continue;
        }

        jobs.push({
          id: key.name,
          time: new Date(metric.timestamp).toLocaleString('ko-KR'),
          type: displayType,
          count: metric.itemsProcessed || 0,
          status: metric.success ? 'success' : 'fail',
          message: metric.error || `${displayType} 완료`,
        });
      } catch (e) {
        console.error(`Failed to parse metric: ${key.name}`, e);
      }
    }

    // 시간순 정렬 (최신순)
    jobs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // 최대 100개만 반환
    return NextResponse.json({ jobs: jobs.slice(0, 100) });
  } catch (error) {
    console.error('Failed to fetch jobs:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

