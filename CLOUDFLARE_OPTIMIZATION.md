# Cloudflare 환경 최적화 가이드

## 개요

이 문서는 Cloudflare Workers, D1 Database, KV, Cron 환경에 최적화된 코드 개선 사항을 설명합니다.

## 주요 최적화 사항

### 1. CPU 시간 제한 모니터링 및 타임아웃 처리

**문제점**: Cloudflare Workers는 CPU 시간 제한이 있습니다.
- Free tier: CPU 10ms, 총 실행 시간 30초
- Paid tier: CPU 50ms, 총 실행 시간 30초

**해결책**:
- `CPUTimer` 클래스를 추가하여 실행 시간 추적
- 체크포인트를 통한 성능 모니터링
- 경고 임계값 설정 (CPU 시간의 80%, 총 실행 시간의 83%)

**파일**: `workers/utils/performance.ts`

**추가 개선**:
- 외부 API 호출에 타임아웃 설정 (25초)
- 재시도 워커에 타임아웃 적용
- Revalidation API 호출에 타임아웃 설정 (10초)

### 2. D1 데이터베이스 배치 INSERT 최적화

**문제점**: D1은 한 번에 너무 많은 행을 INSERT하면 타임아웃될 수 있습니다.

**해결책**:
- 배치 INSERT 크기를 500행으로 제한 (`D1_BATCH_LIMITS.MAX_INSERT_ROWS`)
- 큰 배치를 청크로 분할하여 처리
- 배치 INSERT 실패 시 개별 INSERT로 폴백

**적용 파일**:
- `workers/cron/incremental-fetch.ts`
- `workers/cron/initial-fetch.ts`
- `workers/cron/normalize.ts`

### 3. ExecutionContext.waitUntil() 활용

**문제점**: Sitemap 갱신, IndexNow ping 등은 CPU 시간에 포함되지만 필수적이지 않습니다.

**해결책**:
- `scheduleBackgroundTask()` 함수를 사용하여 백그라운드 작업 처리
- `ExecutionContext.waitUntil()`을 통해 CPU 시간에 포함되지 않도록 함

**적용 파일**: `workers/cron/publish.ts`

### 4. KV 배치 처리 최적화

**문제점**: KV에서 개별 `get`/`delete` 호출은 성능 저하를 유발합니다.

**해결책**:
- `getFailQueueMessages()`: Promise.all로 병렬 읽기
- `deleteCachePattern()`: 배치 삭제로 병렬 처리
- `getSettingsBatch()`: 여러 설정 값 일괄 읽기

**적용 파일**:
- `workers/utils/kv.ts`
- `workers/utils/cache.ts`

### 5. 재시도 워커 최적화

**문제점**: 순차 처리로 인한 실행 시간 증가

**해결책**:
- 영구 실패 큐 이동을 병렬 처리
- 재시도 작업을 배치 처리 (최대 5개 동시)
- 타임아웃 설정으로 무한 대기 방지

**적용 파일**: `workers/cron/retry.ts`

### 6. 병렬 처리 제한

**문제점**: AI 생성 워커에서 무제한 병렬 처리는 CPU 시간 초과를 유발할 수 있습니다.

**해결책**:
- `processBatch()` 함수를 사용하여 병렬 처리 제한
- 기본 병렬 처리 수: 5개 (`WORKER_CONFIG.MAX_PARALLEL_TASKS`)
- 배치 간 100ms 대기로 CPU 부하 분산

**적용 파일**: `workers/cron/ai-generation.ts`

### 7. 성능 모니터링 및 경고

**추가 기능**:
- 각 워커에서 `CPUTimer`를 사용하여 실행 시간 추적
- `logPerformanceWarning()`을 통해 임계값 초과 시 경고 로깅
- 체크포인트를 통한 세부 성능 분석

**적용 파일**:
- 모든 cron 워커 파일

## 설정 상수

### WORKER_CONFIG

```typescript
{
  NORMALIZE_BATCH_SIZE: 100,        // 정규화 배치 크기
  AI_GENERATION_BATCH_SIZE: 5,      // AI 생성 배치 크기
  PUBLISH_BATCH_SIZE: 10,           // 발행 배치 크기
  D1_MAX_BATCH_INSERT: 500,         // D1 배치 INSERT 최대 행 수
  INCREMENTAL_FETCH_BATCH_SIZE: 500, // 증분 수집 배치 크기
  MAX_PARALLEL_TASKS: 5,            // 병렬 처리 최대 수
}
```

### D1_BATCH_LIMITS

```typescript
{
  MAX_INSERT_ROWS: 500,    // 한 번에 최대 500행 INSERT
  MAX_UPDATE_ROWS: 1000,   // 한 번에 최대 1000행 UPDATE
  MAX_SELECT_ROWS: 10000,  // 한 번에 최대 10000행 조회
}
```

### PERFORMANCE_THRESHOLDS

```typescript
{
  WARNING_CPU_MS: 8,           // CPU 시간 경고 (Free tier의 80%)
  WARNING_TOTAL_MS: 25000,      // 총 실행 시간 경고 (30초의 83%)
  CRITICAL_CPU_MS: 9,           // CPU 시간 위험 (Free tier의 90%)
  CRITICAL_TOTAL_MS: 28000,     // 총 실행 시간 위험 (30초의 93%)
}
```

## 모니터링

### 성능 로그

각 워커 실행 시 다음 정보가 로깅됩니다:
- 시작 시간
- 체크포인트별 경과 시간
- 총 실행 시간
- 경고/위험 임계값 초과 여부

### 예시 로그

```
[PERFORMANCE WARNING] incremental-fetch approaching limit: {
  worker: 'incremental-fetch',
  totalTimeMs: 26000,
  threshold: 25000,
  checkpoints: {
    'start': 0,
    'page-1-start': 5000,
    'page-1-prepared': 8000,
    'page-1-inserted': 20000
  },
  pageNo: 1,
  storesProcessed: 1000
}
```

## 권장 사항

### 1. 배치 크기 조정

워커 실행 시간이 임계값에 근접하면 다음을 조정하세요:
- `WORKER_CONFIG.NORMALIZE_BATCH_SIZE` 감소
- `WORKER_CONFIG.AI_GENERATION_BATCH_SIZE` 감소
- `WORKER_CONFIG.MAX_PARALLEL_TASKS` 감소

### 2. D1 쿼리 최적화

- 인덱스를 활용한 쿼리 최적화
- 불필요한 JOIN 제거
- SELECT 컬럼 최소화

### 3. KV 최적화

- 배치 읽기/쓰기 활용
- TTL 적절히 설정
- 불필요한 KV 접근 최소화

### 4. 에러 처리

- 배치 작업 실패 시 개별 처리로 폴백
- 재시도 로직 구현
- 실패 큐 활용

## 추가 개선 사항

### 향후 개선 가능 사항

1. **스트리밍 처리**: 큰 데이터셋을 스트리밍으로 처리
2. **캐싱 전략**: 자주 조회되는 데이터 캐싱
3. **지연 로딩**: 필요할 때만 데이터 로드
4. **압축**: 큰 데이터 압축 저장

## 참고 자료

- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 Database Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [KV Storage Limits](https://developers.cloudflare.com/kv/platform/limits/)

