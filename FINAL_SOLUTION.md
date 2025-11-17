# 최종 해결 방안

## 🔍 근본 원인

OpenNext는 **Cloudflare Workers**용으로 설계되었고, **Cloudflare Pages**에서 완벽히 작동하지 않습니다.

**증거**:
- Functions 빌드 실패 (Node.js 모듈 해결 문제)
- `_worker.js` 빌드 복잡성
- Pages가 Functions를 올바르게 인식하지 못함
- 배포는 성공하지만 사이트 접속 불가

## 🎯 해결 방안

### 방안 1: Cloudflare Workers로 전환 (권장) ⭐

**장점**:
- OpenNext에 최적화됨
- 모든 기능 사용 가능 (API Routes 포함)
- 안정적 배포

**단점**:
- Pages가 아닌 Workers 배포
- 설정 변경 필요

**구현**:
1. `wrangler.toml` 수정
2. 배포 방식 변경
3. Workers 배포

### 방안 2: 정적 사이트로 전환

**장점**:
- 매우 간단한 배포
- Pages에서 완벽히 작동

**단점**:
- API Routes 사용 불가
- SSR 제한

**구현**:
1. `next.config.ts`에 `output: 'export'` 추가
2. API Routes 제거 또는 클라이언트 전용으로 변경
3. `wrangler.toml`에서 `pages_build_output_dir = "out"` 설정

## 📋 API Routes 사용 현황

현재 사용 중인 API Routes:
- `/api/shops` - 상가 목록
- `/api/shop/[slug]` - 상가 상세
- `/api/region/[name]` - 지역 통계
- `/api/admin/*` - 관리자 API
- `/api/revalidate` - 재검증 API

**결론**: API Routes가 필요하므로 정적 사이트 전환은 어렵습니다.

## ✅ 권장 해결책: Workers로 전환

