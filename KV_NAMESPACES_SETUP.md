# KV Namespaces 설정 가이드

## 필요한 KV Namespaces

다음 KV Namespaces가 필요합니다:

1. **SETTINGS**: 설정 저장 (AI 활성화, 발행 속도 제한 등)
2. **CACHE**: API 응답 캐싱
3. **RATE_LIMIT**: API Rate Limiting
4. **FETCH_FAIL_QUEUE**: 수집 실패 큐
5. **DEAD_FAIL_QUEUE**: 최종 실패 큐
6. **SITEMAP**: Sitemap 데이터 저장

---

## 방법 1: Wrangler CLI로 생성 (권장)

### 1단계: Wrangler 로그인

```bash
npx wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하세요.

### 2단계: KV Namespace 생성

각 KV Namespace를 생성합니다:

```bash
# SETTINGS KV 생성
npx wrangler kv:namespace create SETTINGS

# CACHE KV 생성
npx wrangler kv:namespace create CACHE

# RATE_LIMIT KV 생성
npx wrangler kv:namespace create RATE_LIMIT

# FETCH_FAIL_QUEUE KV 생성
npx wrangler kv:namespace create FETCH_FAIL_QUEUE

# DEAD_FAIL_QUEUE KV 생성
npx wrangler kv:namespace create DEAD_FAIL_QUEUE

# SITEMAP KV 생성
npx wrangler kv:namespace create SITEMAP
```

각 명령어 실행 시 다음과 같은 출력이 나옵니다:

```
🌀  Creating namespace with title "SETTINGS"
✨  Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "SETTINGS", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

### 3단계: Preview Namespace 생성 (로컬 개발용)

로컬 개발을 위해 Preview Namespace도 생성합니다:

```bash
# SETTINGS Preview KV 생성
npx wrangler kv:namespace create SETTINGS --preview

# CACHE Preview KV 생성
npx wrangler kv:namespace create CACHE --preview

# RATE_LIMIT Preview KV 생성
npx wrangler kv:namespace create RATE_LIMIT --preview

# FETCH_FAIL_QUEUE Preview KV 생성
npx wrangler kv:namespace create FETCH_FAIL_QUEUE --preview

# DEAD_FAIL_QUEUE Preview KV 생성
npx wrangler kv:namespace create DEAD_FAIL_QUEUE --preview

# SITEMAP Preview KV 생성
npx wrangler kv:namespace create SITEMAP --preview
```

### 4단계: wrangler.toml에 ID 추가

생성된 ID를 `wrangler.toml`에 추가합니다:

```toml
[[kv_namespaces]]
binding = "SETTINGS"
id = "여기에_SETTINGS_ID_입력"
preview_id = "여기에_SETTINGS_PREVIEW_ID_입력"

[[kv_namespaces]]
binding = "CACHE"
id = "여기에_CACHE_ID_입력"
preview_id = "여기에_CACHE_PREVIEW_ID_입력"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "여기에_RATE_LIMIT_ID_입력"
preview_id = "여기에_RATE_LIMIT_PREVIEW_ID_입력"

[[kv_namespaces]]
binding = "FETCH_FAIL_QUEUE"
id = "여기에_FETCH_FAIL_QUEUE_ID_입력"
preview_id = "여기에_FETCH_FAIL_QUEUE_PREVIEW_ID_입력"

[[kv_namespaces]]
binding = "DEAD_FAIL_QUEUE"
id = "여기에_DEAD_FAIL_QUEUE_ID_입력"
preview_id = "여기에_DEAD_FAIL_QUEUE_PREVIEW_ID_입력"

[[kv_namespaces]]
binding = "SITEMAP"
id = "여기에_SITEMAP_ID_입력"
preview_id = "여기에_SITEMAP_PREVIEW_ID_입력"
```

---

## 방법 2: Cloudflare Dashboard에서 생성

### 1단계: Dashboard 접속

1. https://dash.cloudflare.com 접속
2. Workers & Pages → KV 메뉴 선택

### 2단계: Namespace 생성

1. "Create a namespace" 클릭
2. Namespace 이름 입력 (예: `SETTINGS`)
3. "Add" 클릭
4. 생성된 Namespace의 ID 복사

### 3단계: 반복

위 과정을 모든 KV Namespace에 대해 반복:
- SETTINGS
- CACHE
- RATE_LIMIT
- FETCH_FAIL_QUEUE
- DEAD_FAIL_QUEUE
- SITEMAP

### 4단계: wrangler.toml에 ID 추가

생성된 ID를 `wrangler.toml`에 추가합니다 (방법 1의 4단계 참조).

---

## Cloudflare Pages 바인딩 설정

Cloudflare Pages에서 KV를 사용하려면 Dashboard에서 바인딩을 설정해야 합니다.

### 설정 방법

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com
   - Pages → 프로젝트 선택

2. **Functions 바인딩 설정**
   - Settings → Functions → KV Namespace bindings
   - "Add binding" 클릭

