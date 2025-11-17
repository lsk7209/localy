# D1 데이터베이스 설정 가이드

## 데이터베이스 정보

- **이름**: `localy-db`
- **ID**: `eabdfa2a-1676-49e3-b7a1-40155cc6a20c`

## Cloudflare Pages 바인딩 설정

Cloudflare Pages에서 D1 데이터베이스를 사용하려면 Dashboard에서 바인딩을 설정해야 합니다.

### 설정 방법

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com 접속
   - Pages → 프로젝트 선택

2. **Functions 바인딩 설정**
   - Settings → Functions → D1 Database bindings
   - "Add binding" 클릭

3. **바인딩 정보 입력**
   - **Variable name**: `DB`
   - **Database**: `localy-db` 선택
   - 또는 Database ID: `eabdfa2a-1676-49e3-b7a1-40155cc6a20c` 입력

4. **저장**
   - "Save" 클릭하여 저장

### 확인 사항

- ✅ 바인딩 이름이 `DB`로 설정되어 있는지 확인
- ✅ 데이터베이스 이름이 `localy-db`인지 확인
- ✅ Production 및 Preview 환경 모두에 바인딩 설정

## Workers 배포 시

Workers를 별도로 배포할 때는 `wrangler.toml`의 D1 설정이 자동으로 사용됩니다:

```toml
[[d1_databases]]
binding = "DB"
database_name = "localy-db"
database_id = "eabdfa2a-1676-49e3-b7a1-40155cc6a20c"
```

## 마이그레이션 실행

### 프로덕션 마이그레이션

```bash
npm run db:migrate:prod
```

또는

```bash
wrangler d1 migrations apply DB
```

### 로컬 개발 마이그레이션

```bash
npm run db:migrate
```

또는

```bash
wrangler d1 migrations apply DB --local
```

## 데이터베이스 쿼리

### 프로덕션 쿼리

```bash
wrangler d1 execute DB --command "SELECT * FROM biz_place LIMIT 10"
```

### 로컬 개발 쿼리

```bash
wrangler d1 execute DB --local --command "SELECT * FROM biz_place LIMIT 10"
```

## 스키마 확인

스키마는 `db/schema.ts`에 정의되어 있으며, 다음 테이블들이 있습니다:

- `rawStore`: 원본 상가 데이터
- `bizPlace`: 정규화된 상가 위치 정보
- `bizMeta`: 상가 메타데이터 (AI 생성 내용 포함)

## 주의사항

1. **Pages 배포**: Dashboard에서 바인딩 설정 필수
2. **Workers 배포**: `wrangler.toml` 설정 자동 사용
3. **마이그레이션**: 프로덕션 배포 전 반드시 실행
4. **백업**: 중요한 데이터는 정기적으로 백업

## 문제 해결

### 바인딩이 작동하지 않는 경우

1. Dashboard에서 바인딩이 올바르게 설정되었는지 확인
2. 바인딩 이름이 `DB`인지 확인 (대소문자 구분)
3. 배포 후 재시도

### 마이그레이션 실패 시

1. 마이그레이션 파일 확인: `db/migrations/`
2. 데이터베이스 상태 확인: `wrangler d1 info DB`
3. 에러 로그 확인

---

**데이터베이스 ID**: `eabdfa2a-1676-49e3-b7a1-40155cc6a20c`  
**마지막 업데이트**: 2025-01-15

