# Cloudflare Pages 배포 화면 표시 문제 해결

## 🔍 문제 상황

배포는 성공했지만 화면이 표시되지 않음.

## 원인 분석

OpenNext는 다음 구조를 생성합니다:
- `.open-next/worker.js` - Cloudflare Workers용
- `.open-next/assets` - 정적 파일 (HTML, CSS, JS)

**문제점**:
- `pages_build_output_dir = ".open-next"`로 설정되어 있음
- Cloudflare Pages는 `.open-next` 디렉토리 전체를 보지만, 실제 정적 파일은 `.open-next/assets`에 있음
- Pages는 `worker.js`를 찾으려고 하지만, 정적 파일을 제공해야 함

## ✅ 해결 방법

### 방법 1: 출력 디렉토리를 `.open-next/assets`로 변경 (권장)

`wrangler.toml` 수정:
```toml
pages_build_output_dir = ".open-next/assets"
```

### 방법 2: Cloudflare Dashboard에서 확인

Cloudflare Dashboard → Pages → Settings → Builds:
- **Build output directory**: `.open-next/assets`로 변경

## 📋 추가 확인 사항

### 1. Functions 바인딩 확인

Cloudflare Dashboard → Pages → Settings → Functions:
- D1 Database 바인딩: `DB` → `localy-db`
- KV Namespaces 바인딩: 모든 KV 확인

### 2. 환경 변수 확인

Cloudflare Dashboard → Pages → Settings → Environment Variables:
- `NEXT_PUBLIC_BASE_URL`: 배포된 사이트 URL 설정

### 3. 배포 로그 확인

Cloudflare Dashboard → Pages → Deployments → 최신 배포:
- Functions 배포 여부 확인
- 에러 메시지 확인

## 🚀 다음 단계

1. `wrangler.toml`에서 `pages_build_output_dir`를 `.open-next/assets`로 변경
2. 재배포
3. 사이트 접속 테스트

## 참고

OpenNext는 Cloudflare Workers용으로 설계되었지만, Cloudflare Pages에서도 작동합니다.
정적 파일은 `.open-next/assets` 디렉토리에 있고, Functions는 자동으로 처리됩니다.

