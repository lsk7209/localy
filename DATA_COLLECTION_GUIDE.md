# 공공데이터 수집 가이드

공공데이터 API를 통해 상가 정보를 수집하여 데이터베이스에 저장하는 방법을 안내합니다.

## 📋 개요

이 시스템은 두 가지 수집 방식을 제공합니다:

1. **초기 수집 (Initial Fetch)**: 행정동별로 전체 상가 데이터를 수집
2. **증분 수집 (Incremental Fetch)**: 수정일 기준으로 변경된 데이터만 수집

## 🚀 수집 시작하기

### 방법 1: API 엔드포인트로 수동 트리거 (권장)

#### 초기 수집 시작

```bash
# API 키가 설정된 경우
curl -X POST https://your-site.pages.dev/api/fetch/initial \
  -H "Authorization: Bearer YOUR_REVALIDATE_API_KEY"

# 또는 X-API-Key 헤더 사용
curl -X POST https://your-site.pages.dev/api/fetch/initial \
  -H "X-API-Key: YOUR_REVALIDATE_API_KEY"
```

#### 증분 수집 시작

```bash
curl -X POST https://your-site.pages.dev/api/fetch/incremental \
  -H "Authorization: Bearer YOUR_REVALIDATE_API_KEY"
```

#### 수집 상태 확인

```bash
# 전체 상태 확인
curl https://your-site.pages.dev/api/fetch/status

# 초기 수집 상태만 확인
curl https://your-site.pages.dev/api/fetch/initial

# 증분 수집 상태만 확인
curl https://your-site.pages.dev/api/fetch/incremental
```

### 방법 2: Cloudflare Workers Cron 트리거 (자동)

Workers가 배포되어 있고 Cron 트리거가 설정된 경우, 자동으로 실행됩니다:

- **초기 수집**: 매 시간 정각 (`0 * * * *`)
- **증분 수집**: 매 시간 30분 (`30 * * * *`)

## 📊 수집 상태 확인

### 상태 응답 예시

```json
{
  "status": "ok",
  "database": {
    "rawStore": 1250,
    "bizPlace": 1200,
    "bizMeta": 1150
  },
  "initialFetch": {
    "nextDongIndex": 20,
    "lastDong": null,
    "lastPage": null,
    "isResuming": false
  },
  "incrementalFetch": {
    "lastModDate": "2025-01-18T04:30:00.000Z",
    "lastPage": null,
    "isResuming": false
  },
  "environment": {
    "hasPublicDataApiKey": true,
    "hasOpenAIApiKey": true
  },
  "timestamp": "2025-01-18T05:00:00.000Z"
}
```

### 상태 필드 설명

#### database
- `rawStore`: 원본 데이터(raw JSON) 저장 개수
- `bizPlace`: 정규화된 상가 정보 개수
- `bizMeta`: 발행 메타데이터 개수

#### initialFetch
- `nextDongIndex`: 다음에 처리할 행정동 인덱스
- `lastDong`: 이전 실행에서 중단된 행정동 코드
- `lastPage`: 이전 실행에서 중단된 페이지 번호
- `isResuming`: 재개 중인지 여부

#### incrementalFetch
- `lastModDate`: 마지막으로 수집한 수정일
- `lastPage`: 이전 실행에서 중단된 페이지 번호
- `isResuming`: 재개 중인지 여부

## ⚙️ 사전 설정

### 1. 공공데이터 API 키 설정

Cloudflare Pages Dashboard에서 환경 변수 설정:

```bash
# 또는 Wrangler CLI 사용
wrangler secret put PUBLIC_DATA_API_KEY
```

### 2. API 인증 키 설정 (선택사항)

수동 트리거 시 인증을 사용하려면:

```bash
wrangler secret put REVALIDATE_API_KEY
```

인증 키가 설정되지 않은 경우, API는 인증 없이도 호출 가능합니다 (프로덕션에서는 권장하지 않음).

### 3. 데이터베이스 및 KV 바인딩 확인

Cloudflare Pages Dashboard → Settings → Functions에서 다음 바인딩이 설정되어 있는지 확인:

- **D1 Database**: `DB`
- **KV Namespaces**: 
  - `SETTINGS` (진행 상황 저장)
  - `FETCH_FAIL_QUEUE` (실패 큐)
  - `DEAD_FAIL_QUEUE` (최종 실패 큐)

