# Cloudflare Workers 배포 가이드

## 🎯 전환 이유

OpenNext는 **Cloudflare Workers**에 최적화되어 있습니다. Pages 배포는 복잡하고 불안정합니다.

## ✅ Workers 배포 설정

### 1. wrangler.toml 설정

```toml
name = "localy-workers"
compatibility_date = "2025-01-15"
compatibility_flags = ["nodejs_compat"]

main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"
binding = "STATIC_ASSETS"
```

### 2. 배포 명령어

```bash
# 빌드
npm run build:cf

# Workers 배포
npx wrangler deploy
```

또는:

```bash
npm run build:cf && npx wrangler deploy
```

### 3. package.json 스크립트 추가 (선택)

```json
{
  "scripts": {
    "deploy:worker": "npm run build:cf && npx wrangler deploy"
  }
}
```

## 📋 배포 전 확인 사항

### 1. D1 Database 바인딩

`wrangler.toml`에 이미 설정되어 있습니다:
```toml
[[d1_databases]]
binding = "DB"
database_name = "localy-db"
database_id = "eabdfa2a-1676-49e3-b7a1-40155cc6a20c"
```

### 2. KV Namespaces 바인딩

`wrangler.toml`에 이미 설정되어 있습니다.

### 3. 환경 변수 설정

```bash
# OpenAI API Key
npx wrangler secret put OPENAI_API_KEY

# Public Data API Key
npx wrangler secret put PUBLIC_DATA_API_KEY

# Next.js Base URL
npx wrangler secret put NEXT_PUBLIC_BASE_URL
```

또는 `wrangler.toml`에 추가:
```toml
[vars]
NEXT_PUBLIC_BASE_URL = "https://your-worker.your-subdomain.workers.dev"
```

## 🚀 배포 단계

1. **빌드**:
   ```bash
   npm run build:cf
   ```

2. **Workers 배포**:
   ```bash
   npx wrangler deploy
   ```

3. **배포 확인**:
   - Workers Dashboard에서 확인
   - 배포된 URL로 접속 테스트

## 🔄 Pages vs Workers

### Pages 배포
- ❌ OpenNext와 호환성 문제
- ❌ Functions 빌드 실패
- ❌ 복잡한 설정

### Workers 배포
- ✅ OpenNext에 최적화
- ✅ 안정적 배포
- ✅ 모든 기능 사용 가능

## 📝 참고

- Workers 배포는 Pages와 다른 URL을 사용합니다
- 커스텀 도메인 연결 가능
- Pages Functions보다 더 많은 기능 지원

