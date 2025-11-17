# OpenNext Cloudflare Pages 배포 문제 해결

## 🔍 문제 분석

### 현재 상황
- ✅ 빌드 성공
- ✅ 배포 성공 (177개 파일 업로드)
- ❌ 사이트 접속 불가

### 근본 원인

**중요 발견**: OpenNext는 주로 **Cloudflare Workers**용으로 설계되었습니다.

OpenNext 구조:
```
.open-next/
├── worker.js          # Cloudflare Workers 엔트리 포인트
├── assets/            # 정적 파일 (HTML, CSS, JS)
│   ├── _next/
│   └── ...
└── ...
```

**문제점**:
1. Cloudflare **Pages**는 Workers와 다른 구조를 기대합니다
2. `pages_build_output_dir`만으로는 부족할 수 있습니다
3. `worker.js`가 Functions로 자동 변환되어야 하지만, assets 바인딩이 필요합니다

## ✅ 해결 방법

### wrangler.toml 수정

```toml
# .open-next 전체를 출력 디렉토리로 사용
pages_build_output_dir = ".open-next"

# Assets 설정 추가 (정적 파일 제공)
[assets]
directory = ".open-next/assets"
binding = "ASSETS"
run_worker_first = true
```

### 설명

1. **`pages_build_output_dir = ".open-next"`**
   - `.open-next` 디렉토리 전체를 사용
   - `worker.js`가 Functions로 자동 변환됨

2. **`[assets]` 섹션**
   - `directory`: 정적 파일 디렉토리
   - `binding`: Worker에서 사용할 바인딩 이름
   - `run_worker_first`: Worker가 먼저 실행되어 정적 파일을 제공

## 📋 추가 확인 사항

### 1. Cloudflare Dashboard 설정

**Pages → Settings → Builds**:
- **Build command**: `npm run build:cf`
- **Build output directory**: `.open-next` (자동으로 wrangler.toml에서 읽음)

### 2. Functions 바인딩 확인

**Pages → Settings → Functions**:
- D1 Database: `DB` → `localy-db`
- KV Namespaces: 모든 KV 확인

### 3. 환경 변수 확인

**Pages → Settings → Environment Variables**:
- `NEXT_PUBLIC_BASE_URL`: 배포된 사이트 URL

## 🚀 배포 후 확인

1. 배포 로그에서 Functions 배포 확인
2. 사이트 접속 테스트
3. 브라우저 콘솔 에러 확인

## 참고

- OpenNext는 Cloudflare Workers용이지만, Pages에서도 작동합니다
- `worker.js`가 자동으로 Functions로 변환됩니다
- `assets` 바인딩을 통해 정적 파일이 제공됩니다

