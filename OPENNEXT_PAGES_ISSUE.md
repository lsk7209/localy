# OpenNext Cloudflare Pages 배포 문제 분석

## 🔍 현재 상황

- ✅ 빌드 성공
- ✅ 배포 성공 (177개 파일 업로드)
- ❌ 사이트 접속 불가

## 문제 분석

### OpenNext 구조

OpenNext는 다음 구조를 생성합니다:
```
.open-next/
├── worker.js          # Cloudflare Workers 엔트리 포인트
├── assets/            # 정적 파일 (HTML, CSS, JS)
│   ├── _next/
│   └── ...
└── ...
```

### Cloudflare Pages vs Workers

**중요 발견**:
- OpenNext는 주로 **Cloudflare Workers**용으로 설계됨
- Cloudflare **Pages**는 다른 구조를 기대할 수 있음
- `pages_build_output_dir`는 정적 파일 디렉토리를 가리켜야 함

### 가능한 문제점

1. **출력 디렉토리 불일치**
   - 현재: `.open-next/assets`
   - Pages는 `index.html`을 루트에서 찾을 수 있음

2. **Functions 처리**
   - OpenNext는 `worker.js`를 생성하지만
   - Pages는 Functions를 자동으로 처리해야 함

3. **라우팅 문제**
   - Pages가 올바른 파일을 제공하지 못할 수 있음

## 해결 방안

### 방안 1: wrangler.toml에 assets 설정 추가

```toml
pages_build_output_dir = ".open-next"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

### 방안 2: 출력 디렉토리 확인

`.open-next/assets` 디렉토리에 `index.html`이 있는지 확인 필요

### 방안 3: Cloudflare Dashboard 확인

1. Pages → Deployments → 최신 배포
2. Functions 배포 여부 확인
3. 에러 로그 확인

## 다음 조치

1. 배포된 사이트 URL 확인
2. 브라우저 콘솔 에러 확인
3. 네트워크 요청 확인
4. `.open-next/assets` 구조 확인

