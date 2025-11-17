# 정적 사이트 배포 옵션

## 현재 상황

OpenNext Cloudflare adapter는 `wrangler@^4.38.0`을 요구하지만, 현재 `wrangler@^3.109.0`이 설치되어 있어 의존성 충돌이 발생합니다.

## 해결 방안

### 방안 1: Wrangler 업그레이드 (권장)

`wrangler`를 4.x 버전으로 업그레이드:

```json
{
  "devDependencies": {
    "wrangler": "^4.38.0"
  }
}
```

### 방안 2: 정적 사이트로 배포

API Routes가 필요 없다면 정적 사이트로 배포:

#### 1. next.config.ts 수정

```typescript
const nextConfig: NextConfig = {
  output: 'export', // 정적 사이트로 배포
  // ...
};
```

#### 2. Cloudflare Pages Dashboard 설정

- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Root directory**: `/`

#### 3. wrangler.toml 수정

```toml
pages_build_output_dir = "out"
```

**주의**: `output: 'export'`를 사용하면:
- ✅ 정적 페이지는 작동
- ❌ API Routes는 작동하지 않음
- ❌ Server-Side Rendering 불가

### 방안 3: API Routes를 별도 Workers로 분리

1. Next.js 앱은 정적 사이트로 배포
2. API Routes는 별도 Cloudflare Workers로 배포
3. CORS 설정으로 통신

## 현재 API Routes 사용 현황

프로젝트에서 사용 중인 API Routes:
- `/api/shops` - 상가 목록
- `/api/shop/[slug]` - 상가 상세
- `/api/region/[name]` - 지역 통계
- `/api/admin/*` - 관리자 API
- `/api/revalidate` - 재검증 API

이 API Routes들이 필요하다면 정적 사이트 배포는 불가능합니다.

## 권장 사항

1. **Wrangler 업그레이드**: `wrangler@^4.38.0`으로 업그레이드
2. **OpenNext 사용**: SSR과 API Routes 모두 지원
3. **대안**: API Routes가 필요 없다면 정적 사이트 배포

