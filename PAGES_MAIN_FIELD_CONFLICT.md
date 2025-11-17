# Pages와 Workers main 필드 충돌 문제

## 🔍 발견된 문제

**배포 로그 에러**:
```
A wrangler.toml file was found but it does not appear to be valid. 
Did you mean to use wrangler.toml to configure Pages? 
If so, then make sure the file is valid and contains the `pages_build_output_dir` property. 
Skipping file and continuing.
```

**근본 원인**:
- `main` 필드와 `pages_build_output_dir`를 동시에 사용할 수 없음
- Pages는 `main` 필드가 있으면 Workers 배포용으로 인식하고 Pages 설정을 무시함
- 결과적으로 `pages_build_output_dir`가 있어도 무시됨

## ✅ 해결 방법

### Pages 배포용 설정 (현재 적용)

```toml
# Pages 배포 설정
pages_build_output_dir = ".open-next"

# Workers 설정 주석 처리
# main = ".open-next/worker.js"
# [assets]
# directory = ".open-next/assets"
# binding = "STATIC_ASSETS"
```

### Workers 배포용 설정 (필요시)

Workers 배포를 원할 때는 반대로 설정:

```toml
# Workers 배포 설정
main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"
binding = "STATIC_ASSETS"

# Pages 설정 주석 처리
# pages_build_output_dir = ".open-next"
```

## 📋 배포 방식 선택

### 옵션 1: Pages 배포만 사용 (현재 설정)
- ✅ GitHub 자동 배포
- ✅ 커스텀 도메인 쉬움
- ❌ Workers 수동 배포 불가

### 옵션 2: Workers 배포만 사용
- ✅ OpenNext에 최적화
- ✅ 안정적
- ❌ GitHub 자동 배포 불가

### 옵션 3: 두 개의 설정 파일 사용
- `wrangler.toml` - Pages 배포용
- `wrangler.workers.toml` - Workers 배포용
- 배포 시 적절한 파일 사용

## 🎯 권장 사항

**현재 설정 (Pages 배포)**을 유지하는 것을 권장합니다:
- GitHub 자동 배포가 편리함
- 커스텀 도메인 설정이 쉬움
- 대부분의 경우 Pages 배포로 충분함

Workers 배포가 필요한 경우:
- `wrangler.toml`에서 `pages_build_output_dir` 주석 처리
- `main`과 `[assets]` 주석 해제
- `npx wrangler deploy` 실행

