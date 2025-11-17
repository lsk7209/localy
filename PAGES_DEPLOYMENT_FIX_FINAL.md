# Cloudflare Pages 배포 문제 최종 해결

## 🔍 문제 분석

### 발견된 문제

**배포 로그에서 확인된 에러**:
```
A wrangler.toml file was found but it does not appear to be valid. 
Did you mean to use wrangler.toml to configure Pages? 
If so, then make sure the file is valid and contains the `pages_build_output_dir` property. 
Skipping file and continuing.
```

**근본 원인**:
1. `wrangler.toml`이 Workers 배포용으로만 설정됨
   - `main = ".open-next/worker.js"` 설정됨
   - `pages_build_output_dir` 속성 없음

2. Cloudflare Pages가 설정을 무시
   - Pages는 `pages_build_output_dir` 속성을 필수로 요구
   - 속성이 없으면 설정 파일을 무시하고 기본 동작으로 진행

3. 결과
   - 빌드는 성공하지만 출력 디렉토리를 찾지 못함
   - 파일은 업로드되지만 올바른 위치에 없음
   - 사이트가 표시되지 않음

## ✅ 해결 방법

### 수정 사항

`wrangler.toml`에 `pages_build_output_dir` 추가:

```toml
# Workers 배포 설정
main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"
binding = "STATIC_ASSETS"

# Pages 배포 설정 (GitHub 자동 배포용)
pages_build_output_dir = ".open-next"
```

### 설명

1. **Workers 배포**: `main`과 `[assets]` 설정으로 Workers 배포 가능
2. **Pages 배포**: `pages_build_output_dir` 설정으로 Pages 배포 가능
3. **동시 지원**: 두 배포 방식 모두 지원

## 📋 배포 방식 비교

### Workers 배포
- **URL**: `https://localy-workers.lsk7209-5f4.workers.dev`
- **방법**: `npx wrangler deploy`
- **장점**: OpenNext에 최적화, 안정적
- **상태**: ✅ 배포 완료

### Pages 배포
- **URL**: `https://localy.pages.dev` (또는 설정된 도메인)
- **방법**: GitHub 자동 배포
- **장점**: 자동 배포, 커스텀 도메인 쉬움
- **상태**: ✅ 설정 완료 (다음 배포에서 작동 예상)

## 🎯 다음 배포에서 기대 효과

1. ✅ Pages가 `wrangler.toml` 설정을 올바르게 읽음
2. ✅ `.open-next` 디렉토리를 출력 디렉토리로 인식
3. ✅ 정적 파일이 올바른 위치에 배포됨
4. ✅ 사이트가 정상적으로 표시됨

## 📝 참고

- Workers와 Pages는 서로 다른 배포 방식입니다
- Workers: `npx wrangler deploy`로 수동 배포
- Pages: GitHub 푸시 시 자동 배포
- 두 방식 모두 사용 가능하도록 설정 완료

