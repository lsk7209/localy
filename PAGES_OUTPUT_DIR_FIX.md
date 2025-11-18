# Pages 출력 디렉토리 수정

## 🔍 발견된 문제

**에러**:
- `/_next/static/css/*.css` 404
- `/_next/static/chunks/*.js` 404
- 모든 정적 파일이 404 에러

**근본 원인**:
- `pages_build_output_dir = ".open-next"`로 설정되어 있음
- 실제 정적 파일은 `.open-next/assets/_next/static/`에 있음
- Pages가 `.open-next`를 루트로 사용하므로 `/_next/static/` 경로를 찾지 못함
- ASSETS 바인딩이 `.open-next/assets/`를 루트로 사용하지만 경로 매핑이 복잡함

## ✅ 해결 방법

### 1. wrangler.toml 수정

`pages_build_output_dir`를 `.open-next/assets`로 변경:

```toml
pages_build_output_dir = ".open-next/assets"
```

### 2. fix-pages-worker.js 수정

`_worker.js`를 `.open-next/assets/_worker.js`로 복사:

```javascript
const pagesWorkerPath = path.join(process.cwd(), '.open-next', 'assets', '_worker.js');
```

### 3. patch-worker-static-assets.js 수정

`_worker.js` 경로를 `.open-next/assets/_worker.js`로 변경:

```javascript
const workerPath = path.join(process.cwd(), '.open-next', 'assets', '_worker.js');
```

## 📋 작동 원리

1. **Pages 배포**:
   - `pages_build_output_dir = ".open-next/assets"`로 설정
   - Pages가 `.open-next/assets`를 루트로 사용
   - `_next/static/` 경로가 직접 매핑됨

2. **정적 파일 요청 처리**:
   - `/_next/static/` 요청이 Pages로 전달
   - Pages가 `.open-next/assets/_next/static/`에서 파일 제공
   - 또는 `_worker.js`가 `env.ASSETS.fetch()`를 통해 제공

3. **Functions 처리**:
   - `_worker.js`가 `.open-next/assets/_worker.js`에 있음
   - Pages가 Functions로 자동 인식
   - 상대 경로는 `.open-next/` 기준으로 조정 필요

## 🎯 기대 효과

1. ✅ Pages가 `.open-next/assets`를 루트로 사용
2. ✅ `/_next/static/` 경로가 직접 매핑됨
3. ✅ 정적 파일이 정상적으로 제공됨
4. ✅ JavaScript/CSS 파일 정상 로드
5. ✅ 사이트 정상 작동

## 📝 참고

- Pages는 `pages_build_output_dir`를 루트로 사용
- 정적 파일은 루트에서 직접 제공됨
- `_worker.js`는 루트에 있어야 Functions로 인식됨
- worker.js의 상대 경로는 `.open-next/` 기준이므로 경로 조정 필요

