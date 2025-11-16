# 개발 가이드

## 프로젝트 구조

```
.
├── app/                      # Next.js App Router
│   ├── admin/               # 관리자 페이지
│   │   ├── page.tsx        # 대시보드
│   │   ├── settings/       # 설정 페이지
│   │   └── jobs/           # 작업 로그 페이지
│   ├── shop/               # 상가 상세 페이지
│   │   └── [slug]/         # 동적 라우트
│   ├── api/                # API 라우트
│   │   └── revalidate/    # ISR revalidate
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 홈 페이지
│   └── globals.css         # 전역 스타일
├── workers/                 # Cloudflare Workers
│   ├── index.ts           # 메인 엔트리
│   ├── cron/               # Cron 작업들
│   │   ├── initial-fetch.ts      # 초기 수집
│   │   ├── incremental-fetch.ts  # 증분 수집
│   │   ├── normalize.ts           # 정규화
│   │   ├── retry.ts               # 재시도
│   │   ├── ai-generation.ts       # AI 생성
│   │   └── publish.ts             # 발행
│   ├── queue/              # Queue 핸들러
│   │   └── handler.ts
│   ├── utils/              # 유틸리티
│   │   ├── db.ts          # DB 클라이언트
│   │   ├── kv.ts          # KV 유틸리티
│   │   ├── slug.ts        # Slug 생성
│   │   └── address.ts     # 주소 파싱
│   └── types.ts            # 타입 정의
├── db/                      # 데이터베이스
│   ├── schema.ts           # Drizzle 스키마
│   └── migrations/         # 마이그레이션 파일
├── lib/                     # 공통 라이브러리
│   ├── db.ts               # DB 클라이언트 (Next.js용)
│   └── utils.ts            # 유틸리티 함수
├── PRD.md                   # 프로젝트 요구사항 문서
├── wrangler.toml           # Cloudflare Workers 설정
├── drizzle.config.ts       # Drizzle 설정
└── package.json            # 패키지 설정
```

## 다음 단계

### 1. 데이터베이스 설정

```bash
# D1 데이터베이스 생성 (로컬)
npx wrangler d1 create localy-db --local

# 마이그레이션 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate
```

### 2. KV 네임스페이스 생성

```bash
# 프로덕션용
npx wrangler kv:namespace create SETTINGS
npx wrangler kv:namespace create FETCH_FAIL_QUEUE
npx wrangler kv:namespace create DEAD_FAIL_QUEUE

# 프리뷰용
npx wrangler kv:namespace create SETTINGS --preview
npx wrangler kv:namespace create FETCH_FAIL_QUEUE --preview
npx wrangler kv:namespace create DEAD_FAIL_QUEUE --preview
```

생성된 ID를 `wrangler.toml`에 추가하세요.

### 3. Queue 생성

```bash
npx wrangler queues create fetch-queue
```

### 4. 환경 변수 설정

```bash
# OpenAI API 키
npx wrangler secret put OPENAI_API_KEY

# 공공데이터 API 키
npx wrangler secret put PUBLIC_DATA_API_KEY
```

### 5. 공공데이터 API 통합

다음 파일에서 실제 API 호출 로직을 구현하세요:

- `workers/cron/initial-fetch.ts`: `fetchStoreListInDong()` 함수 구현
- `workers/cron/incremental-fetch.ts`: `fetchStoreListByDate()` 함수 구현

### 6. Next.js와 Workers 통합

Cloudflare Pages에서 Next.js와 Workers를 함께 배포하려면:

1. `wrangler.toml`에 Pages 설정 추가
2. Next.js API 라우트에서 Workers와 통신하거나
3. Cloudflare Pages Functions에서 D1 직접 접근

### 7. UI 개선

현재 기본 구조만 구현되어 있습니다. 다음을 개선하세요:

- MUI 또는 Tailwind CSS 적용
- 관리자 대시보드 데이터 연동
- 상가 상세 페이지 디자인
- 반응형 레이아웃

## 개발 워크플로우

### 로컬 개발

```bash
# Next.js 개발 서버
npm run dev

# Workers 개발 서버 (별도 터미널)
npm run worker:dev
```

### 배포

```bash
# Workers 배포
npm run worker:deploy

# Next.js는 Cloudflare Pages에 연결하여 자동 배포
```

## 주요 구현 사항

✅ 프로젝트 구조 설정
✅ D1 데이터베이스 스키마 정의
✅ Workers 기본 구조 및 Cron 핸들러
✅ KV 유틸리티 함수
✅ Slug 생성 로직
✅ 주소 파싱 로직
✅ Next.js App Router 기본 구조
✅ 관리자 페이지 기본 구조
✅ ISR revalidate API

## TODO

- [ ] 공공데이터 API 통합
- [ ] 실제 데이터 수집 로직 구현
- [ ] Next.js와 Workers 통신 구현
- [ ] 관리자 대시보드 데이터 연동
- [ ] 상가 상세 페이지 완성
- [ ] Sitemap 생성 로직
- [ ] IndexNow 통합
- [ ] 에러 처리 및 로깅 개선
- [ ] 테스트 코드 작성

