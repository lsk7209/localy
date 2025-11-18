import type { PublicDataStore } from '../types';
import { withTimeout } from './performance';
import { logger } from './logger';

/**
 * 공공데이터 API 설정
 * 
 * 레거시 API (현재 기본 사용)
 */
const LEGACY_API_BASE_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong';
const LEGACY_API_INCREMENTAL_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2/storeListByDate';

/**
 * 새로운 Open API (api.odcloud.kr)
 * 
 * Swagger 문서: https://infuser.odcloud.kr/oas/docs?namespace=15083033/v1
 * 엔드포인트: /15083033/v1/uddi:c7049f5a-d95e-4143-be96-b4d3c16130ee
 * 데이터명: 소상공인시장진흥공단_상가(상권)정보_20171120
 */
const OPEN_API_BASE_URL = 'https://api.odcloud.kr/api/15083033/v1/uddi:c7049f5a-d95e-4143-be96-b4d3c16130ee';

/**
 * API 버전 선택 (환경 변수로 제어 가능)
 * - 'legacy': 레거시 API 사용 (기본값)
 * - 'open': 새로운 Open API 사용
 */
function getApiVersion(): 'legacy' | 'open' {
  // 환경 변수로 API 버전 선택 가능 (기본값: legacy)
  // process.env.PUBLIC_DATA_API_VERSION이 'open'이면 새로운 API 사용
  if (typeof process !== 'undefined' && process.env?.PUBLIC_DATA_API_VERSION === 'open') {
    return 'open';
  }
  return 'legacy';
}

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
 * 
 * 레거시 API와 새로운 Open API를 모두 지원합니다.
 * 환경 변수 PUBLIC_DATA_API_VERSION으로 선택 가능합니다.
 */
export async function fetchStoreListInDong(
  dongCode: string,
  apiKey: string,
  pageNo = 1,
  numOfRows = 1000
): Promise<PublicDataStore[]> {
  const apiVersion = getApiVersion();
  
  if (apiVersion === 'open') {
    // 새로운 Open API 사용
    return fetchStoreListInDongOpenApi(dongCode, apiKey, pageNo, numOfRows);
  } else {
    // 레거시 API 사용 (기본)
    return fetchStoreListInDongLegacy(dongCode, apiKey, pageNo, numOfRows);
  }
}

/**
 * 레거시 API로 행정동별 상가 목록 조회
 */
