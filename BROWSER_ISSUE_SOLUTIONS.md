# 브라우저 표시 문제 해결 방안

## 🔍 발견된 주요 원인

### 1. OpenNext Pages 호환성 문제 ⚠️ (가장 가능성 높음)

**문제**: OpenNext는 주로 **Cloudflare Workers**용으로 설계되었습니다.

**증거**:
- OpenNext 문서에서 Pages보다 Workers 배포를 권장
- `worker.js`가 Pages에서 Functions로 자동 변환되어야 하지만 실패할 수 있음
- `.open-next` 구조가 Pages의 기대와 다를 수 있음

**해결책**:
1. **Workers로 배포** (권장)
   - `wrangler.toml`에서 `main = ".open-next/worker.js"` 설정
   - `pages_build_output_dir` 제거
   - `npx wrangler deploy` 사용

2. **정적 사이트로 전환**
   - `next.config.ts`에 `output: 'export'` 추가
   - `pages_build_output_dir = "out"` 설정

### 2. index.html 위치 문제 ⚠️

**문제**: Cloudflare Pages는 루트에 `index.html`을 찾습니다.

**확인 필요**:
- `.open-next/assets/index.html` 존재 여부
- `.open-next/index.html` 존재 여부

**해결책**:
- `.open-next/assets`에 `index.html`이 있어야 함
- 또는 `.open-next` 루트에 `index.html`이 있어야 함

### 3. worker.js Functions 변환 실패 ⚠️

**문제**: Pages가 `worker.js`를 Functions로 변환하지 못함

**증거**:
- 배포 로그에 "No functions dir at /functions found"
- `worker.js`가 Functions로 인식되지 않음

**해결책**:
- `_worker.js`로 이름 변경 시도
- 또는 Functions 디렉토리 구조 확인

### 4. Functions 바인딩 에러 ⚠️

**문제**: D1, KV 등이 바인딩되지 않아 런타임 에러 발생

**확인 필요**:
- Cloudflare Dashboard → Pages → Settings → Functions
- D1 Database 바인딩 확인
- KV Namespaces 바인딩 확인

**해결책**:
- Dashboard에서 모든 바인딩 확인
- 환경 변수 설정 확인

### 5. 환경 변수 누락 ⚠️

**문제**: `NEXT_PUBLIC_BASE_URL` 등이 없어서 앱 초기화 실패

**확인 필요**:
- `app/layout.tsx`에서 `metadataBase` 사용
- 빌드 시점에 환경 변수 필요

**해결책**:
- Cloudflare Dashboard에서 환경 변수 설정
- `NEXT_PUBLIC_BASE_URL` 설정

### 6. app/layout.tsx 문법 에러 ⚠️

**문제**: `app/layout.tsx` 54번째 줄에 `return` 문이 누락됨

**코드**:
```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
    <html lang="ko">  // ❌ return 문 누락!
```

**해결책**:
```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (  // ✅ return 추가
    <html lang="ko">
```

## 🎯 우선순위별 해결 방안

### 즉시 수정 (우선순위 1)

1. **app/layout.tsx 문법 에러 수정**
   - `return` 문 추가
   - 빌드 실패 원인일 수 있음

### 확인 필요 (우선순위 2)

2. **Cloudflare Dashboard 확인**
   - Functions 바인딩 확인
   - 환경 변수 확인
   - 배포 로그 확인

3. **빌드 출력 구조 확인**
   - `.open-next/assets/index.html` 존재 여부
   - `worker.js` 위치 확인

### 장기 해결 (우선순위 3)

4. **Workers로 전환 고려**
   - OpenNext는 Workers에 최적화됨
   - Pages보다 안정적

5. **정적 사이트로 전환**
   - API Routes가 필요 없다면
   - 더 간단한 배포

## 📋 다음 조치 사항

1. ✅ `app/layout.tsx` 문법 에러 수정
2. ✅ Cloudflare Dashboard Functions 바인딩 확인
3. ✅ 환경 변수 설정 확인
4. ✅ 배포 로그에서 에러 확인
5. ✅ 브라우저 개발자 도구 콘솔 확인

