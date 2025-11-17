# Cloudflare Pages 배포 체크리스트

## ✅ 완료된 사항

1. **`next.config.ts`**: `output: 'standalone'` 제거 완료
2. **`wrangler.toml`**: 빈 `id` 필드 주석 처리 완료
3. **`pages_build_output_dir`**: `.next` 설정 완료

## 🔍 확인 필요 사항

### 1. Cloudflare Pages 빌드 설정

Cloudflare Dashboard → Pages → Settings → Builds에서 확인:

- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (프로젝트 루트)
- **Node.js version**: 18.x 이상

### 2. 환경 변수 설정

Cloudflare Dashboard → Pages → Settings → Environment Variables에서 설정 필요:

#### Production 환경 변수:
- `NEXT_PUBLIC_BASE_URL`: 배포된 사이트 URL (예: `https://your-site.pages.dev`)

#### D1 Database 바인딩:
- Pages 프로젝트에 D1 데이터베이스를 연결해야 합니다
- Dashboard → Pages → Settings → Functions → D1 Database bindings

#### KV Namespaces 바인딩:
- SETTINGS, CACHE, RATE_LIMIT 등 필요한 KV를 바인딩해야 합니다
- Dashboard → Pages → Settings → Functions → KV Namespace bindings

### 3. 잠재적 문제점

#### 문제 1: 환경 변수 접근 방법
현재 `getCloudflareEnv()` 함수가 `process.env`를 사용하는데, Cloudflare Pages Functions에서는 `request.env`를 통해 접근해야 할 수 있습니다.

**해결 방법**: Next.js 15의 App Router에서는 런타임에 자동으로 주입되지만, 필요시 수정 가능합니다.

#### 문제 2: D1 Database 바인딩
API Routes에서 D1에 접근하려면 Pages 프로젝트에 D1을 바인딩해야 합니다.

**해결 방법**: Cloudflare Dashboard에서 D1 바인딩 설정 필요

#### 문제 3: 빌드 시점 환경 변수
빌드 시점에 환경 변수가 없어도 빌드는 성공하지만, 런타임에 에러가 발생할 수 있습니다.

**해결 방법**: API Routes에서 환경 변수 없을 때 적절한 에러 메시지 반환 (이미 구현됨)

## 📋 배포 로그 확인 사항

배포 로그에서 다음을 확인하세요:

1. **빌드 성공 여부**: `✓ Compiled successfully`
2. **환경 변수 경고**: 환경 변수 관련 경고 메시지
3. **런타임 에러**: 배포 후 API 호출 시 에러 발생 여부

## 🔧 문제 발생 시 수정 방법

배포 로그를 공유해주시면 정확한 문제를 파악하고 수정하겠습니다.

