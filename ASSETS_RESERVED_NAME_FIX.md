# ASSETS 예약어 문제 해결

## 🔍 발견된 문제

**빌드 에러**:
```
The name 'ASSETS' is reserved in Pages projects. 
Please use a different name for your Assets binding.
```

**근본 원인**:
- Pages에서 ASSETS는 예약어입니다
- `[assets]` 섹션의 `binding = "ASSETS"`를 명시적으로 지정할 수 없습니다
- Pages는 자동으로 ASSETS 바인딩을 생성합니다

## ✅ 해결 방법

### wrangler.toml 수정

`[assets]` 섹션 제거:

```toml
pages_build_output_dir = ".open-next"

# [assets] 섹션 제거
# Pages는 자동으로 .open-next/assets 디렉토리를 인식하고 ASSETS 바인딩을 생성합니다
```

## 📋 Pages의 자동 ASSETS 바인딩

Pages는 다음을 자동으로 수행합니다:
1. `pages_build_output_dir` 내의 `assets/` 디렉토리를 자동 인식
2. ASSETS 바인딩을 자동 생성
3. `_worker.js`에 ASSETS 바인딩 자동 제공

## 🎯 작동 원리

1. **Pages 배포**:
   - `pages_build_output_dir = ".open-next"`로 설정
   - Pages가 `.open-next/assets/` 디렉토리를 자동 인식
   - ASSETS 바인딩 자동 생성 (예약어)

2. **정적 파일 요청 처리**:
   - `/_next/static/` 요청이 `_worker.js`로 전달
   - OpenNext의 asset resolver가 `env.ASSETS.fetch()`를 사용
   - ASSETS 바인딩을 통해 정적 파일 제공

## 📝 참고

- Pages에서 ASSETS는 예약어이므로 `binding` 필드에 지정 불가
- `[assets]` 섹션은 Pages에서 필요하지 않습니다 (자동 인식)
- Workers 배포 시에만 `[assets]` 섹션과 `binding` 필드가 필요합니다

