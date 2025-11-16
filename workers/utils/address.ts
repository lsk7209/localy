/**
 * 주소 파싱 유틸리티
 * 도로명/지번 주소를 sido/sigungu/dong으로 분리
 */

export interface ParsedAddress {
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  addrRoad: string | null;
  addrJibun: string | null;
}

/**
 * 주소 문자열 파싱
 * 예: "서울특별시 강남구 역삼동 123-45" → { sido: "서울특별시", sigungu: "강남구", dong: "역삼동" }
 */
export function parseAddress(address: string | null | undefined): ParsedAddress {
  if (!address) {
    return {
      sido: null,
      sigungu: null,
      dong: null,
      addrRoad: null,
      addrJibun: null,
    };
  }

  // 기본값
  const result: ParsedAddress = {
    sido: null,
    sigungu: null,
    dong: null,
    addrRoad: address,
    addrJibun: null,
  };

  // 시도 추출 (서울특별시, 부산광역시, 경기도 등)
  const sidoMatch = address.match(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/);
  if (sidoMatch) {
    result.sido = sidoMatch[1];
    address = address.substring(sidoMatch[1].length).trim();
  }

  // 시군구 추출 (시/군/구 단위)
  const sigunguMatch = address.match(/^([가-힣]+(?:시|군|구))/);
  if (sigunguMatch) {
    result.sigungu = sigunguMatch[1];
    address = address.substring(sigunguMatch[1].length).trim();
  }

  // 동 추출 (동/읍/면 단위)
  const dongMatch = address.match(/^([가-힣]+(?:동|읍|면))/);
  if (dongMatch) {
    result.dong = dongMatch[1];
  }

  return result;
}

