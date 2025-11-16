import type { PublicDataStore } from '../types';
import { withTimeout } from './performance';
import { logger } from './logger';

/**
 * 공공데이터 API 설정
 */
const PUBLIC_DATA_API_BASE_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong';
const PUBLIC_DATA_API_INCREMENTAL_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2/storeListByDate';

/**
 * 공공데이터 API 응답 타입
 */
interface PublicDataApiResponse {
  response: {
    body: {
      items: PublicDataStore[];
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

/**
 * 행정동 목록 조회 (초기 수집용)
 * 
 * 실제 구현 시 공공데이터 API의 행정동 목록 API를 호출해야 함
 * 예: 소상공인시장진흥공단의 행정동 코드 목록 API
 * 
 * 현재는 하드코딩된 행정동 코드 목록을 사용 (실제 운영 시 API로 대체 필요)
 */
export async function getDongList(startIndex: number, count: number): Promise<string[]> {
  // TODO: 실제 행정동 목록 API 호출
  // 예시:
  // const response = await fetch(`${PUBLIC_DATA_API_BASE_URL}/dongList?serviceKey=${apiKey}&type=json`);
  // const data = await response.json();
  // return data.response.body.items.slice(startIndex, startIndex + count).map(item => item.dongCode);

  // 임시: 하드코딩된 행정동 코드 목록 (실제 운영 시 API로 대체 필요)
  // 전국 주요 행정동 코드 (10자리 코드: 시도(2) + 시군구(3) + 읍면동(5))
  // 실제 운영 시 공공데이터 API의 행정동 목록 API를 호출하여 동적으로 가져와야 함
  const dongCodes = [
    // 서울특별시 강남구
    '1168010100', '1168010200', '1168010300', '1168010400', '1168010500',
    '1168010600', '1168010700', '1168010800', '1168010900', '1168011000',
    '1168011100', '1168011200', '1168011300', '1168011400', '1168011500',
    // 부산광역시 중구
    '2623010100', '2623010200', '2623010300', '2623010400', '2623010500',
    // 대구광역시 중구
    '2723010100', '2723010200', '2723010300', '2723010400', '2723010500',
    // 인천광역시 중구
    '2823010100', '2823010200', '2823010300', '2823010400', '2823010500',
    // 광주광역시 동구
    '2923010100', '2923010200', '2923010300', '2923010400', '2923010500',
    // 대전광역시 동구
    '3023010100', '3023010200', '3023010300', '3023010400', '3023010500',
    // 울산광역시 중구
    '3123010100', '3123010200', '3123010300', '3123010400', '3123010500',
    // 경기도 수원시
    '4113010100', '4113010200', '4113010300', '4113010400', '4113010500',
    '4113110100', '4113110200', '4113110300', '4113110400', '4113110500',
    // 강원도 춘천시
    '4211010100', '4211010200', '4211010300', '4211010400', '4211010500',
    // 충청북도 청주시
    '4311010100', '4311010200', '4311010300', '4311010400', '4311010500',
    // 충청남도 천안시
    '4413010100', '4413010200', '4413010300', '4413010400', '4413010500',
    // 전라북도 전주시
    '4511010100', '4511010200', '4511010300', '4511010400', '4511010500',
    // 전라남도 목포시
    '4611010100', '4611010200', '4611010300', '4611010400', '4611010500',
    // 경상북도 포항시
    '4711010100', '4711010200', '4711010300', '4711010400', '4711010500',
    // 경상남도 창원시
    '4812010100', '4812010200', '4812010300', '4812010400', '4812010500',
    // 제주특별자치도 제주시
    '5011010100', '5011010200', '5011010300', '5011010400', '5011010500',
  ];

  // startIndex부터 count개만큼 반환
  const result = dongCodes.slice(startIndex, startIndex + count);
  
  if (result.length === 0) {
    logger.info('No more dong codes available', {
      startIndex,
      count,
    });
    return [];
  }

  logger.info('Returning dong codes', {
    count: result.length,
    startIndex,
  });
  return result;
}

/**
 * 특정 행정동의 상가 목록 조회
 */
export async function fetchStoreListInDong(
  dongCode: string,
  apiKey: string,
  pageNo = 1,
  numOfRows = 1000
): Promise<PublicDataStore[]> {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    key: dongCode, // 행정동 코드
    type: 'json',
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
  });

  const url = `${PUBLIC_DATA_API_BASE_URL}?${params.toString()}`;

  try {
    // 외부 API 호출에 타임아웃 설정 (20초)
    const response = await withTimeout(
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }),
      20000,
      `API timeout for dong ${dongCode}, page ${pageNo}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // JSON 파싱에도 타임아웃 설정 (5초)
    const data = await withTimeout(
      response.json() as Promise<PublicDataApiResponse>,
      5000,
      `JSON parsing timeout for dong ${dongCode}, page ${pageNo}`
    );

    if (!data.response?.body?.items) {
      logger.warn('Unexpected API response structure', {
        data,
      });
      return [];
    }

    return Array.isArray(data.response.body.items)
      ? data.response.body.items
      : [data.response.body.items];
  } catch (error) {
    logger.error('Failed to fetch store list in dong', {
      dongCode,
      pageNo,
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * 수정일 기준 상가 목록 조회 (증분 수집용)
 */
export async function fetchStoreListByDate(
  lastModDate: string,
  apiKey: string,
  pageNo = 1,
  numOfRows = 1000
): Promise<PublicDataStore[]> {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    key: lastModDate, // 수정일 (YYYYMMDD 형식)
    type: 'json',
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
  });

  const url = `${PUBLIC_DATA_API_INCREMENTAL_URL}?${params.toString()}`;

  try {
    // 외부 API 호출에 타임아웃 설정 (20초)
    const response = await withTimeout(
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }),
      20000,
      `API timeout for date ${lastModDate}, page ${pageNo}`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // JSON 파싱에도 타임아웃 설정 (5초)
    const data = await withTimeout(
      response.json() as Promise<PublicDataApiResponse>,
      5000,
      `JSON parsing timeout for date ${lastModDate}, page ${pageNo}`
    );

    if (!data.response?.body?.items) {
      logger.warn('Unexpected API response structure', {
        data,
      });
      return [];
    }

    return Array.isArray(data.response.body.items)
      ? data.response.body.items
      : [data.response.body.items];
  } catch (error) {
    logger.error('Failed to fetch store list by date', {
      lastModDate,
      pageNo,
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * 날짜를 YYYYMMDD 형식으로 변환
 */
export function formatDateForApi(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

