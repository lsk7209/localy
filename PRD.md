# **📌 상가 자동수집·정규화·점진 발행 플랫폼 — PRD vFinal (보완반영 완성본 / Cursor 개발용)**

---

# 0. 프로젝트 목적

공공데이터포털 상가(상권)정보 API 기반 데이터를

**수집 → 정규화 → AI 요약/FAQ 생성 → 점진 발행 → 검색 최적화 → 광고수익화를 위한 지역정보 플랫폼**으로 자동 운영한다.

초기 대량 발행은 금지하고 **점진적 발행 패턴**으로 Google 친화도를 최우선한다.

---

# 1. 기술 스택

* Hosting: Cloudflare Pages

* Backend: Cloudflare Workers (Cron + Queue + API routes)

* DB: Cloudflare D1

* KV: Queue + Settings + Fail Queue

* Front: Next.js 14 (App Router + ISR)

* AI: OpenAI API (요약/FAQ 전용)

* Indexing: Sitemap 분할 + IndexNow

---

# 2. 데이터 소스 (SSOT)

### 소상공인시장진흥공단 — 상가(상권)정보 API

* 초기: `storeListInDong`

* 증분: `storeListByDate`

  정책:

* 원본 데이터 오류/누락/중복은 "수정 없이" 그대로 사용

* 모든 원본은 반드시 raw_store에 저장하여 보존

---

# 3. 수집 파이프라인 (Workers + Cron)

## 3.1 초기 수집 Cron (시간당 10개 행정동)

```
0 * * * *
```

Flow:

1. KV `next_dong_index` 읽기

2. 해당 동 10개 호출

3. 응답 raw_json → `raw_store` INSERT OR IGNORE

4. 실패 요청 → `fetch_fail_queue` push

5. next_dong_index += 10 저장

---

## 3.2 증분 수집 Cron (1시간, 50~100개)

```
30 * * * *
```

Flow:

1. KV `last_mod_date`

2. API 수정일 기준 호출

3. raw_store UPsert

4. 실패시 fetch_fail_queue push

5. last_mod_date 갱신

---

## 3.3 재시도 워커 (실패 큐 정리)

```
*/15 * * * *
```

개선된 정책:

* KV 저장 시 `{ payload, retry_count }` 구조

* 실패 시 `retry_count < 3` 이면 재삽입

* `retry_count >= 3`이면 `dead_fail_queue`로 이동(영구 실패 큐)

* 관리자페이지에서 경고 표시

---

# **4. DB Schema (관계 명시 / FK 추가)**

## 4.1 raw_store (원본)

