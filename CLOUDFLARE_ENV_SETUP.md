# Cloudflare Pages 환경 변수 설정 가이드

## 📋 개요

이 가이드에서는 Cloudflare Pages에서 API 키를 환경 변수로 설정하는 방법을 설명합니다.

## 🔑 설정할 환경 변수

### 1. 공공데이터 API 키
- **변수명**: `PUBLIC_DATA_API_KEY`
- **값**: 공공데이터포털에서 발급받은 인증키 (Encoding 버전)
  - 공공데이터포털 → 마이페이지 → 활용신청 현황 → 인증키 복사
  - Encoding 버전 사용 권장 (URL 인코딩된 키)
- **설명**: 공공데이터포털에서 발급받은 인증키

### 2. OpenAI API 키
- **변수명**: `OPENAI_API_KEY`
- **값**: OpenAI에서 발급받은 API 키
  - OpenAI Platform → API Keys → Create new secret key
  - `sk-proj-` 또는 `sk-`로 시작하는 키
- **설명**: OpenAI API 사용을 위한 인증키

## 🚀 설정 방법

### 방법 1: Cloudflare Dashboard (권장)

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com 접속
   - 로그인

2. **Pages 프로젝트 선택**
   - 왼쪽 메뉴에서 "Workers & Pages" 클릭
   - "Pages" 탭 선택
   - `localy-workers` 프로젝트 클릭

3. **Settings 메뉴 이동**
   - 상단 메뉴에서 "Settings" 클릭
   - 왼쪽 사이드바에서 "Environment Variables" 클릭

4. **환경 변수 추가**
   - "Add variable" 버튼 클릭
   - 각 환경 변수를 추가:

   **Production 환경:**
   - Variable name: `PUBLIC_DATA_API_KEY`
   - Value: 공공데이터포털에서 복사한 인증키 (Encoding 버전)
   - Environment: `Production` 선택
   - "Save" 클릭

   - Variable name: `OPENAI_API_KEY`
   - Value: OpenAI에서 복사한 API 키
   - Environment: `Production` 선택
   - "Save" 클릭

   **Preview 환경 (선택사항):**
   - 동일한 변수를 Preview 환경에도 추가 가능
   - Environment: `Preview` 선택

5. **배포 재시작**
   - 환경 변수 추가 후 자동으로 재배포되거나
   - 수동으로 "Deployments" 탭에서 최신 배포를 재배포

### 방법 2: Wrangler CLI (고급 사용자)

Wrangler CLI를 사용하여 환경 변수를 설정할 수 있습니다:

```bash
# 공공데이터 API 키 설정
npx wrangler pages secret put PUBLIC_DATA_API_KEY --project-name=localy-workers

# OpenAI API 키 설정
npx wrangler pages secret put OPENAI_API_KEY --project-name=localy-workers
```

**참고**: Wrangler CLI를 사용할 경우, 대화형 프롬프트에서 값을 입력해야 합니다.

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
- [Cloudflare Pages 배포 가이드](./DEPLOYMENT.md)

## 🔄 다음 단계

환경 변수 설정이 완료되면:

1. **수동 수집 테스트**
   - `/admin/fetch` 페이지에서 "초기 수집 시작" 버튼 클릭
   - 수집 상태 확인

2. **자동 수집 설정**
   - Cron 트리거 설정 (필요시)
   - 정기적인 데이터 수집 스케줄 확인

3. **모니터링**
   - 수집 로그 확인
   - 데이터베이스 통계 확인
   - API 호출 제한 확인

