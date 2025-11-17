# Cloudflare MCP 서버 활용 가이드

## Cloudflare MCP 서버 개요

Cloudflare는 여러 MCP 서버를 원격으로 제공합니다:

- **Workers Observability**: https://observability.mcp.cloudflare.com/mcp
  - Workers 로그, 메트릭, 분석 확인
  - 배포 상태 및 에러 추적
  
- **Workers Builds**: https://builds.mcp.cloudflare.com/mcp
  - Workers 빌드 인사이트 및 관리
  - 빌드 실패 원인 분석

- **Workers Bindings**: https://bindings.mcp.cloudflare.com/mcp
  - Workers 바인딩 관리
  - D1, KV, Queue 설정 확인

## 현재 제한사항

현재 Cursor 환경에서는 Cloudflare MCP 서버에 직접 접근하기 어려울 수 있습니다. 
대신 다음 방법을 사용할 수 있습니다:

### 방법 1: 배포 로그 공유

Cloudflare Dashboard에서 배포 로그를 복사하여 공유해주시면:
- 빌드 에러 분석
- 런타임 에러 확인
- 자동 수정 제안

### 방법 2: 코드 사전 검토

배포 전에 코드를 검토하여 잠재적 문제를 찾아 수정:
- 환경 변수 접근 방법 확인
- 타입 안전성 검증
- Cloudflare Pages 호환성 확인

## 배포 로그 확인 방법

1. Cloudflare Dashboard 접속
2. Pages → 프로젝트 선택
3. Deployments → 최신 배포 클릭
4. Build Logs 또는 Runtime Logs 확인
5. 에러 메시지 복사하여 공유

## 자동 수정 가능한 항목

다음 항목들은 코드 검토를 통해 자동으로 수정 가능합니다:

- ✅ 환경 변수 접근 방법 (`process.env` → 올바른 방법)
- ✅ 타입 에러 수정
- ✅ 빌드 설정 최적화
- ✅ Cloudflare Pages 호환성 개선
- ✅ API Routes 런타임 설정

## 다음 단계

배포 로그를 공유해주시면 즉시 분석하고 수정하겠습니다!

