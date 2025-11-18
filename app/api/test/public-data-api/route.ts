import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../../types';
import { fetchStoreListInDong } from '@/workers/utils/public-data-api';
import { logger } from '@/workers/utils/logger';

/**
 * 공공데이터 API 테스트 엔드포인트
 * 실제 API 응답 구조를 확인하기 위한 디버깅용
 */
export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareEnv();
    
    if (!env.PUBLIC_DATA_API_KEY) {
      return NextResponse.json(
        { error: 'PUBLIC_DATA_API_KEY not set' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dongCode = searchParams.get('dongCode') || '1168010100'; // 기본값: 서울 강남구 역삼동
    const pageNo = parseInt(searchParams.get('pageNo') || '1', 10);

    logger.info('Testing public data API', {
      dongCode,
      pageNo,
    });

    try {
      const stores = await fetchStoreListInDong(dongCode, env.PUBLIC_DATA_API_KEY, pageNo);
      
      return NextResponse.json({
        success: true,
        dongCode,
        pageNo,
        storesCount: stores.length,
        stores: stores.slice(0, 3), // 처음 3개만 반환 (디버깅용)
        firstStoreKeys: stores.length > 0 ? Object.keys(stores[0] as any) : [],
        firstStoreSample: stores.length > 0 ? stores[0] : null,
        message: stores.length > 0 
          ? `Successfully fetched ${stores.length} stores`
          : 'API returned empty array',
      });
    } catch (apiError) {
      const errorObj = apiError instanceof Error ? apiError : new Error(String(apiError));
      logger.error('API test failed', {
        dongCode,
        pageNo,
      }, errorObj);
      
      return NextResponse.json({
        success: false,
        error: errorObj.message,
        stack: errorObj.stack,
        dongCode,
        pageNo,
      }, { status: 500 });
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Test endpoint failed', {}, errorObj);
    
    return NextResponse.json(
      {
        error: 'Test endpoint failed',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

