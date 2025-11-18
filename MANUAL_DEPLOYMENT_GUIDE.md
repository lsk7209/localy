# Cloudflare Pages 수동 배포 가이드

## 📋 개요

GitHub 자동 배포가 작동하지 않을 때 Cloudflare Pages에 수동으로 배포하는 방법을 안내합니다.

## 🚀 방법 1: Wrangler CLI를 사용한 배포 (권장)

### 1. 사전 준비

#### Wrangler CLI 설치 확인

```bash
# Wrangler가 설치되어 있는지 확인
npx wrangler --version

# 설치되어 있지 않다면 전역 설치 (선택사항)
npm install -g wrangler
```

#### Cloudflare 로그인

```bash
# Cloudflare에 로그인
npx wrangler login

# 브라우저가 열리면 Cloudflare 계정으로 로그인
```

### 2. 빌드 및 배포

#### 단계별 명령어

```bash
# 1. 프로젝트 루트로 이동
cd D:\cousorai\web\21_localy

# 2. 의존성 설치 (필요한 경우)
npm install

# 3. Cloudflare용 빌드 실행
npm run build:cf

# 4. Pages에 배포
npx wrangler pages deploy .open-next --project-name=localy-workers
```

#### 한 번에 실행

```bash
npm install && npm run build:cf && npx wrangler pages deploy .open-next --project-name=localy-workers
```

### 3. 배포 확인

```bash
# 배포 상태 확인
npx wrangler pages deployment list --project-name=localy-workers

# 최신 배포 정보 확인
npx wrangler pages deployment tail --project-name=localy-workers
```

## 🌐 방법 2: Cloudflare Dashboard를 통한 배포

### 1. 빌드 산출물 준비

```bash
# 프로젝트 루트에서
npm run build:cf
```

이 명령어는 다음을 수행합니다:
- `opennextjs-cloudflare build`: OpenNext Cloudflare 어댑터로 빌드
- `node scripts/fix-pages-worker.js`: `worker.js`를 `_worker.js`로 복사
- `node scripts/patch-worker-static-assets.js`: 정적 파일 처리 로직 추가

### 2. Dashboard에서 배포

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com 접속
   - 로그인

2. **Pages 프로젝트 선택**
   - 왼쪽 메뉴에서 "Workers & Pages" 클릭
   - "Pages" 탭 선택
   - `localy-workers` 프로젝트 클릭

3. **수동 배포**
   - "Deployments" 탭 클릭
   - "Create deployment" 또는 "Upload assets" 버튼 클릭
   - `.open-next` 디렉토리를 선택하거나 드래그 앤 드롭
   - "Deploy" 클릭

**참고**: Dashboard를 통한 배포는 `.open-next` 디렉토리 전체를 업로드해야 합니다.

## 📦 방법 3: ZIP 파일로 배포

### 1. 빌드 산출물 압축

```powershell
# PowerShell에서 실행
cd D:\cousorai\web\21_localy
npm run build:cf

# .open-next 디렉토리를 ZIP으로 압축
Compress-Archive -Path .open-next -DestinationPath deploy.zip -Force
```

### 2. Dashboard에서 ZIP 업로드

1. Cloudflare Dashboard → Pages → `localy-workers` → Deployments
2. "Upload assets" 클릭
3. `deploy.zip` 파일 선택
4. "Deploy" 클릭

## 🔧 빌드 스크립트 상세

### `package.json`의 빌드 스크립트

```json
{
  "scripts": {
    "build:cf": "opennextjs-cloudflare build && node scripts/fix-pages-worker.js && node scripts/patch-worker-static-assets.js"
  }
}
```

### 각 단계 설명

1. **`opennextjs-cloudflare build`**
   - Next.js 앱을 Cloudflare Pages용으로 빌드
   - `.open-next` 디렉토리에 산출물 생성

2. **`node scripts/fix-pages-worker.js`**
   - `.open-next/worker.js`를 `.open-next/_worker.js`로 복사
   - Cloudflare Pages가 Functions 엔트리 포인트로 인식

3. **`node scripts/patch-worker-static-assets.js`**
   - `_worker.js`에 정적 파일 처리 로직 추가
   - `/_next/static/` 요청을 ASSETS 바인딩으로 라우팅

## ⚙️ 환경 변수 설정

수동 배포 후에도 환경 변수는 Dashboard에서 설정해야 합니다:

1. **Dashboard 접속**
   - Pages → `localy-workers` → Settings → Environment Variables

2. **필수 환경 변수 추가**
   - `PUBLIC_DATA_API_KEY`: 공공데이터 API 키
   - `OPENAI_API_KEY`: OpenAI API 키
   - `REVALIDATE_API_KEY`: (선택사항) 재검증 API 키

3. **바인딩 확인**
   - Settings → Functions → D1 Database bindings
   - Settings → Functions → KV Namespace bindings

## 🐛 문제 해결

### 빌드 실패

```bash
# 캐시 삭제 후 재빌드
rm -rf .next .open-next node_modules/.cache
npm run build:cf
```

### 배포 실패

```bash
# Wrangler 버전 확인
npx wrangler --version

# 최신 버전으로 업데이트
npm install -g wrangler@latest

# 재로그인
npx wrangler logout
npx wrangler login
```

### 정적 파일 404 에러

```bash
# 빌드 스크립트가 모두 실행되었는지 확인
npm run build:cf

# .open-next/_worker.js 파일 존재 확인
ls .open-next/_worker.js

# .open-next/assets 디렉토리 확인
ls .open-next/assets
```

### 환경 변수 미인식

- Dashboard에서 환경 변수가 Production 환경에 설정되어 있는지 확인
- 배포 후 새로운 배포가 시작되었는지 확인 (환경 변수 변경 시 재배포 필요)

## 📝 배포 체크리스트

배포 전 확인 사항:

- [ ] `npm install` 완료
- [ ] `npm run build:cf` 성공
- [ ] `.open-next` 디렉토리 생성 확인
- [ ] `.open-next/_worker.js` 파일 존재 확인
- [ ] `.open-next/assets` 디렉토리 존재 확인
- [ ] Cloudflare 로그인 완료 (`npx wrangler login`)
- [ ] 환경 변수 설정 확인 (Dashboard)
- [ ] D1 Database 바인딩 확인 (Dashboard)
- [ ] KV Namespace 바인딩 확인 (Dashboard)

## 🚀 빠른 배포 명령어

### PowerShell (Windows)

```powershell
# 한 줄로 빌드 및 배포
npm install; npm run build:cf; npx wrangler pages deploy .open-next --project-name=localy-workers
```

### Bash (Linux/Mac)

```bash
# 한 줄로 빌드 및 배포
npm install && npm run build:cf && npx wrangler pages deploy .open-next --project-name=localy-workers
```

## 📚 관련 문서

- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [자동 배포 가이드](./AUTO_DEPLOY_GUIDE.md)
- [배포 문제 해결](./DEPLOYMENT_TROUBLESHOOTING.md)

## 💡 팁

1. **빌드 시간 단축**: `.next`와 `.open-next` 캐시를 유지하면 빌드가 더 빠릅니다.

2. **배포 전 테스트**: 로컬에서 `npm run dev`로 테스트 후 배포하세요.

3. **배포 로그 확인**: `npx wrangler pages deployment tail`로 실시간 로그를 확인할 수 있습니다.

4. **환경 변수 관리**: 민감한 정보는 Dashboard에서만 관리하고 코드에 포함하지 마세요.

