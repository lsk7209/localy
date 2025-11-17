# KV Namespaces 빠른 시작 가이드

## 🚀 가장 쉬운 방법: npm 스크립트 사용

### 1단계: Wrangler 로그인 (처음 한 번만)

```bash
npx wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하세요.

### 2단계: KV Namespaces 생성

```bash
npm run kv:create
```

이 명령어가 모든 KV Namespace를 자동으로 생성합니다!

---

## 📋 수동 실행 방법

### 방법 1: PowerShell에서 직접 실행

```powershell
.\scripts\create-kv-namespaces.ps1
```

### 방법 2: npm 스크립트 사용 (권장)

```bash
npm run kv:create
```

### 방법 3: PowerShell 명령어로 실행

```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-kv-namespaces.ps1
```

---

## ⚠️ 실행 정책 오류가 발생하는 경우

만약 "실행 정책으로 인해 스크립트를 실행할 수 없습니다"라는 오류가 나오면:

### 해결 방법 1: Bypass 옵션 사용

```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-kv-namespaces.ps1
```

### 해결 방법 2: 실행 정책 변경 (관리자 권한 필요)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

그 다음 다시 실행:

```powershell
.\scripts\create-kv-namespaces.ps1
```

---

## 📝 스크립트 실행 후 할 일

### 1. 생성된 ID 확인

스크립트가 실행되면 다음과 같은 출력이 나옵니다:

```
✅ SETTINGS ID: xxxxxxxxxxxxxxxxxxxxxxxx
✅ CACHE ID: xxxxxxxxxxxxxxxxxxxxxxxx
...
```

### 2. wrangler.toml에 ID 추가

스크립트가 자동으로 `wrangler.toml`에 추가할 형식을 출력합니다.
출력된 내용을 복사하여 `wrangler.toml`의 KV Namespaces 섹션에 추가하세요.

또는 수동으로 추가:

```toml
[[kv_namespaces]]
binding = "SETTINGS"
id = "생성된_ID_여기에_입력"
preview_id = "생성된_PREVIEW_ID_여기에_입력"

[[kv_namespaces]]
binding = "CACHE"
id = "생성된_ID_여기에_입력"
preview_id = "생성된_PREVIEW_ID_여기에_입력"

# ... 나머지도 동일하게
```

### 3. Cloudflare Pages 바인딩 설정

1. Cloudflare Dashboard 접속: https://dash.cloudflare.com
2. Pages → 프로젝트 선택
3. Settings → Functions → KV Namespace bindings
4. 각 KV Namespace를 바인딩:
   - SETTINGS
   - CACHE
   - RATE_LIMIT
   - FETCH_FAIL_QUEUE
   - DEAD_FAIL_QUEUE
   - SITEMAP

---

## 🔍 생성 확인

생성된 KV Namespace를 확인하려면:

```bash
npx wrangler kv:namespace list
```

---

## ❓ 문제 해결

### 스크립트가 실행되지 않는 경우

1. **PowerShell이 아닌 경우**
   - PowerShell을 사용하세요 (CMD가 아닌)
   - Windows Terminal 또는 PowerShell ISE 사용

2. **경로 문제**
   - 프로젝트 루트 디렉토리에서 실행하세요
   - `cd D:\cousorai\web\21_localy` 확인

3. **Wrangler 로그인 필요**
   - `npx wrangler login` 먼저 실행

### ID를 찾을 수 없는 경우

스크립트 출력에서 ID를 찾지 못했다면, 수동으로 확인:

```bash
npx wrangler kv:namespace list
```

또는 Dashboard에서 확인:
- Workers & Pages → KV → Namespace 목록

---

## 📚 더 자세한 정보

자세한 설정 방법은 `KV_NAMESPACES_SETUP.md` 파일을 참고하세요.

