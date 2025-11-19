mport { NextRequest, NextResponse } from 'next/server';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

// Korean string constants (encoding issue prevention)
const PERIOD_ALL = String.fromCharCode(0xC804, 0xCCB4); // '전체'
const PERIOD_7_DAYS = String.fromCharCode(0xCD5C, 0xAD6C, 0x0020, 0x0037, 0xC77C); // '최근 7일'
const PERIOD_30_DAYS = String.fromCharCode(0xCD5C, 0xAD6C, 0x0020, 0x0033, 0x0030, 0xC77C); // '최근 30일'
const PERIOD_90_DAYS = String.fromCharCode(0xCD5C, 0xAD6C, 0x0020, 0x0039, 0x0030, 0xC77C); // '최근 90일'
const STATUS_SUCCESS = String.fromCharCode(0xC131, 0xACF5); // '성공'
const STATUS_FAIL = String.fromCharCode(0xC2E4, 0xD328); // '실패'
const TYPE_NORMALIZE = String.fromCharCode(0xC815, 0xADDC, 0xD654); // '정규화'
const TYPE_PUBLISH = String.fromCharCode(0xBC1C, 0xD589); // '발행'
const TYPE_FETCH = String.fromCharCode(0xC218, 0xC9D1); // '수집'
const TYPE_RETRY = String.fromCharCode(0xC7AC, 0xC2DC, 0xB3C4); // '재시도'

export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
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
    const jobType = searchParams.get('type') || PERIOD_ALL;
    const status = searchParams.get('status') || PERIOD_ALL;
    const period = searchParams.get('period') || PERIOD_7_DAYS;

    const now = Date.now();
    let startTime = 0;
    switch (period) {
      case PERIOD_7_DAYS:
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case PERIOD_30_DAYS:
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case PERIOD_90_DAYS:
        startTime = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case PERIOD_ALL:
        startTime = 0;
        break;
    }

    // KV에서 메트릭 목록 가져오기
    const settingsKV = env.SETTINGS;
    if (!settingsKV) {
      return NextResponse.json({ jobs: [] });
    }

    const list = await settingsKV.list({ prefix: 'metrics:' });
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
        const value = await settingsKV.get(key.name);
        if (!value) continue;

        const metric = JSON.parse(value);
        const metricTime = new Date(metric.timestamp).getTime();

        // 기간 필터링
        if (metricTime < startTime) continue;

        const typeMap: Record<string, string> = {
          'normalize': TYPE_NORMALIZE,
          'ai-generation': 'AI',
          'publish': TYPE_PUBLISH,
          'initial-fetch': TYPE_FETCH,
          'incremental-fetch': TYPE_FETCH,
          'retry': TYPE_RETRY,
        };

        const displayType = typeMap[metric.workerName] || metric.workerName;

        if (jobType !== PERIOD_ALL && displayType !== jobType) continue;

        if (status !== PERIOD_ALL) {
          if (status === STATUS_SUCCESS && !metric.success) continue;
          if (status === STATUS_FAIL && metric.success) continue;
        }

        jobs.push({
          id: key.name,
          time: new Date(metric.timestamp).toLocaleString('ko-KR'),
          type: displayType,
          count: metric.itemsProcessed || 0,
          status: metric.success ? 'success' : 'fail',
          message: metric.error || `${displayType} ${String.fromCharCode(0xC644, 0xB8CC)}`,
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

