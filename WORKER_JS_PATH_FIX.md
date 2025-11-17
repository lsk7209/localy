# _worker.js 경로 문제 해결

## 🔍 발견된 문제

**빌드 에러**:
```
Could not resolve "./cloudflare/images.js"
Could not resolve "./cloudflare/init.js"
Could not resolve "./server-functions/default/handler.mjs"
...
```

**근본 원인**:
- `_worker.js`를 `.open-next/assets/_worker.js`로 복사했음
- `worker.js`는 `.open-next/` 기준 상대 경로를 사용함
  - `./cloudflare/images.js` → `.open-next/cloudflare/images.js`
  - `./server-functions/default/handler.mjs` → `.open-next/server-functions/default/handler.mjs`
- `_worker.js`가 `assets/` 디렉토리에 있으면 상대 경로가 맞지 않음

## ✅ 해결 방법

### 1. wrangler.toml 수정

`pages_build_output_dir`를 `.open-next`로 되돌림:

```toml
pages_build_output_dir = ".open-next"
```

### 2. fix-pages-worker.js 수정

`_worker.js`를 `.open-next/_worker.js`로 복사:

```javascript
const pagesWorkerPath = path.join(process.cwd(), '.open-next', '_worker.js');
```

## 📋 OpenNext 구조

```
.open-next/
├── worker.js          # 원본 Workers 엔트리 포인트
├── _worker.js          # Pages Functions (복사됨)
├── assets/             # 정적 파일 디렉토리
│   ├── _next/
│   └── index.html
├── cloudflare/         # Cloudflare 유틸리티
│   ├── images.js
│   ├── init.js
│   └── skew-protection.js
├── server-functions/   # 서버 함수
│   └── default/
│       └── handler.mjs
└── .build/            # 빌드 아티팩트
    └── durable-objects/
```

## 🎯 작동 원리

1. **Pages 배포**:
   - `pages_build_output_dir = ".open-next"`로 설정
   - Pages가 `.open-next`를 루트로 인식
   - `_worker.js`가 Functions로 작동
   - `assets/` 디렉토리의 정적 파일 자동 제공

2. **상대 경로 해결**:
   - `_worker.js`가 `.open-next/` 루트에 있음
   - `./cloudflare/images.js` → `.open-next/cloudflare/images.js` ✅
   - `./server-functions/default/handler.mjs` → `.open-next/server-functions/default/handler.mjs` ✅

## 📝 참고

- Pages는 `pages_build_output_dir`를 루트로 사용
- `_worker.js`는 루트에 있어야 상대 경로가 올바르게 작동
- `assets/` 디렉토리는 Pages가 자동으로 인식하여 정적 파일 제공

