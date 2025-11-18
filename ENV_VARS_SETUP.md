# Cloudflare Pages 환경 변수 설정 가이드

## 🔑 설정할 환경 변수

### 1. OpenAI API Key
- **변수명**: `OPENAI_API_KEY`
- **값**: OpenAI Platform에서 발급받은 API 키
  - OpenAI Platform → API Keys → Create new secret key
  - `sk-proj-` 또는 `sk-`로 시작하는 키

### 2. 공공데이터 API Key
- **변수명**: `PUBLIC_DATA_API_KEY`
- **값 (Encoding 버전 권장)**: `Dc%2Bm2FOHT2MQxGmXnBE3Qbuw9V4H4hJB8nKKOL6JWfWYK0Tc48AwXm7AkzGDREokxi%2BG1LeRUrqQG6NagZQ%2BAA%3D%3D`
- **값 (Decoding 버전)**: `Dc+m2FOHT2MQxGmXnBE3Qbuw9V4H4hJB8nKKOL6JWfWYK0Tc48AwXm7AkzGDREokxi+G1LeRUrqQG6NagZQ+AA==`

## 🚀 설정 방법

### 방법 1: Cloudflare Dashboard (권장)

Cloudflare Pages에서는 **Dashboard를 통해서만** 환경 변수를 설정할 수 있습니다.

#### 단계별 가이드

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com 접속
   - 로그인

2. **Pages 프로젝트 선택**
   - 왼쪽 메뉴에서 "Workers & Pages" 클릭
   - "Pages" 탭 선택
   - `localy` 프로젝트 클릭

3. **Settings 메뉴 이동**
   - 상단 메뉴에서 "Settings" 클릭
   - 왼쪽 사이드바에서 "Environment Variables" 클릭

4. **환경 변수 추가**

   **Production 환경:**
   - "Add variable" 버튼 클릭
   - Variable name: `OPENAI_API_KEY`
   - Value: OpenAI에서 복사한 API 키
   - Environment: `Production` 선택
   - "Save" 클릭

   - "Add variable" 버튼 클릭
   - Variable name: `PUBLIC_DATA_API_KEY`
   - Value: 공공데이터포털에서 복사한 인증키 (Encoding 버전 권장)
   - Environment: `Production` 선택
   - "Save" 클릭

   **Preview 환경 (선택사항):**
   - 동일한 변수를 Preview 환경에도 추가 가능
   - Environment: `Preview` 선택

5. **배포 재시작**
   - 환경 변수 추가 후 자동으로 재배포되거나
   - 수동으로 "Deployments" 탭에서 최신 배포를 재배포

### 방법 2: Wrangler CLI (프로젝트가 이미 존재하는 경우)

프로젝트가 이미 생성되어 있고 Wrangler에 로그인되어 있다면:

```powershell
# OpenAI API Key 설정 (대화형 입력)
npx wrangler pages secret put OPENAI_API_KEY --project-name=localy
# 프롬프트가 나타나면 API 키를 입력하세요

# Public Data API Key 설정 (대화형 입력)
npx wrangler pages secret put PUBLIC_DATA_API_KEY --project-name=localy
# 프롬프트가 나타나면 API 키를 입력하세요
```

**참고**: 프로젝트가 존재하지 않으면 먼저 Dashboard에서 프로젝트를 생성해야 합니다.

### 방법 3: PowerShell 스크립트 사용

```powershell
# 스크립트 실행
.\scripts\set-env-vars.ps1
```

## ✅ 설정 확인

### 1. Dashboard에서 확인
- Settings → Environment Variables에서 설정된 변수 확인
- Production과 Preview 환경 모두 확인

### 2. 애플리케이션에서 확인
- `/admin/fetch` 페이지 접속
- "환경 설정" 섹션에서 API 키 상태 확인:
  - ✅ 공공데이터 API 키: 설정됨
  - ✅ OpenAI API 키: 설정됨

### 3. API 테스트
- `/api/fetch/status` 엔드포인트 호출하여 환경 변수 확인
- 또는 수동 수집 버튼 클릭하여 실제 API 호출 테스트

## 🔒 보안 주의사항

1. **API 키 보안**
   - API 키는 절대 코드에 직접 작성하지 마세요
   - Git 저장소에 커밋하지 마세요
   - `.env` 파일을 `.gitignore`에 추가하세요

2. **키 관리**
   - 정기적으로 API 키를 로테이션하세요
   - 사용하지 않는 키는 즉시 삭제하세요
   - 키 접근 권한을 최소화하세요

3. **환경별 분리**
   - Production과 Preview 환경에 다른 키 사용 권장
   - 개발/테스트용 키와 프로덕션 키 분리

## 🐛 문제 해결

### 프로젝트가 존재하지 않는 경우

1. **Dashboard에서 프로젝트 생성**
   - Workers & Pages > Pages > "Create a project"
   - GitHub 저장소 연결 또는 직접 업로드
   - 프로젝트 이름: `localy`

2. **또는 기존 프로젝트 확인**
   - Dashboard에서 프로젝트 목록 확인
   - 프로젝트 이름이 다를 수 있음

### 환경 변수가 인식되지 않는 경우

1. **배포 확인**
   - 환경 변수 추가 후 새로운 배포가 시작되었는지 확인
   - 배포가 완료될 때까지 대기 (보통 2-5분)

2. **변수명 확인**
   - 대소문자 정확히 일치하는지 확인
   - 공백이나 특수문자가 없는지 확인

3. **환경 확인**
   - Production 환경 변수를 Production 배포에서만 사용 가능
   - Preview 환경 변수는 Preview 배포에서만 사용 가능

4. **캐시 확인**
   - 브라우저 캐시 삭제
   - Cloudflare 캐시 퍼지 (필요시)

### API 호출 실패

1. **API 키 형식 확인**
   - 공공데이터 API 키는 Encoding 버전 사용 권장
   - 특수문자가 올바르게 인코딩되었는지 확인

2. **API 키 유효성 확인**
   - 공공데이터포털에서 API 활용신청이 승인되었는지 확인
   - OpenAI 계정에서 API 키가 활성화되어 있는지 확인

3. **로그 확인**
   - Cloudflare Dashboard → Pages → Logs에서 에러 확인
   - 또는 애플리케이션 콘솔에서 에러 확인

## 📚 관련 문서

- [공공데이터 API 문서](./PUBLIC_DATA_API_LINKS.md)
- [데이터 수집 가이드](./DATA_COLLECTION_GUIDE.md)
- [수동 배포 가이드](./MANUAL_DEPLOYMENT_GUIDE.md)
- [Cloudflare Pages 배포 가이드](./DEPLOYMENT.md)

