# Cloudflare Pages Next.js 15 빌드 설정 수정

## 🔍 발견된 근본 원인

Next.js 15를 Cloudflare Pages에 배포할 때는 **`@cloudflare/next-on-pages`** 패키지가 필요합니다.

현재 문제:
- ❌ `npm run build`만 사용하고 있음
- ❌ `@cloudflare/next-on-pages` 패키지가 설치되지 않음
- ❌ 빌드 출력 디렉토리가 올바르지 않음

## ✅ 수정 사항

### 1. 패키지 설치

```bash
npm install --save-dev @cloudflare/next-on-pages
```

### 2. package.json 수정

```json
{
  "scripts": {
    "build:cf": "npx @cloudflare/next-on-pages@1"
  },
  "devDependencies": {
    "@cloudflare/next-on-pages": "^1.15.0"
  }
}
```

### 3. Cloudflare Pages Dashboard 설정

**Pages → Settings → Builds**에서:

- **Build command**: `npm run build:cf`
- **Build output directory**: `.vercel/output/static`
- **Root directory**: `/` (프로젝트 루트)
- **Node.js version**: 20.x 이상

### 4. wrangler.toml 수정 (선택사항)

```toml
pages_build_output_dir = ".vercel/output/static"
```

또는 Dashboard에서 설정하면 `wrangler.toml`은 자동으로 무시됩니다.

## 📋 배포 전 체크리스트

1. ✅ `@cloudflare/next-on-pages` 패키지 설치
2. ✅ `package.json`에 `build:cf` 스크립트 추가
3. ✅ Cloudflare Dashboard에서 Build command 변경
4. ✅ Build output directory를 `.vercel/output/static`으로 변경
5. ✅ 환경 변수 `NEXT_PUBLIC_BASE_URL` 설정

## 🚀 배포 후 확인

1. 배포 로그에서 `@cloudflare/next-on-pages` 실행 확인
2. `.vercel/output/static` 디렉토리 생성 확인
3. Functions 배포 확인
4. 사이트 접속 테스트

## 참고 자료

- [Cloudflare Next.js 공식 문서](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [@cloudflare/next-on-pages GitHub](https://github.com/cloudflare/next-on-pages)