async function fetchStoreListInDongLegacy(
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

  const url = `${LEGACY_API_BASE_URL}?${params.toString()}`;

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

    // API 응답 구조 확인 및 상세 로깅
    logger.info('API response received', {
      dongCode,
      pageNo,
      hasResponse: !!data.response,
      hasBody: !!data.response?.body,
      hasItems: !!data.response?.body?.items,
      totalCount: data.response?.body?.totalCount,
      numOfRows: data.response?.body?.numOfRows,
    });

    if (!data.response) {
      logger.error('API response missing response field', {
        dongCode,
        pageNo,
        responseStatus: response.status,
        responseBody: JSON.stringify(data).substring(0, 1000), // 처음 1000자만 로깅
      });
      return [];
    }

    if (!data.response.body) {
      logger.error('API response missing body field', {
        dongCode,
        pageNo,
        response: JSON.stringify(data.response).substring(0, 1000),
      });
      return [];
    }

    // items가 없거나 빈 배열인 경우 로깅
    // items가 null이거나 undefined인 경우 처리
    if (data.response.body.items === null || data.response.body.items === undefined) {
      logger.warn('API response missing items field', {
        dongCode,
        pageNo,
        body: JSON.stringify(data.response.body).substring(0, 1000),
        totalCount: data.response.body.totalCount,
        numOfRows: data.response.body.numOfRows,
      });
      return [];
    }
    
    // items가 빈 문자열인 경우 처리
    if (typeof data.response.body.items === 'string' && data.response.body.items.trim() === '') {
      logger.warn('API response items is empty string', {
        dongCode,
        pageNo,
        totalCount: data.response.body.totalCount,
        numOfRows: data.response.body.numOfRows,
      });
      return [];
    }

    const items = Array.isArray(data.response.body.items)
      ? data.response.body.items
      : [data.response.body.items];

    // API 응답 로깅
    if (items.length > 0) {
      // 첫 번째 store의 구조 확인
      const firstStore = items[0] as any;
      const firstStoreKeys = Object.keys(firstStore || {});
      
      logger.info('API returned stores', {
        dongCode,
        pageNo,
        itemsCount: items.length,
        totalCount: data.response.body.totalCount,
        numOfRows: data.response.body.numOfRows,
        firstStoreKeys: firstStoreKeys.slice(0, 10), // 처음 10개 키만
        firstStoreSample: JSON.stringify(firstStore).substring(0, 300), // 처음 300자만
        hasSourceId: !!(firstStore?.source_id || firstStore?.bizesId || firstStore?.bizId || firstStore?.id),
      });
    } else {
      logger.info('API returned empty items array', {
        dongCode,
        pageNo,
        totalCount: data.response.body.totalCount,
        numOfRows: data.response.body.numOfRows,
        possibleReasons: [
          'No stores in this dong',
          'API key may be invalid',
          'API endpoint may have changed',
        ],
      });
    }

    return items;
  } catch (error) {
    logger.error('Failed to fetch store list in dong', {
      dongCode,
      pageNo,
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * 새로운 Open API로 행정동별 상가 목록 조회
 * 
 * api.odcloud.kr Open API 구조:
 * - Base URL: api.odcloud.kr/api
 * - 엔드포인트: /15083033/v1/uddi:c7049f5a-d95e-4143-be96-b4d3c16130ee
 * - 파라미터: serviceKey, page, perPage, cond[행정동코드::EQ] 등
 * 
 * 참고: 실제 파라미터 구조는 Swagger 문서를 확인해야 하지만,
 * 일반적인 odcloud.kr API 구조를 따릅니다.
 */
async function fetchStoreListInDongOpenApi(
  dongCode: string,
  apiKey: string,
  pageNo = 1,
  numOfRows = 1000
): Promise<PublicDataStore[]> {
  // odcloud.kr Open API는 일반적으로 다음과 같은 파라미터를 사용합니다:
  // - serviceKey: 인증키
  // - page: 페이지 번호 (1부터 시작)
  // - perPage: 페이지당 항목 수
  // - cond[필드명::EQ]: 필터 조건 (행정동 코드 필터링)
  
  // 행정동 코드 필터링 방법은 Swagger 문서를 확인해야 하지만,
  // 일반적으로 cond 파라미터를 사용합니다.
  // 예: cond[행정동코드::EQ]=1168010100
  
  // 먼저 기본 파라미터로 시도 (행정동 코드 필터 없이)
  const params = new URLSearchParams({
    serviceKey: apiKey,
    page: String(pageNo),
    perPage: String(numOfRows),
  });
  
  // 행정동 코드 필터 추가 시도 (일반적인 odcloud.kr 필터 형식)
  // 실제 필드명은 Swagger 문서를 확인해야 합니다.
  // 가능한 필드명: '행정동코드', 'admCd', 'dongCode', '시군구코드' 등
  const possibleDongFields = ['행정동코드', 'admCd', 'dongCode', '시군구코드', '시도시군구코드'];
  
  // 첫 번째 가능한 필드명으로 필터 추가 시도
  // 실제로는 Swagger 문서를 확인하여 정확한 필드명을 사용해야 합니다.
  // 일단 주석 처리하고 기본 파라미터만 사용
  // params.append(`cond[${possibleDongFields[0]}::EQ]`, dongCode);

  const url = `${OPEN_API_BASE_URL}?${params.toString()}`;
  
  logger.info('Using new Open API', {
    url: url.replace(apiKey, '***'),
    dongCode,
    pageNo,
    numOfRows,
    note: 'Filtering by dong code may require Swagger documentation confirmation',
  });

  try {
    const response = await withTimeout(
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }),
      20000,
      `Open API timeout for dong ${dongCode}, page ${pageNo}`
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      logger.error('Open API request failed', {
        dongCode,
        pageNo,
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
      });
      throw new Error(`Open API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await withTimeout(
      response.json() as Promise<any>,
      5000,
      `Open API JSON parsing timeout for dong ${dongCode}, page ${pageNo}`
    );

    // Open API 응답 구조는 일반적으로 다음과 같습니다:
    // { data: [...], currentCount: number, matchCount: number, page: number, perPage: number, totalCount: number }
    // 또는 { response: { body: { items: [...] } } }
    
    logger.info('Open API response received', {
      dongCode,
      pageNo,
      responseKeys: Object.keys(data),
      hasData: !!data.data,
      hasResponse: !!data.response,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      responseSample: JSON.stringify(data).substring(0, 1000),
    });

    // 응답 구조가 다를 수 있으므로 유연하게 처리
    let items: any[] = [];
    
    // odcloud.kr 일반 구조: { data: [...] }
    if (data.data) {
      items = Array.isArray(data.data) ? data.data : [data.data];
    }
    // 레거시 구조: { response: { body: { items: [...] } } }
    else if (data.response?.body?.items) {
      items = Array.isArray(data.response.body.items)
        ? data.response.body.items
        : [data.response.body.items];
    }
    // 직접 배열
    else if (Array.isArray(data)) {
      items = data;
    }
    // items 필드
    else if (data.items) {
      items = Array.isArray(data.items) ? data.items : [data.items];
    }

    // 행정동 코드로 필터링 (API에서 필터링되지 않은 경우)
    if (items.length > 0 && dongCode) {
      // 행정동 코드 필드명 확인 (다양한 필드명 시도)
      const dongFieldNames = ['행정동코드', 'admCd', 'dongCode', '시군구코드', '시도시군구코드', 'bizesId', 'bizId'];
      const firstItem = items[0] as any;
      
      // 행정동 코드 필드 찾기
      let dongField: string | null = null;
      for (const field of dongFieldNames) {
        if (firstItem[field] !== undefined) {
          dongField = field;
          break;
        }
      }
      
      // 행정동 코드로 필터링
      if (dongField) {
        const originalCount = items.length;
        items = items.filter((item: any) => {
          const itemDongCode = String(item[dongField] || '');
          return itemDongCode.startsWith(dongCode) || itemDongCode === dongCode;
        });
        
        if (originalCount !== items.length) {
          logger.info('Filtered items by dong code', {
            dongCode,
            dongField,
            originalCount,
            filteredCount: items.length,
          });
        }
      } else {
        logger.warn('Could not find dong code field in Open API response', {
          dongCode,
          firstItemKeys: Object.keys(firstItem),
          note: 'Items may not be filtered by dong code',
        });
      }
    }

    logger.info('Open API returned stores', {
      dongCode,
      pageNo,
      itemsCount: items.length,
      firstStoreKeys: items.length > 0 ? Object.keys(items[0] || {}) : [],
      hasSourceId: items.length > 0 ? !!(items[0]?.source_id || items[0]?.bizesId || items[0]?.bizId || items[0]?.id) : false,
    });

    return items;
  } catch (error) {
    logger.error('Failed to fetch store list from Open API', {
      dongCode,
      pageNo,
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * 수정일 기준 상가 목록 조회 (증분 수집용)
 * 
 * 레거시 API와 새로운 Open API를 모두 지원합니다.
 */
export async function fetchStoreListByDate(
  lastModDate: string,
  apiKey: string,
  pageNo = 1,
  numOfRows = 1000
): Promise<PublicDataStore[]> {
  const apiVersion = getApiVersion();
  
  if (apiVersion === 'open') {
    // 새로운 Open API 사용 (Swagger 문서에서 날짜 필터링 방법 확인 필요)
    logger.warn('Open API date filtering not yet implemented, using legacy API');
    // TODO: Open API의 날짜 필터링 방법 확인 후 구현
  }
  
  // 레거시 API 사용 (기본)
  const params = new URLSearchParams({
    serviceKey: apiKey,
    key: lastModDate, // 수정일 (YYYYMMDD 형식)
    type: 'json',
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
  });

  const url = `${LEGACY_API_INCREMENTAL_URL}?${params.toString()}`;

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

