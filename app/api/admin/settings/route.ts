import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/workers/utils/kv';
import { checkAdminAPIRateLimit, createRateLimitResponse } from '@/workers/utils/rate-limit';
import { getCloudflareEnv } from '../../types';

/**
 * 관리자 Settings API
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

    // KV에서 설정 읽기
    const aiEnabled = await getSetting(env, 'ai_enabled');
    const publishRateLimit = await getSetting(env, 'publish_rate_limit');
    const nextDongIndex = await getSetting(env, 'next_dong_index');
    const lastModDate = await getSetting(env, 'last_mod_date');

    return NextResponse.json({
      aiEnabled: aiEnabled === 'true',
      publishRateLimit: publishRateLimit ? parseInt(publishRateLimit, 10) : 10,
      nextDongIndex: nextDongIndex ? parseInt(nextDongIndex, 10) : 0,
      lastModDate: lastModDate || '',
    });
  } catch (error) {
    console.error('Failed to fetch settings:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // 요청 본문 파싱
    let body: { aiEnabled?: boolean; publishRateLimit?: number };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { aiEnabled, publishRateLimit } = body;

    // 설정 저장
    if (typeof aiEnabled === 'boolean') {
      await setSetting(env, 'ai_enabled', String(aiEnabled));
    }

    if (typeof publishRateLimit === 'number') {
      await setSetting(env, 'publish_rate_limit', String(publishRateLimit));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

