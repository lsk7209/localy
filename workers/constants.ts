/**
 * 워커 설정 상수
 */

/**
 * 워커 배치 크기 설정
 * Cloudflare Workers 제한사항 고려:
 * - Free tier: CPU 10ms, 총 실행 시간 30초
 * - Paid tier: CPU 50ms, 총 실행 시간 30초
 */
export const WORKER_CONFIG = {
  /** 정규화 워커 배치 크기 (D1 배치 INSERT 제한 고려) */
  NORMALIZE_BATCH_SIZE: 100,
  
  /** AI 생성 워커 배치 크기 (병렬 처리 제한) */
  AI_GENERATION_BATCH_SIZE: 5,
  
  /** 발행 워커 배치 크기 */
  PUBLISH_BATCH_SIZE: 10,
  
  /** 재시도 최대 횟수 */
  RETRY_MAX_COUNT: 3,
  
  /** 기본 마지막 수정일 (시간) */
  DEFAULT_LAST_MOD_HOURS: 24,
  
  /** 초기 수집 시 처리할 동 개수 */
  INITIAL_FETCH_DONG_COUNT: 10,
  
  /** D1 배치 INSERT 최대 행 수 (Cloudflare D1 제한 고려) */
  D1_MAX_BATCH_INSERT: 500,
  
  /** 증분 수집 배치 크기 */
  INCREMENTAL_FETCH_BATCH_SIZE: 500,
  
  /** 병렬 처리 최대 수 (AI 생성 등) */
  MAX_PARALLEL_TASKS: 5,
} as const;

/**
 * API 설정
 */
export const API_CONFIG = {
  /** OpenAI 모델 */
  OPENAI_MODEL: 'gpt-4o-mini',
  
  /** AI 요약 최대 토큰 */
  AI_SUMMARY_MAX_TOKENS: 200,
  
  /** AI FAQ 최대 토큰 */
  AI_FAQ_MAX_TOKENS: 300,
  
  /** Revalidate API 엔드포인트 */
  REVALIDATE_ENDPOINT: '/api/revalidate',
} as const;

/**
 * 메시지 템플릿
 */
export const MESSAGES = {
  AI_SUMMARY_DEFAULT: '공공데이터 기반 상가 정보입니다.',
  AI_SYSTEM_SUMMARY: '당신은 지역 상가 정보를 요약하는 전문가입니다. 간결하고 정확한 정보를 제공하세요.',
  AI_SYSTEM_FAQ: '당신은 지역 상가 정보에 대한 FAQ를 생성하는 전문가입니다. 자주 묻는 질문 3개를 생성하세요.',
} as const;

