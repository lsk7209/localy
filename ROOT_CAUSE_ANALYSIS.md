# 배포 문제 근본 원인 분석

## 🔍 발견된 문제점

### 문제 1: Next.js 15 SSR 배포 방식 불일치 ⚠️

**현재 설정**:
- Build command: `npm run build`
- Build output directory: `.next`
- Next.js 15는 기본적으로 SSR(Server-Side Rendering)을 사용

**문제점**:
- Cloudflare Pages에서 Next.js 15 SSR을 사용하려면 `@cloudflare/next-on-pages` 패키지가 필요합니다.
- 현재 프로젝트에 이 패키지가 설치되어 있지 않습니다.
- `.next` 디렉토리는 빌드 아티팩트이지만, Cloudflare Pages Functions로 변환되지 않았습니다.

**해결 방법**:
1. `@cloudflare/next-on-pages` 패키지 설치
2. 빌드 명령어를 `npx @cloudflare/next-on-pages@1`로 변경
3. 출력 디렉토리를 `.vercel/output/static`으로 변경

### 문제 2: metadataBase 환경 변수 누락 ⚠️

**현재 코드** (`app/layout.tsx`):
```typescript
metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
```

**문제점**:
- 빌드 시점에 `NEXT_PUBLIC_BASE_URL`이 없으면 `http://localhost:3000`을 사용합니다.
- 배포된 사이트의 실제 URL과 다를 수 있습니다.

**해결 방법**:
- Cloudflare Dashboard에서 `NEXT_PUBLIC_BASE_URL` 환경 변수 설정

### 문제 3: 빌드 출력 디렉토리 설정 ⚠️

**현재 설정** (`wrangler.toml`):
```toml
pages_build_output_dir = ".next"
```

**문제점**:
- Next.js 15 SSR을 사용할 때는 `.next`가 아닌 `.vercel/output/static`을 사용해야 합니다.
- 또는 정적 사이트로 배포하려면 `output: 'export'`를 사용해야 합니다.

## 🎯 해결 방안

### 방안 1: @cloudflare/next-on-pages 사용 (권장)

Next.js 15 SSR을 Cloudflare Pages에서 사용하려면:

1. **패키지 설치**:
```bash
npm install --save-dev @cloudflare/next-on-pages
```

2. **빌드 명령어 변경**:
```json
{
  "scripts": {
    "build": "next build",
    "build:cf": "npx @cloudflare/next-on-pages@1"
  }
}
```

3. **Cloudflare Pages 설정**:
- Build command: `npm run build:cf`
- Build output directory: `.vercel/output/static`

4. **wrangler.toml 수정**:
```toml
pages_build_output_dir = ".vercel/output/static"
```

### 방안 2: 정적 사이트로 배포

SSR이 필요 없다면 정적 사이트로 배포:

1. **next.config.ts 수정**:
```typescript
const nextConfig: NextConfig = {
  output: 'export', // 정적 사이트로 배포
  // ...
};
```

2. **빌드 출력 디렉토리**:
- Build output directory: `out`

3. **wrangler.toml 수정**:
```toml
pages_build_output_dir = "out"
```

## 📋 즉시 확인 사항

1. **Cloudflare Dashboard 확인**:
   - Pages → Settings → Builds
   - Build command 확인
   - Build output directory 확인

2. **배포 로그 확인**:
   - Pages → Deployments → 최신 배포 → Logs
   - Functions 배포 여부 확인
   - 에러 메시지 확인

3. **환경 변수 확인**:
   - Pages → Settings → Environment Variables
   - `NEXT_PUBLIC_BASE_URL` 설정 여부 확인

## 🔧 권장 수정 사항

1. `@cloudflare/next-on-pages` 패키지 추가
2. 빌드 스크립트 수정
3. `wrangler.toml` 출력 디렉토리 수정
4. 환경 변수 설정 가이드 추가

