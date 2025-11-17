# _worker.js 정적 파일 처리 패치

## 🔍 발견된 문제

**에러**:
- `/_next/static/css/*.css` 404
- `/_next/static/chunks/*.js` 404
- 모든 정적 파일이 404 에러

**근본 원인**:
- OpenNext의 asset resolver가 `env.ASSETS`를 사용하지만
- Pages에서 ASSETS 바인딩이 자동으로 생성되더라도
- `_worker.js`가 `/_next/static/` 요청을 먼저 처리하지 않음
- Middleware로 전달되어 정적 파일을 찾지 못함

## ✅ 해결 방법

### 1. patch-worker-static-assets.js 스크립트 생성

`_worker.js`에 정적 파일 처리 로직 추가:

```javascript
// Handle static assets (_next/static/*) before middleware
if (url.pathname.startsWith("/_next/static/")) {
    if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
            return assetResponse;
        }
    }
}
```

### 2. package.json 수정

`build:cf` 스크립트에 패치 스크립트 추가:

```json
{
  "scripts": {
    "build:cf": "opennextjs-cloudflare build && node scripts/fix-pages-worker.js && node scripts/patch-worker-static-assets.js"
  }
}
```

## 📋 작동 원리

1. **빌드 프로세스**:
   - OpenNext 빌드 실행
   - `worker.js` 생성
   - `_worker.js`로 복사
   - 정적 파일 처리 로직 추가

2. **요청 처리 순서**:
   - `/_next/static/` 요청이 `_worker.js`로 전달
   - 정적 파일 처리 로직이 먼저 실행
   - `env.ASSETS.fetch()`를 통해 정적 파일 제공
   - 404가 아니면 즉시 반환
   - 404이면 Middleware로 전달

## 🎯 기대 효과

1. ✅ `/_next/static/` 요청이 먼저 처리됨
2. ✅ `env.ASSETS.fetch()`를 통해 정적 파일 제공
3. ✅ 모든 JavaScript/CSS 파일 정상 로드
4. ✅ 사이트 정상 작동

## 📝 참고

- Pages는 자동으로 ASSETS 바인딩을 생성합니다
- `_worker.js`가 정적 파일을 먼저 처리해야 합니다
- Middleware로 전달되기 전에 정적 파일을 제공해야 합니다

