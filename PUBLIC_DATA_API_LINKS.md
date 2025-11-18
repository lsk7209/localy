# 공공데이터포털 API 문서 링크

## 📚 공공데이터포털 메인

- **공공데이터포털 홈**: https://www.data.go.kr
- **API 활용 가이드**: https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012888

## 🔍 사용 중인 API

### 소상공인시장진흥공단 - 상가(상권)정보 API

**서비스 ID**: `B553077`  
**Namespace**: `15083033`  
**Base URL**: `api.odcloud.kr/api`

#### Swagger API 문서

- **Swagger 문서**: https://infuser.odcloud.kr/oas/docs?namespace=15083033/v1
- **API 엔드포인트**: `/15083033/v1/uddi:c7049f5a-d95e-4143-be96-b4d3c16130ee`
- **데이터명**: 소상공인시장진흥공단_상가(상권)정보_20171120

#### 인증키

공공데이터포털에서 제공하는 두 가지 인증키:

1. **일반 인증키 (Encoding)**: URL 인코딩된 키
   - 예: `Dc%2Bm2FOHT2MQxGmXnBE3Qbuw9V4H4hJB8nKKOL6JWfWYK0Tc48AwXm7AkzGDREokxi%2BG1LeRUrqQG6NagZQ%2BAA%3D%3D`
   - URL 파라미터로 직접 사용 가능
   - **권장**: 이 키를 사용하면 추가 인코딩 불필요

2. **일반 인증키 (Decoding)**: 디코딩된 원본 키
   - 예: `Dc+m2FOHT2MQxGmXnBE3Qbuw9V4H4hJB8nKKOL6JWfWYK0Tc48AwXm7AkzGDREokxi+G1LeRUrqQG6NagZQ+AA==`
   - `URLSearchParams`를 통해 자동 인코딩 필요

**권장사항**: Encoding 키를 사용하거나, Decoding 키를 사용할 경우 `URLSearchParams`를 통해 자동 인코딩

**현재 코드**: `URLSearchParams`를 사용하므로 Decoding 키도 자동으로 인코딩됩니다.

#### API 엔드포인트 (레거시 - 현재 코드에서 사용 중)

1. **행정동별 상가 목록 조회**
   - URL: `https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong`
   - 용도: 초기 수집 (행정동별 전체 데이터)
   - 파라미터:
     - `serviceKey`: 인증키 (필수)
     - `key`: 행정동 코드 (10자리)
     - `type`: 응답 형식 (json/xml)
     - `numOfRows`: 페이지당 행 수 (기본: 1000)
     - `pageNo`: 페이지 번호

2. **수정일별 상가 목록 조회**
   - URL: `https://apis.data.go.kr/B553077/api/open/sdsc2/storeListByDate`
   - 용도: 증분 수집 (변경된 데이터만)
   - 파라미터:
     - `serviceKey`: 인증키 (필수)
     - `key`: 수정일 (YYYYMMDD 형식)
     - `type`: 응답 형식 (json/xml)
     - `numOfRows`: 페이지당 행 수 (기본: 1000)
     - `pageNo`: 페이지 번호

#### API 상세 문서

- **공공데이터포털 상세 페이지**: 
  - 직접 검색: https://www.data.go.kr → "소상공인시장진흥공단 상가정보" 검색
  - 또는 서비스 ID로 검색: `B553077`
- **Swagger 문서**: https://infuser.odcloud.kr/oas/docs?namespace=15083033/v1

#### API 활용 신청

1. **공공데이터포털 회원가입**
   - https://www.data.go.kr/iim/api/selectAPIAcountView.do

2. **API 활용신청**
   - 검색: "소상공인시장진흥공단 상가정보" 또는 "B553077"
   - 상세 페이지에서 "활용신청" 클릭
   - 신청 정보 입력 후 승인 대기

3. **인증키 발급**
   - 마이페이지 → "활용신청 현황"에서 승인 확인
   - "인증키" 확인 및 복사
   - Cloudflare Pages에서 `PUBLIC_DATA_API_KEY`로 설정