```sql
CREATE TABLE raw_store (
  source_id TEXT PRIMARY KEY,
  name_raw TEXT,
  addr_raw TEXT,
  category_raw TEXT,
  lat REAL,
  lng REAL,
  raw_json TEXT,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4.2 biz_place (정규화된 표시용)

```sql
CREATE TABLE biz_place (
  id TEXT PRIMARY KEY,            -- UUID
  source_id TEXT UNIQUE,
  name TEXT,
  addr_road TEXT,
  addr_jibun TEXT,
  sido TEXT,
  sigungu TEXT,
  dong TEXT,
  category TEXT,
  lat REAL,
  lng REAL,
  status TEXT,
  license_date TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4.3 biz_meta (발행/AI/Slug)

```sql
CREATE TABLE biz_meta (
  biz_id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  ai_summary TEXT,
  ai_faq TEXT,
  is_publishable INTEGER,   -- 0/1
  last_published_at TIMESTAMP,
  FOREIGN KEY (biz_id) REFERENCES biz_place(id)
);
```

---

# **4.5 정규화 워커 (누락된 핵심 보완)**

**이 단계는 필수이며, 수집 → 발행 사이의 Missing Link를 메운다.**

Cron:

```
*/10 * * * *
```

Flow:

1. raw_store 중 아직 biz_place에 존재하지 않는 source_id 100개 조회

2. 정규화 로직 수행

   * 주소 파싱(도로명/지번 → sido/sigungu/dong)

   * category_raw → category (1:1 매핑 또는 원본 그대로)

   * lat/lng 가져오기

3. biz_place INSERT

4. biz_meta INSERT (초기값)

   * biz_id (UUID)

   * slug = null

   * ai_summary = null

   * ai_faq = null

   * is_publishable = 0

정규화가 끝나야 발행 후보가 될 수 있다.

---

# **5. Slug 생성 규칙 (보완된 명시 규칙)**

Slug는 **정규화 워커**에서 최초 생성.

규칙:

* 기본 형식: `{name}-{dong}` → 예: `스타벅스-역삼동`

* slug는 소문자, 공백→하이픈, 특수문자 제거

* 중복 발생 시 slug 뒤에 `-xxxx` (4자리 해시) 추가

* 저장 시 반드시 UNIQUE 제약 조건 검사

---

# **6. AI 생성 정책 (보완: is_publishable 전환 포함)**

Cron:

```
*/20 * * * *
```

Flow (보완 이후 정확한 로직):

1. `biz_meta`에서

   * `is_publishable = 0`

   * `ai_summary IS NULL`

     인 1건 선택

2. OpenAI로 요약/FAQ 생성

3. 생성 성공 시 UPDATE

   * ai_summary, ai_faq 저장

   * is_publishable = 1 로 변경 → **발행 가능 상태 진입**

4. 실패 시 템플릿 문장으로 ai_summary만 넣고 is_publishable=1

---

# **7. 발행 정책 (최종 보완안)**

발행 로직은 "is_publishable=1 AND last_published_at IS NULL"만 대상으로 한다.

## 발행 Cron (초기 3시간마다)

```
0 */3 * * *
```

Flow (보완 적용):

1. 발행할 biz_id 조회

2. slug가 null이면 slug 생성 (중복검사 포함)

3. Next.js ISR on-demand revalidate 호출

4. `last_published_at` 기록

5. sitemap 분할 갱신

6. IndexNow ping

---

# 8. 페이지 템플릿 규칙 (변동 없음)

**상세 페이지 `/shop/[slug]`**

* 상호/주소/업종 헤더

* 공공데이터 정보표(필드 없는 건 "공공데이터 미제공")

* AI 요약

* AI FAQ

* 지역/업종 내부 링크

* 출처 표기

**리스트 / 허브 페이지**

* 업종·지역 기반 리스트

* 상가 ≥ 3개 / ≥ 10개 조건 충족 시 index

---

# 9. 인덱싱 정책

* 상세: index

* 리스트: 상가≥3개 index

* 허브: 상가≥10개 index

* sitemap 분할(10k 단위) 하루 1회 갱신

* IndexNow: 발행 성공 URL만 ping

---

# **10. 관리자페이지 (v1 최소 스코프 + 확장 스펙 정의)**

**회원/로그인 없음**

Cloudflare Access로 보호.

라우트:

* `/admin` 대시보드(요약만)

* `/admin/jobs` (수집/발행/AI 로그)

* `/admin/settings` (API 키, 발행량, AI ON/OFF)

* `/admin/analytics` (Phase 2, v1에서는 제외 가능)

## v1 필수 구현:

* settings 페이지

* jobs 페이지

* dashboard 기본 요약 카드 4개

## Phase 2(optional):

* 방문자 트래픽 차트

* 지역/업종 트렌드

* 색인/크롤링 리포트

---

# **11. 오류·예외 정책 (보완됨)**

* API 실패 → fetch_fail_queue

* retry_count ≥ 3 → dead_fail_queue

* 주소/lat/lng 누락 → null 저장, 화면에서 "공공데이터 미제공" 표시

* AI 실패 → 템플릿 fallback

* ISR 실패 → 1회 재시도 후 dead_fail_queue

---

# **12. 최종 요약**

**전체 데이터 흐름**

수집 → 정규화 → (`biz_place`,`biz_meta`) 생성 → AI 요약/FAQ → is_publishable=1 → 점진 발행 → sitemap/indexnow → 통계/로그 확인.

**핵심 보완요소 포함됨:**

* 정규화 워커

* 발행 가능 플래그 트리거

* 슬러그 규칙

* 재시도 정책

* FK 명시

이 문서를 그대로 Cursor에 붙여넣으면

Cloudflare Workers + D1 + KV + Next.js 기반의 전체 자동화 플랫폼을

정확한 형태로 스캐폴딩할 수 있다.

---