## 🔄 수집 프로세스

### 초기 수집 프로세스

1. **행정동 목록 조회**: `getDongList()` 함수로 행정동 코드 목록 가져오기
2. **행정동별 수집**: 각 행정동의 상가 목록을 페이지별로 조회
3. **데이터 저장**: `raw_store` 테이블에 원본 JSON 저장
4. **진행 상황 저장**: KV에 다음 행정동 인덱스 및 진행 상황 저장
5. **재시도 메커니즘**: 실패 시 자동 재시도 (최대 3회)

### 증분 수집 프로세스

1. **마지막 수정일 조회**: KV에서 `last_mod_date` 읽기
2. **변경된 데이터 조회**: 수정일 기준으로 변경된 상가 목록 조회
3. **데이터 저장**: `raw_store` 테이블에 업데이트/추가
4. **마지막 수정일 갱신**: 수집 완료 후 현재 시간으로 업데이트

## 📈 모니터링

### 로그 확인

Cloudflare Dashboard → Workers → Logs에서 수집 로그를 확인할 수 있습니다.

### 주요 로그 메시지

- `Manual initial fetch triggered`: 수동 초기 수집 시작
- `Manual incremental fetch triggered`: 수동 증분 수집 시작
- `Initial fetch completed`: 초기 수집 완료
- `Incremental fetch completed`: 증분 수집 완료
- `Failed to fetch stores for dong`: 행정동별 수집 실패

### 성능 모니터링

- **실행 시간**: Cloudflare Workers는 최대 30초 실행 가능
- **배치 크기**: D1 배치 INSERT 제한 (500행) 고려
- **타임아웃**: API 호출 타임아웃 20초, JSON 파싱 타임아웃 5초

## 🛠 문제 해결

### 수집이 시작되지 않는 경우

1. **API 키 확인**
   ```bash
   curl https://your-site.pages.dev/api/fetch/status
   ```
   `hasPublicDataApiKey`가 `false`인 경우 API 키를 설정하세요.

2. **데이터베이스 연결 확인**
   - Cloudflare Pages Dashboard에서 D1 바인딩 확인
   - 데이터베이스 마이그레이션 실행 여부 확인

3. **KV 바인딩 확인**
   - `SETTINGS` KV Namespace가 바인딩되어 있는지 확인

### 수집이 중단되는 경우

1. **진행 상황 확인**
   ```bash
   curl https://your-site.pages.dev/api/fetch/status
   ```
   `isResuming: true`인 경우 이전 실행에서 중단된 것입니다.

2. **자동 재개**
   - 다음 Cron 실행 시 자동으로 재개됩니다
   - 또는 수동으로 다시 트리거할 수 있습니다

3. **실패 큐 확인**
   - Cloudflare Dashboard → KV에서 `FETCH_FAIL_QUEUE` 확인
   - 재시도 워커가 자동으로 처리합니다

### 데이터가 저장되지 않는 경우

1. **데이터베이스 확인**
   ```bash
   # 로컬에서 확인
   wrangler d1 execute DB --command "SELECT COUNT(*) FROM raw_store"
   ```

2. **에러 로그 확인**
   - Cloudflare Dashboard → Workers → Logs
   - `Failed to upsert store` 메시지 확인

3. **데이터 검증**
   - 공공데이터 API 응답 형식 확인
   - 좌표 검증 실패 여부 확인

## 📝 참고 사항

### 행정동 목록

현재는 하드코딩된 행정동 코드 목록을 사용합니다. 실제 운영 시 공공데이터 API의 행정동 목록 API를 호출하도록 `workers/utils/public-data-api.ts`의 `getDongList()` 함수를 수정해야 합니다.

### 배치 처리

- 초기 수집: 시간당 10개 행정동 처리
- 증분 수집: 페이지당 최대 1000개 상가 처리
- D1 배치 INSERT: 최대 500행씩 분할 처리

### 재시도 메커니즘

- 최대 재시도 횟수: 3회
- 지수 백오프: 1초, 2초, 4초 (최대 10초)
- 연속 에러 5회 이상 시 중단

## 🔗 관련 문서

- [배포 가이드](./DEPLOYMENT.md)
- [개발 가이드](./DEVELOPMENT.md)
- [Workers 배포 가이드](./WORKERS_DEPLOYMENT_GUIDE.md)

