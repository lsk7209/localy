# Cloudflare Pages _worker.js 생성 문제 해결

## 🔍 발견된 문제

**배포 로그**:
```
Successfully read wrangler.toml file.
Note: No functions dir at /functions found. Skipping.
```

**근본 원인**:
- OpenNext는 `.open-next/worker.js`를 생성하지만
- Cloudflare Pages는 `_worker.js`를 루트에서 찾습니다
- `build:cf` 스크립트가 `fix-pages-worker.js`를 실행하지 않음

## ✅ 해결 방법

### 1. package.json 수정

`build:cf` 스크립트에 `fix-pages-worker.js` 추가:

```json
{
  "scripts": {
    "build:cf": "opennextjs-cloudflare build && node scripts/fix-pages-worker.js"
  }
}
```

### 2. fix-pages-worker.js 동작

- `.open-next/worker.js`를 `.open-next/_worker.js`로 복사
- Cloudflare Pages가 `_worker.js`를 Functions로 인식

## 📋 배포 프로세스

1. **빌드**: `npm run build:cf`
   - OpenNext 빌드 실행
   - `worker.js` 생성
   - `_worker.js`로 복사

2. **배포**: GitHub 자동 배포
   - Cloudflare Pages가 `.open-next` 디렉토리 읽기
   - `_worker.js`를 Functions로 인식
   - 정적 파일 제공

## 🎯 기대 효과

- ✅ Pages가 `_worker.js`를 Functions로 인식
- ✅ SSR 및 API Routes 작동
- ✅ 정적 파일 정상 제공
- ✅ 사이트 정상 표시

