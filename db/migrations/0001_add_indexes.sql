-- 성능 최적화를 위한 인덱스 추가

-- biz_place 테이블 인덱스
-- 지역별 필터링 최적화 (sido, sigungu, dong)
CREATE INDEX IF NOT EXISTS idx_biz_place_sido ON biz_place(sido);
CREATE INDEX IF NOT EXISTS idx_biz_place_sigungu ON biz_place(sigungu);
CREATE INDEX IF NOT EXISTS idx_biz_place_dong ON biz_place(dong);

-- 복합 인덱스: 지역별 조회 성능 향상
CREATE INDEX IF NOT EXISTS idx_biz_place_region ON biz_place(sido, sigungu, dong);

-- 카테고리 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_biz_place_category ON biz_place(category);

-- 지역 + 카테고리 복합 인덱스 (지역별 카테고리 통계 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_biz_place_region_category ON biz_place(sido, sigungu, dong, category);

-- 업데이트 시간 인덱스 (최신 데이터 조회)
CREATE INDEX IF NOT EXISTS idx_biz_place_updated_at ON biz_place(updated_at);

-- biz_meta 테이블 인덱스
-- 발행 시간 정렬 최적화 (상가 목록 정렬에 사용)
CREATE INDEX IF NOT EXISTS idx_biz_meta_last_published_at ON biz_meta(last_published_at);

-- 발행 가능 여부 필터링 최적화 (발행 워커에서 사용)
CREATE INDEX IF NOT EXISTS idx_biz_meta_is_publishable ON biz_meta(is_publishable);

-- 발행 가능 + 발행 시간 복합 인덱스 (발행 워커 최적화)
CREATE INDEX IF NOT EXISTS idx_biz_meta_publishable_published ON biz_meta(is_publishable, last_published_at);

-- raw_store 테이블 인덱스
-- 수집 시간 기반 쿼리 최적화 (오늘 수집된 데이터 조회 등)
CREATE INDEX IF NOT EXISTS idx_raw_store_fetched_at ON raw_store(fetched_at);

-- 좌표 기반 검색을 위한 인덱스 (향후 지도 기반 검색 기능 확장 시)
CREATE INDEX IF NOT EXISTS idx_biz_place_location ON biz_place(lat, lng);
