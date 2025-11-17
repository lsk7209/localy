# 정적 파일 404 에러 해결

## 🔍 발견된 문제

**에러**:
- JavaScript 파일들 (`566-6236d1fa425985ab.js`, `main-app-e318ac43286a8847.js` 등) 404
- CSS 파일 (`e715edcfd669b0eb.css`) 404
- Favicon 404

**근본 원인**:
- `pages_build_output_dir = ".open-next"`로 설정되어 있음
- 실제 정적 파일은 `.open-next/assets/_next/static/`에 있음
- Cloudflare Pages가 정적 파일을 찾지 못함

## ✅ 해결 방법

### 1. wrangler.toml 수정

`pages_build_output_dir`를 `.open-next/assets`로 변경:

```toml
pages_build_output_dir = ".open-next/assets"
```

### 2. fix-pages-worker.js 수정

`_worker.js`를 `.open-next/assets/_worker.js`로 복사하도록 변경:

```javascript
const pagesWorkerPath = path.join(process.cwd(), '.open-next', 'assets', '_worker.js');
```

## 📋 OpenNext 구조

```
.open-next/
├── worker.js          # Workers용 엔트리 포인트
├── assets/            # 정적 파일 디렉토리 (Pages 출력 디렉토리)
│   ├── _next/         # Next.js 정적 파일
│   │   └── static/
│   │       ├── chunks/
│   │       └── css/
│   ├── _worker.js     # Pages Functions (복사됨)
│   └── index.html     # 루트 HTML
└── ...
```

## 🎯 기대 효과

1. ✅ Pages가 `.open-next/assets`를 루트로 인식
2. ✅ `_next/static/` 경로의 정적 파일 정상 제공
3. ✅ `_worker.js`가 Functions로 작동
4. ✅ 모든 JavaScript/CSS 파일 정상 로드

## 📝 참고

- Pages는 `pages_build_output_dir`를 루트로 사용
- 정적 파일은 루트에서 직접 제공됨
- `_worker.js`는 루트에 있어야 Functions로 인식됨