## 📖 일반 API 문서

### 공공데이터포털 API 가이드

- **오픈 API 활용 가이드**: https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do
- **API 표준 가이드**: https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012888

### API 호출 예시

#### 레거시 API (현재 코드에서 사용 중)

```bash
# 행정동별 상가 목록 조회
curl "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong?serviceKey=YOUR_API_KEY&key=1168010100&type=json&numOfRows=10&pageNo=1"

# 수정일별 상가 목록 조회
curl "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListByDate?serviceKey=YOUR_API_KEY&key=20250118&type=json&numOfRows=10&pageNo=1"
```

#### 새로운 Open API (Swagger 문서 참고)

```bash
# Base URL: api.odcloud.kr/api
# 엔드포인트: /15083033/v1/uddi:c7049f5a-d95e-4143-be96-b4d3c16130ee
# 인증키는 serviceKey 파라미터로 전달

# 예시 (Swagger 문서에서 정확한 파라미터 확인 필요)
curl "https://api.odcloud.kr/api/15083033/v1/uddi:c7049f5a-d95e-4143-be96-b4d3c16130ee?serviceKey=YOUR_ENCODED_API_KEY"
```

**참고**: 새로운 Open API의 정확한 사용법은 Swagger 문서를 확인하세요: https://infuser.odcloud.kr/oas/docs?namespace=15083033/v1

#### API 버전 선택

코드에서 레거시 API와 새로운 Open API를 모두 지원합니다.

- **기본값**: 레거시 API 사용 (`https://apis.data.go.kr/B553077/api/open/sdsc2/`)
- **새로운 Open API 사용**: 환경 변수 `PUBLIC_DATA_API_VERSION=open` 설정

**주의**: 새로운 Open API는 Swagger 문서를 확인하여 정확한 파라미터를 사용해야 합니다. 현재는 레거시 API와 유사한 구조를 가정합니다.

## 🔗 관련 링크

- **소상공인시장진흥공단 홈페이지**: https://www.sbiz.or.kr
- **공공데이터포털 고객센터**: https://www.data.go.kr/help/faqList.do

## 📝 참고 사항

### 인증키 유형

공공데이터포털에서는 두 가지 인증키를 제공합니다:

1. **일반 인증키 (Encoding)**: URL 인코딩된 키
   - URL 파라미터로 직접 사용 가능
   - 특수문자가 이미 인코딩되어 있음 (`%2B`, `%3D` 등)
   - 권장: 이 키를 사용하면 추가 인코딩 불필요

2. **일반 인증키 (Decoding)**: 디코딩된 원본 키
   - `+`, `=` 등의 특수문자가 포함됨
   - `URLSearchParams`를 통해 자동으로 인코딩 필요
   - 현재 코드에서는 이 방식을 사용 중

**권장사항**: 
- Encoding 키를 사용하는 것이 더 안전하고 편리합니다
- Decoding 키를 사용할 경우 `URLSearchParams`를 통해 자동 인코딩됩니다

### API 제한사항

- **일일 호출 제한**: API별로 상이 (일반적으로 1,000~10,000건/일)
- **응답 형식**: JSON 또는 XML 선택 가능
- **페이지네이션**: `numOfRows`와 `pageNo`로 제어

### 행정동 코드 형식

- **10자리 코드**: 시도(2) + 시군구(3) + 읍면동(5)
- 예시: `1168010100` (서울특별시 강남구 역삼동)

## 🛠 문제 해결

### API 키 오류

- 인증키가 올바르게 설정되었는지 확인
- 인증키에 공백이나 특수문자가 포함되지 않았는지 확인
- 공공데이터포털에서 API 활용신청이 승인되었는지 확인

### 응답 오류

- API 서비스 상태 확인: https://www.data.go.kr
- 파라미터 형식 확인 (행정동 코드, 날짜 형식 등)
- 일일 호출 제한 초과 여부 확인

