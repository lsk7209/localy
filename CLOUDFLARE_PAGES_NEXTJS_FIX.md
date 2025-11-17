# Cloudflare Pages Next.js 배포 문제 해결

## 문제 상황

배포는 성공했지만 사이트가 표시되지 않음.

## 원인 분석

Cloudflare Pages에서 Next.js 15를 배포할 때:

1. **빌드 출력 디렉토리**: `.next`는 빌드 아티팩트 디렉토리이지만, Cloudflare Pages는 정적 파일을 제공해야 합니다.
2. **Next.js Functions**: API Routes는 Cloudflare Pages Functions로 자동 변환되지만, 정적 페이지는 `.next/static`과 `.next/server`에서 제공되어야 합니다.
3. **라우팅**: Cloudflare Pages는 Next.js의 라우팅을 자동으로 처리하지만, 올바른 빌드 출력이 필요합니다.

## 해결 방법

### 방법 1: Cloudflare Pages Dashboard 설정 확인 (권장)

Cloudflare Dashboard → Pages → Settings → Builds에서:

1. **Build command**: `npm run build`
2. **Build output directory**: `.next` (현재 설정)
3. **Root directory**: `/` (프로젝트 루트)
4. **Node.js version**: 20.x 이상

### 방법 2: wrangler.toml 설정 확인

현재 설정:
```toml
pages_build_output_dir = ".next"
```

이 설정은 올바릅니다. Next.js 15는 Cloudflare Pages에서 자동으로 처리됩니다.

### 방법 3: Functions 바인딩 확인

Cloudflare Dashboard → Pages → Settings → Functions에서:

1. **D1 Database 바인딩**: `DB` → `localy-db`
2. **KV Namespaces 바인딩**: 모든 KV가 바인딩되어 있는지 확인

### 방법 4: 환경 변수 확인

Cloudflare Dashboard → Pages → Settings → Environment Variables에서:

- `NEXT_PUBLIC_BASE_URL`: 배포된 사이트 URL 설정

## 디버깅 단계

### 1. 배포 로그 확인

Cloudflare Dashboard → Pages → Deployments → 최신 배포 → Logs에서:
- 빌드 성공 여부 확인
- Functions 배포 여부 확인
- 에러 메시지 확인

### 2. Functions 확인

Cloudflare Dashboard → Pages → Settings → Functions에서:
- Functions가 올바르게 배포되었는지 확인
- Functions 로그 확인

### 3. 브라우저 콘솔 확인

사이트 접속 시 브라우저 개발자 도구 → Console에서:
- JavaScript 에러 확인
- 네트워크 요청 실패 확인

## 가능한 문제점

### 1. Functions 바인딩 누락

API Routes가 작동하려면 D1, KV 등이 바인딩되어 있어야 합니다.

**해결**: Dashboard에서 모든 바인딩 확인

### 2. 환경 변수 누락

`NEXT_PUBLIC_BASE_URL`이 설정되지 않으면 일부 기능이 작동하지 않을 수 있습니다.

**해결**: Dashboard에서 환경 변수 설정

### 3. 빌드 출력 형식

Next.js 15는 Cloudflare Pages에서 자동으로 처리되지만, 일부 설정이 필요할 수 있습니다.

**해결**: `next.config.ts` 확인 및 필요시 수정

## 다음 단계

1. Cloudflare Dashboard에서 배포 로그 확인
2. Functions 바인딩 확인
3. 환경 변수 설정 확인
4. 브라우저 콘솔에서 에러 확인
5. 필요시 Cloudflare 지원팀에 문의

