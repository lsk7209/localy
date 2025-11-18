# _worker.js 경로 문제 해결

## 🔍 발견된 문제

**에러**:
```
Could not resolve "./cloudflare/images.js"
Could not resolve "./cloudflare/init.js"
Could not resolve "./middleware/handler.mjs"
...
```

**근본 원인**:
- `_worker.js`를 `.open-next/assets/_worker.js`로 복사했음
- `worker.js`는 `.open-next/` 기준 상대 경로를 사용함
- `_worker.js`가 `.open-next/assets/`에 있으면 상대 경로가 맞지 않음
- `./cloudflare/images.js` → `.open-next/assets/cloudflare/images.js` (존재하지 않음)
- 실제 경로는 `.open-next/cloudflare/images.js`

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

### 3. patch-worker-static-assets.js 수정

`_worker.js` 경로를 `.open-next/_worker.js`로 변경:

```javascript
const workerPath = path.join(process.cwd(), '.open-next', '_worker.js');
```

## 📋 작동 원리

1. **Pages 배포**:
   - `pages_build_output_dir = ".open-next"`로 설정
   - Pages가 `.open-next`를 루트로 사용
   - `_worker.js`가 `.open-next/_worker.js`에 있음
   - 상대 경로가 올바르게 작동

2. **정적 파일 요청 처리**:
   - Pages가 자동으로 `.open-next/assets/` 디렉토리를 인식
   - ASSETS 바인딩을 자동 생성
   - `_worker.js`가 `env.ASSETS.fetch()`를 통해 정적 파일 제공
   - 또는 Pages가 직접 정적 파일 제공

3. **경로 매핑**:
   - `/_next/static/` 요청이 `_worker.js`로 전달
   - `_worker.js`가 `env.ASSETS.fetch()`를 사용하여 정적 파일 제공
   - 또는 Pages가 `.open-next/assets/_next/static/`에서 직접 제공

## 🎯 기대 효과

1. ✅ `_worker.js`의 상대 경로가 올바르게 작동
2. ✅ 모든 import 경로가 정상적으로 해결됨
3. ✅ Pages가 ASSETS 바인딩을 자동 생성
4. ✅ 정적 파일이 정상적으로 제공됨
5. ✅ JavaScript/CSS 파일 정상 로드

## 📝 참고

- `worker.js`는 `.open-next/` 기준 상대 경로를 사용
- `_worker.js`는 `.open-next/` 루트에 있어야 상대 경로가 맞음
- Pages는 자동으로 `.open-next/assets/` 디렉토리를 인식
- ASSETS 바인딩은 Pages에서 자동으로 생성됨

