# ASSETS 바인딩을 통한 정적 파일 제공 문제 해결

## 🔍 발견된 문제

**에러**:
- `/_next/static/css/e715edcfd669b0eb.css` 404
- `/_next/static/chunks/*.js` 404
- 모든 정적 파일이 404 에러

**근본 원인**:
- `_worker.js`가 `env.ASSETS`를 사용하여 정적 파일을 제공해야 함
- Pages에서 ASSETS 바인딩이 자동으로 설정되지 않음
- `wrangler.toml`에 `[assets]` 섹션이 없어서 ASSETS 바인딩이 없음

## ✅ 해결 방법

### wrangler.toml 수정

`[assets]` 섹션 추가:

```toml
pages_build_output_dir = ".open-next"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

**중요**: Pages는 `main` 필드가 없을 때 `[assets]` 섹션을 사용할 수 있습니다.

## 📋 작동 원리

1. **Pages 배포**:
   - `pages_build_output_dir = ".open-next"`로 설정
   - `[assets]` 섹션으로 ASSETS 바인딩 생성
   - `_worker.js`가 `env.ASSETS`를 통해 정적 파일 제공

2. **정적 파일 요청 처리**:
   - `/_next/static/` 요청이 `_worker.js`로 전달
   - `_worker.js`가 `env.ASSETS.fetch()`를 사용하여 정적 파일 제공
   - 또는 서버 함수 핸들러가 ASSETS 바인딩을 사용

## 🎯 기대 효과

1. ✅ ASSETS 바인딩이 `_worker.js`에 제공됨
2. ✅ `env.ASSETS.fetch()`를 통해 정적 파일 제공
3. ✅ `/_next/static/` 경로의 모든 파일 정상 제공
4. ✅ JavaScript/CSS 파일 정상 로드

## 📝 참고

- Pages는 `main` 필드가 없을 때 `[assets]` 섹션을 사용할 수 있습니다
- ASSETS는 Pages에서 예약어이므로 다른 이름 사용 불가
- `directory`는 `.open-next/assets`로 설정하여 정적 파일 디렉토리 지정

