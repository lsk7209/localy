# 배포 가이드

이 문서는 21_localy 프로젝트를 Cloudflare에 배포하는 방법을 설명합니다.

## 사전 요구사항

1. **Cloudflare 계정**
   - Cloudflare 계정이 필요합니다
   - Workers, D1, KV, Pages 서비스 사용 가능해야 합니다

2. **Wrangler CLI 설치**
   ```bash
   npm install -g wrangler
   ```

3. **Cloudflare 로그인**
   ```bash
   wrangler login
   ```

## 1. D1 데이터베이스 설정

### 데이터베이스 생성

```bash
# 프로덕션 데이터베이스 생성
wrangler d1 create localy-db

# 출력된 database_id를 wrangler.toml에 설정
```

### wrangler.toml 설정

```toml
[[d1_databases]]
binding = "DB"
database_name = "localy-db"
database_id = "YOUR_DATABASE_ID_HERE"  # 위에서 생성한 ID 입력
```

### 마이그레이션 실행

```bash
# 로컬 개발 환경
npm run db:migrate

# 프로덕션 환경
npm run db:migrate:prod
```

## 2. KV Namespaces 설정

### Namespace 생성

각 KV Namespace를 생성합니다:

```bash
# SETTINGS KV 생성
wrangler kv:namespace create SETTINGS
wrangler kv:namespace create SETTINGS --preview  # 로컬 개발용

# FETCH_FAIL_QUEUE KV 생성
wrangler kv:namespace create FETCH_FAIL_QUEUE
wrangler kv:namespace create FETCH_FAIL_QUEUE --preview

# DEAD_FAIL_QUEUE KV 생성
wrangler kv:namespace create DEAD_FAIL_QUEUE
wrangler kv:namespace create DEAD_FAIL_QUEUE --preview

# SITEMAP KV 생성
wrangler kv:namespace create SITEMAP
wrangler kv:namespace create SITEMAP --preview
```

### wrangler.toml 설정

각 KV Namespace의 ID를 `wrangler.toml`에 설정합니다:

```toml
[[kv_namespaces]]
binding = "SETTINGS"
id = "YOUR_SETTINGS_ID"
preview_id = "YOUR_PREVIEW_SETTINGS_ID"

[[kv_namespaces]]
binding = "FETCH_FAIL_QUEUE"
id = "YOUR_FETCH_FAIL_QUEUE_ID"
preview_id = "YOUR_PREVIEW_FETCH_FAIL_QUEUE_ID"

[[kv_namespaces]]
binding = "DEAD_FAIL_QUEUE"
id = "YOUR_DEAD_FAIL_QUEUE_ID"
preview_id = "YOUR_PREVIEW_DEAD_FAIL_QUEUE_ID"

[[kv_namespaces]]
binding = "SITEMAP"
id = "YOUR_SITEMAP_ID"
preview_id = "YOUR_PREVIEW_SITEMAP_ID"
```

## 3. Queue 설정

### Queue 생성

```bash
wrangler queues create fetch-queue
```

Queue는 `wrangler.toml`에 이미 설정되어 있습니다.

## 4. 환경 변수 설정

### Secrets 설정 (민감한 정보)

```bash
# OpenAI API 키
wrangler secret put OPENAI_API_KEY

# 공공데이터 API 키
wrangler secret put PUBLIC_DATA_API_KEY

# Next.js URL
wrangler secret put NEXTJS_URL

# Revalidate API 키
wrangler secret put REVALIDATE_API_KEY
```

각 명령어 실행 시 값을 입력하라는 프롬프트가 나타납니다.

## 5. Workers 배포

```bash
npm run worker:deploy
```

또는

```bash
wrangler deploy
```

## 6. Next.js 배포 (Cloudflare Pages)

### 방법 1: GitHub 연동 (권장)

1. GitHub에 저장소 푸시
2. Cloudflare Dashboard → Pages → Create a project
3. GitHub 저장소 선택
4. 빌드 설정:
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Root directory: `/` (프로젝트 루트)

### 방법 2: Wrangler CLI

```bash
npm run build
wrangler pages deploy .next
```

### 환경 변수 설정 (Pages)

Cloudflare Dashboard → Pages → Settings → Environment Variables에서 설정:

- `NEXT_PUBLIC_BASE_URL`: 배포된 사이트 URL (예: `https://your-site.pages.dev`)

## 7. Cron 트리거 확인

배포 후 Cloudflare Dashboard → Workers → Triggers에서 Cron 트리거가 올바르게 설정되었는지 확인합니다:

- `0 * * * *` - 초기 수집 (매 시간)
- `30 * * * *` - 증분 수집 (매 시간 30분)
- `*/10 * * * *` - 정규화 워커 (10분마다)
- `*/15 * * * *` - 재시도 워커 (15분마다)
- `*/20 * * * *` - AI 생성 워커 (20분마다)
- `0 */3 * * *` - 발행 워커 (3시간마다)

## 8. 초기 설정

### KV Settings 초기화

```bash
# 로컬에서 실행
wrangler kv:key put --binding=SETTINGS "next_dong_index" "0"
wrangler kv:key put --binding=SETTINGS "ai_enabled" "true"
wrangler kv:key put --binding=SETTINGS "publish_rate_limit" "10"
```

또는 관리자 페이지(`/admin/settings`)에서 설정할 수 있습니다.

## 9. 모니터링 및 디버깅

### 로그 확인

```bash
# 실시간 로그 확인
wrangler tail

# 특정 워커 로그만 확인
wrangler tail --format=pretty
```

### Cloudflare Dashboard

- Workers → Logs: 워커 실행 로그 확인
- Analytics: 성능 메트릭 확인
- KV → Data: KV 데이터 확인
- D1 → Data: 데이터베이스 데이터 확인

## 10. 트러블슈팅

### 문제: Workers 배포 실패

- `wrangler.toml`의 모든 ID 값이 올바르게 설정되었는지 확인
- `wrangler login`으로 로그인 상태 확인

### 문제: Cron 트리거가 실행되지 않음

- Cloudflare Dashboard에서 Cron 트리거가 활성화되어 있는지 확인
- Cron 표현식이 올바른지 확인

### 문제: 데이터베이스 연결 실패

- D1 데이터베이스가 생성되었는지 확인
- `database_id`가 올바르게 설정되었는지 확인
- 마이그레이션이 실행되었는지 확인

### 문제: KV 접근 실패

- KV Namespace가 생성되었는지 확인
- `id`와 `preview_id`가 올바르게 설정되었는지 확인

## 11. 프로덕션 체크리스트

배포 전 확인 사항:

- [ ] 모든 환경 변수가 설정되었는가?
- [ ] D1 데이터베이스가 생성되고 마이그레이션이 실행되었는가?
- [ ] 모든 KV Namespace가 생성되었는가?
- [ ] Queue가 생성되었는가?
- [ ] Cron 트리거가 올바르게 설정되었는가?
- [ ] Next.js 환경 변수가 설정되었는가?
- [ ] 초기 설정 값이 KV에 저장되었는가?
- [ ] Health check 엔드포인트가 작동하는가? (`/health`)

## 12. 롤백 방법

문제 발생 시 이전 버전으로 롤백:

```bash
# Workers 롤백
wrangler rollback

# Pages 롤백
Cloudflare Dashboard → Pages → Deployments → 이전 버전 선택 → Rollback
```

## 추가 리소스

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 문서](https://developers.cloudflare.com/d1/)
- [Cloudflare KV 문서](https://developers.cloudflare.com/kv/)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)

