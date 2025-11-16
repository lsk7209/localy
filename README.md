# 21_localy

공공데이터 기반 상가 정보 수집 및 발행 시스템

## 📋 프로젝트 개요

공공데이터포털의 상가(상권)정보 API를 활용하여 데이터를 수집, 정규화, AI 요약/FAQ 생성 후 점진적으로 발행하는 자동화 플랫폼입니다.

## 🛠 기술 스택

- **Frontend**: Next.js 15 (App Router + ISR)
- **Backend**: Cloudflare Workers (Cron + Queue)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (Settings, Queues)
- **ORM**: Drizzle ORM
- **AI**: OpenAI API (요약/FAQ 생성)
- **UI**: Material-UI (MUI)
- **Deployment**: Cloudflare Pages + Workers

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18+ 
- npm 또는 yarn
- Cloudflare 계정

### 설치

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# Workers 개발 서버 실행 (별도 터미널)
npm run worker:dev
```

### 환경 변수 설정

`.env.local` 파일 생성:

```env
# OpenAI API (선택사항)
OPENAI_API_KEY=your_openai_api_key

# 공공데이터 API (필수)
PUBLIC_DATA_API_KEY=your_public_data_api_key

# Next.js URL (선택사항)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📚 문서

- [배포 가이드](./DEPLOYMENT.md) - Cloudflare 배포 방법
- [개발 가이드](./DEVELOPMENT.md) - 개발 환경 설정 및 워크플로우
- [코드 리뷰](./CODE_REVIEW.md) - 코드 품질 및 개선 사항
- [PRD](./PRD.md) - 프로젝트 요구사항 문서

## 🏗 프로젝트 구조

```
21_localy/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── admin/             # 관리자 페이지
│   ├── shop/              # 상가 상세 페이지
│   └── region/            # 지역별 페이지
├── workers/               # Cloudflare Workers
│   ├── cron/              # Cron 워커 핸들러
│   ├── queue/             # Queue 핸들러
│   ├── utils/             # 유틸리티 함수
│   └── index.ts           # 메인 엔트리 포인트
├── db/                    # 데이터베이스
│   ├── schema.ts          # Drizzle 스키마
│   └── migrations/        # 마이그레이션 파일
└── lib/                   # 공유 라이브러리
```

## 🔄 데이터 파이프라인

1. **수집** → 공공데이터 API에서 상가 정보 수집
2. **정규화** → raw_store를 biz_place와 biz_meta로 변환
3. **AI 생성** → OpenAI로 요약 및 FAQ 생성
4. **발행** → 점진적으로 페이지 발행 (ISR)
5. **인덱싱** → Sitemap 갱신 및 IndexNow ping

## 📝 주요 기능

- ✅ 자동 데이터 수집 (초기/증분)
- ✅ 데이터 정규화 및 중복 제거
- ✅ AI 기반 요약 및 FAQ 생성
- ✅ 점진적 페이지 발행
- ✅ 관리자 대시보드
- ✅ 실패 큐 및 재시도 메커니즘
- ✅ 모니터링 및 메트릭 수집

## 🧪 개발 스크립트

```bash
# Next.js 개발
npm run dev              # 개발 서버 실행
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버 실행
npm run lint             # 린팅

# Workers 개발
npm run worker:dev       # Workers 개발 서버
npm run worker:deploy    # Workers 배포

# 데이터베이스
npm run db:generate      # 마이그레이션 생성
npm run db:migrate       # 로컬 마이그레이션 실행
npm run db:migrate:prod  # 프로덕션 마이그레이션 실행

**주의**: 인덱스 마이그레이션(`0001_add_indexes.sql`)은 프로덕션 배포 전에 반드시 실행해야 합니다.
```

## 📖 API 엔드포인트

### Next.js API

- `GET /api/shops` - 상가 목록 조회 (검색, 필터링, 페이지네이션)
- `GET /api/shop/[slug]` - 상가 상세 정보
- `GET /api/region/[name]` - 지역별 통계 조회
- `POST /api/revalidate` - ISR 재검증 (인증 필요)
- `GET /api/admin/stats` - 관리자 통계 (인증 필요)
- `GET /api/admin/jobs` - 작업 로그 (인증 필요)
- `GET /api/admin/settings` - 설정 조회 (인증 필요)
- `POST /api/admin/settings` - 설정 저장 (인증 필요)
- `GET /api/openapi` - OpenAPI 스펙 (JSON)
- `GET /api/docs` - API 문서 (Swagger UI)

### Workers API

- `GET /health` - Health check 및 환경 변수 검증

### API 문서

- Swagger UI: `/api/docs` - 인터랙티브 API 문서
- OpenAPI 스펙: `/api/openapi` - OpenAPI 3.0 JSON 스펙

## 🔐 보안

- API 엔드포인트 인증 (Bearer Token)
- 환경 변수 검증
- Cloudflare Access로 관리자 페이지 보호 (권장)

## 📊 모니터링

- 구조화된 로깅 (JSON 형식)
- 메트릭 수집 (KV 저장)
- 에러 알림 시스템
- 관리자 대시보드 통계

## 🤝 기여

이슈 및 풀 리퀘스트를 환영합니다.

## 📄 라이선스

MIT License
