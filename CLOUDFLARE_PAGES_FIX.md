# Cloudflare Pages 배포 에러 수정

## 문제점

Cloudflare Pages 배포 시 다음과 같은 에러가 발생했습니다:

1. **`output: 'standalone'` 설정 문제**: Cloudflare Pages는 Next.js의 `standalone` 출력 모드를 지원하지 않습니다.
2. **`wrangler.toml` 설정 누락**: Cloudflare Pages가 빌드 출력 디렉토리를 찾지 못했습니다.

## 수정 사항

### 1. `next.config.ts` 수정

```typescript
// 수정 전
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone', // ❌ Cloudflare Pages에서 지원하지 않음
  // ...
};

// 수정 후
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages는 standalone 출력을 지원하지 않으므로 제거
  // Cloudflare Pages는 Next.js를 직접 빌드하여 배포합니다
  // ...
};
```

### 2. `wrangler.toml` 수정

```toml
# 추가된 설정
pages_build_output_dir = ".next"
```

## Cloudflare Pages 배포 설정

Cloudflare Pages Dashboard에서 다음 설정을 사용하세요:

- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (프로젝트 루트)

## 참고사항

- Cloudflare Pages는 Next.js를 직접 빌드하므로 `standalone` 모드가 필요하지 않습니다.
- `wrangler.toml`의 `pages_build_output_dir` 설정은 Cloudflare Pages가 빌드 출력을 찾는 데 도움이 됩니다.
- ESLint 순환 참조 경고는 빌드에 영향을 주지 않으며, Next.js의 내부 설정과 관련된 것으로 무시해도 됩니다.

## 검증

로컬 빌드가 성공적으로 완료되었습니다:

```bash
npm run build
# ✓ Compiled successfully
# ✓ Generating static pages (16/16)
```

## 배포 준비 완료

이제 Cloudflare Pages에 배포할 수 있습니다. GitHub에 푸시하면 자동으로 배포가 시작됩니다.

