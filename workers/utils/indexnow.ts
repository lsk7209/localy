import { withTimeout } from './performance';
import { logger } from './logger';

/**
 * IndexNow API 설정
 * IndexNow는 검색 엔진에 URL 변경을 즉시 알리는 프로토콜
 */
const INDEXNOW_API_ENDPOINTS = [
  'https://api.indexnow.org/IndexNow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
];

/**
 * IndexNow API 호출 타임아웃 (초)
 */
const INDEXNOW_TIMEOUT_MS = 10000; // 10초

/**
 * IndexNow 요청 타입
 */
interface IndexNowRequest {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
}

/**
 * IndexNow ping 전송
 * 발행된 상가 URL을 검색 엔진에 즉시 알림
 */
export async function pingIndexNow(
  urls: string[],
  host: string,
  apiKey?: string
): Promise<void> {
  if (urls.length === 0) {
    return;
  }

  // API 키가 없으면 기본 키 사용 (도메인 기반)
  const key = apiKey || host.replace(/^https?:\/\//, '').split('/')[0];

  const requestBody: IndexNowRequest = {
    host,
    key,
    urlList: urls,
  };

  // 여러 IndexNow 엔드포인트에 병렬로 전송 (타임아웃 설정)
  const promises = INDEXNOW_API_ENDPOINTS.map(async (endpoint) => {
    try {
      const response = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
        INDEXNOW_TIMEOUT_MS,
        `IndexNow ping timeout for ${endpoint}`
      );

      if (!response.ok) {
        throw new Error(`IndexNow ping failed: ${response.status} ${response.statusText}`);
      }

      logger.info('IndexNow ping successful', {
        endpoint,
        urlCount: urls.length,
      });
      return { success: true, endpoint };
    } catch (error) {
      logger.error('IndexNow ping failed', {
        endpoint,
        urlCount: urls.length,
      }, error instanceof Error ? error : new Error(String(error)));
      return { success: false, endpoint, error };
    }
  });

  const results = await Promise.allSettled(promises);
  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;

  logger.info('IndexNow ping completed', {
    successful,
    total: INDEXNOW_API_ENDPOINTS.length,
  });
}

