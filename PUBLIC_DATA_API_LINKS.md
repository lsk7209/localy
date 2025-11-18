# 공공데이터포털 API 문서 링크

## 📚 공공데이터포털 메인

- **공공데이터포털 홈**: https://www.data.go.kr
- **API 활용 가이드**: https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15012888

## 🔍 사용 중인 API

### 소상공인시장진흥공단 - 상가(상권)정보 API

**서비스 ID**: `B553077`

#### API 엔드포인트

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

```bash
# 행정동별 상가 목록 조회
curl "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong?serviceKey=YOUR_API_KEY&key=1168010100&type=json&numOfRows=10&pageNo=1"

# 수정일별 상가 목록 조회
curl "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListByDate?serviceKey=YOUR_API_KEY&key=20250118&type=json&numOfRows=10&pageNo=1"
```

## 🔗 관련 링크

- **소상공인시장진흥공단 홈페이지**: https://www.sbiz.or.kr
- **공공데이터포털 고객센터**: https://www.data.go.kr/help/faqList.do

## 📝 참고 사항

### 인증키 유형

공공데이터포털에서는 두 가지 인증키를 제공합니다:

1. **일반 인증키 (Decoding)**: URL 디코딩 필요
2. **인코딩 키 (Encoding)**: URL 인코딩된 키

현재 코드에서는 일반 인증키를 사용하며, `URLSearchParams`를 통해 자동으로 인코딩됩니다.

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

