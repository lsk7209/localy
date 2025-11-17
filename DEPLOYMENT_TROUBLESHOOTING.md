# 배포 문제 해결 가이드

## 현재 상황

✅ 빌드 성공
✅ 배포 성공 (200 files uploaded)
❌ 사이트가 표시되지 않음

## 즉시 확인 사항

### 1. Cloudflare Dashboard 확인

1. **Pages → 프로젝트 → Deployments**
   - 최신 배포 상태 확인
   - 배포 URL 확인
   - Functions 배포 여부 확인

2. **Pages → Settings → Builds**
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Root directory: `/`

3. **Pages → Settings → Functions**
   - D1 Database 바인딩 확인
   - KV Namespaces 바인딩 확인

### 2. 브라우저에서 확인

1. **개발자 도구 열기** (F12)
2. **Console 탭** 확인
   - JavaScript 에러 확인
   - 네트워크 에러 확인
3. **Network 탭** 확인
   - 실패한 요청 확인
   - 404 에러 확인

### 3. 배포 URL 확인

배포된 URL로 직접 접속:
- `https://your-project.pages.dev`
- 또는 Cloudflare Dashboard에서 제공하는 URL

## 일반적인 문제와 해결책

### 문제 1: Functions 바인딩 누락

**증상**: API Routes가 작동하지 않음

**해결**:
1. Cloudflare Dashboard → Pages → Settings → Functions
2. D1 Database 바인딩 추가: `DB` → `localy-db`
3. KV Namespaces 바인딩 추가: 모든 KV 추가

### 문제 2: 환경 변수 누락

**증상**: 일부 기능이 작동하지 않음

**해결**:
1. Cloudflare Dashboard → Pages → Settings → Environment Variables
2. `NEXT_PUBLIC_BASE_URL` 설정: 배포된 사이트 URL

### 문제 3: 빌드 출력 디렉토리 오류

**증상**: 404 에러 또는 빈 페이지

**해결**:
- 현재 설정 (`.next`)이 올바릅니다
- Dashboard에서 확인 필요

### 문제 4: Functions 배포 실패

**증상**: API Routes가 404 반환

**해결**:
1. 배포 로그 확인
2. Functions 설정 확인
3. 필요시 재배포

## 디버깅 명령어

### 로컬에서 빌드 확인

```bash
npm run build
npm run start
```

로컬에서 `http://localhost:3000` 접속하여 정상 작동 확인

### 배포 로그 확인

Cloudflare Dashboard → Pages → Deployments → 최신 배포 → View build logs

## 다음 조치

1. **즉시 확인**: Cloudflare Dashboard에서 배포 상태 확인
2. **Functions 확인**: 모든 바인딩이 설정되어 있는지 확인
3. **에러 로그 확인**: 브라우저 콘솔 및 배포 로그 확인
4. **재배포**: 필요시 수동으로 재배포 시도

## 추가 도움

문제가 계속되면:
1. Cloudflare Dashboard의 배포 로그 전체 복사
2. 브라우저 콘솔의 에러 메시지 복사
3. Cloudflare 지원팀에 문의