3. **각 KV Namespace 바인딩 추가**

   **SETTINGS:**
   - Variable name: `SETTINGS`
   - KV namespace: `SETTINGS` 선택
   - "Save" 클릭

   **CACHE:**
   - Variable name: `CACHE`
   - KV namespace: `CACHE` 선택
   - "Save" 클릭

   **RATE_LIMIT:**
   - Variable name: `RATE_LIMIT`
   - KV namespace: `RATE_LIMIT` 선택
   - "Save" 클릭

   **FETCH_FAIL_QUEUE:**
   - Variable name: `FETCH_FAIL_QUEUE`
   - KV namespace: `FETCH_FAIL_QUEUE` 선택
   - "Save" 클릭

   **DEAD_FAIL_QUEUE:**
   - Variable name: `DEAD_FAIL_QUEUE`
   - KV namespace: `DEAD_FAIL_QUEUE` 선택
   - "Save" 클릭

   **SITEMAP:**
   - Variable name: `SITEMAP`
   - KV namespace: `SITEMAP` 선택
   - "Save" 클릭

4. **Production 및 Preview 환경 모두 설정**
   - Production 환경에 바인딩 추가
   - Preview 환경에도 동일하게 바인딩 추가

---

## 빠른 설정 스크립트

모든 KV Namespace를 한 번에 생성하려면 다음 스크립트를 사용할 수 있습니다:

```bash
#!/bin/bash

# KV Namespaces 생성
echo "Creating KV Namespaces..."

npx wrangler kv:namespace create SETTINGS
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create RATE_LIMIT
npx wrangler kv:namespace create FETCH_FAIL_QUEUE
npx wrangler kv:namespace create DEAD_FAIL_QUEUE
npx wrangler kv:namespace create SITEMAP

# Preview Namespaces 생성
echo "Creating Preview KV Namespaces..."

npx wrangler kv:namespace create SETTINGS --preview
npx wrangler kv:namespace create CACHE --preview
npx wrangler kv:namespace create RATE_LIMIT --preview
npx wrangler kv:namespace create FETCH_FAIL_QUEUE --preview
npx wrangler kv:namespace create DEAD_FAIL_QUEUE --preview
npx wrangler kv:namespace create SITEMAP --preview

echo "Done! Copy the IDs to wrangler.toml"
```

Windows PowerShell 버전:

```powershell
# KV Namespaces 생성
Write-Host "Creating KV Namespaces..."

npx wrangler kv:namespace create SETTINGS
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create RATE_LIMIT
npx wrangler kv:namespace create FETCH_FAIL_QUEUE
npx wrangler kv:namespace create DEAD_FAIL_QUEUE
npx wrangler kv:namespace create SITEMAP

# Preview Namespaces 생성
Write-Host "Creating Preview KV Namespaces..."

npx wrangler kv:namespace create SETTINGS --preview
npx wrangler kv:namespace create CACHE --preview
npx wrangler kv:namespace create RATE_LIMIT --preview
npx wrangler kv:namespace create FETCH_FAIL_QUEUE --preview
npx wrangler kv:namespace create DEAD_FAIL_QUEUE --preview
npx wrangler kv:namespace create SITEMAP --preview

Write-Host "Done! Copy the IDs to wrangler.toml"
```

---

## 확인 방법

### 1. 생성된 Namespace 확인

```bash
npx wrangler kv:namespace list
```

### 2. 로컬 개발 시 KV 사용

```bash
# 로컬 개발 서버 실행
npm run worker:dev
```

### 3. KV 값 확인

```bash
# SETTINGS KV에서 값 읽기
npx wrangler kv:key get "ai_enabled" --namespace-id=SETTINGS_ID

# SETTINGS KV에 값 쓰기
npx wrangler kv:key put "ai_enabled" "true" --namespace-id=SETTINGS_ID
```

---

## 주의사항

1. **Pages 배포**: Dashboard에서 바인딩 설정 필수
2. **Workers 배포**: `wrangler.toml` 설정 자동 사용
3. **Preview Namespace**: 로컬 개발 및 Preview 배포에 사용
4. **Production Namespace**: 프로덕션 배포에 사용
5. **바인딩 이름**: 코드에서 사용하는 이름과 정확히 일치해야 함

---

## 문제 해결

### Namespace를 찾을 수 없는 경우

1. Dashboard에서 Namespace가 생성되었는지 확인
2. `wrangler.toml`의 ID가 올바른지 확인
3. 바인딩 이름이 코드와 일치하는지 확인

### 바인딩이 작동하지 않는 경우

1. Dashboard에서 바인딩이 올바르게 설정되었는지 확인
2. 바인딩 이름이 대소문자까지 정확히 일치하는지 확인
3. Production 및 Preview 환경 모두에 바인딩 설정 확인

---

## 다음 단계

1. ✅ KV Namespaces 생성
2. ✅ `wrangler.toml`에 ID 추가
3. ✅ Cloudflare Pages Dashboard에서 바인딩 설정
4. ✅ 배포 후 테스트

---

**참고**: KV Namespace는 무료 플랜에서도 사용 가능하며, 월 100,000회 읽기/쓰기 작업이 포함됩니다.

