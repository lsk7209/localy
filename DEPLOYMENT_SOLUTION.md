# 배포 문제 해결 방안

## 🔍 발견된 근본 원인

### 문제 1: @cloudflare/next-on-pages Deprecated ⚠️

**중요 발견**:
- `@cloudflare/next-on-pages` 패키지가 **2025년 9월 29일 deprecated**되었습니다
- GitHub 저장소도 archived되었습니다
- 대신 **OpenNext Cloudflare adapter**를 사용해야 합니다

### 문제 2: Next.js 15 배포 방식

Next.js 15를 Cloudflare Pages에 배포하는 방법:

1. **OpenNext Cloudflare adapter 사용** (권장)
2. **정적 사이트로 배포** (`output: 'export'`)
3. **Next.js 15 자동 지원** (일부 기능 제한)

## ✅ 해결 방안

### 방안 1: OpenNext Cloudflare Adapter 사용 (권장)

#### 1. 패키지 설치

```bash
npm install --save-dev opennextjs-cloudflare
```

#### 2. package.json 수정

```json
{
  "scripts": {
    "build:cf": "opennextjs-cloudflare build"
  }
}
```

#### 3. Cloudflare Pages Dashboard 설정

**Pages → Settings → Builds**:
- **Build command**: `npm run build:cf`
- **Build output directory**: `.open-next`
- **Root directory**: `/`

#### 4. wrangler.toml 수정

```toml
pages_build_output_dir = ".open-next"
```

### 방안 2: 정적 사이트로 배포 (간단)

SSR이 필요 없다면:

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

**주의**: `output: 'export'`를 사용하면 API Routes가 작동하지 않습니다.

## 📋 현재 상황 분석

### 빌드 출력 확인

`.next/server/app/index.html` 파일이 존재하므로 빌드는 성공했습니다.

**문제점**:
- Cloudflare Pages가 `.next` 디렉토리를 올바르게 처리하지 못하고 있습니다
- Next.js 15 SSR을 Cloudflare Pages에서 사용하려면 특별한 변환이 필요합니다

## 🚀 권장 조치

### 즉시 실행

1. **OpenNext Cloudflare adapter 설치**:
   ```bash
   npm install --save-dev opennextjs-cloudflare
   ```

2. **Cloudflare Dashboard 설정 변경**:
   - Build command: `npm run build:cf`
   - Build output directory: `.open-next`

3. **재배포**

### 대안: 정적 사이트로 전환

API Routes가 필요 없다면:

1. `next.config.ts`에 `output: 'export'` 추가
2. Build output directory를 `out`으로 변경
3. 재배포

## 참고 자료

- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare Next.js 공식 문서](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

