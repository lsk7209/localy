# Pages와 Workers 동시 배포 설정

## 🔍 문제 상황

**현재 상황**:
- 로컬: 사이트 정상 작동 ✅
- Cloudflare Pages: 사이트 안 뜸 ❌
- Workers: 배포 완료 ✅

**배포 로그 문제**:
```
A wrangler.toml file was found but it does not appear to be valid. 
Did you mean to use wrangler.toml to configure Pages? 
If so, then make sure the file is valid and contains the `pages_build_output_dir` property. 
Skipping file and continuing.
```

**원인**:
- `wrangler.toml`이 Workers 배포용으로만 설정됨 (`main = ".open-next/worker.js"`)
- Pages는 `pages_build_output_dir` 속성을 찾음
- Pages가 설정을 무시하고 기본 동작으로 진행

## ✅ 해결 방법

### 방법 1: Pages 배포용 설정 추가 (권장)

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

**장점**:
- Workers와 Pages 모두 지원
- GitHub 자동 배포 (Pages)와 수동 배포 (Workers) 모두 가능

### 방법 2: Pages 배포만 사용

Workers 설정 제거하고 Pages만 사용:

```toml
# Pages 배포만 사용
pages_build_output_dir = ".open-next"

# Workers 설정 주석 처리
# main = ".open-next/worker.js"
# [assets]
# directory = ".open-next/assets"
# binding = "STATIC_ASSETS"
```

### 방법 3: Workers 배포만 사용

Pages 자동 배포 중단하고 Workers만 사용:
- GitHub Actions에서 Pages 배포 비활성화
- Workers 배포만 사용

## 🎯 권장 해결책

**방법 1**을 권장합니다:
- GitHub 자동 배포 (Pages) 유지
- 필요시 Workers 수동 배포 가능
- 두 가지 배포 방식 모두 지원

