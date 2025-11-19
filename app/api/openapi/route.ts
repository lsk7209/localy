port { NextResponse } from 'next/server';

/**
 * OpenAPI 3.0 스펙 정의
 */
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'LOCARRY API',
    version: '1.0.0',
    description: '공공데이터 기반 상가 정보 수집 및 발행 시스템 API',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      description: 'Production server',
    },
  ],
  paths: {
    '/api/shops': {
      get: {
        summary: '상가 목록 조회',
        description: '검색, 필터링, 페이지네이션을 지원하는 상가 목록 API',
        tags: ['Shops'],
        parameters: [
          {
            name: 'search',
            in: 'query',
            description: '검색어 (상호명, 업종, 주소)',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'category',
            in: 'query',
            description: '카테고리 필터',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'region',
            in: 'query',
            description: 'Region filter (dong, sigungu, sido)',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'page',
            in: 'query',
            description: '페이지 번호',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
              minimum: 1,
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: '페이지당 항목 수',
            required: false,
            schema: {
              type: 'integer',
              default: 20,
              minimum: 1,
              maximum: 100,
            },
          },
          {
            name: 'sortBy',
            in: 'query',
            description: '정렬 기준',
            required: false,
            schema: {
              type: 'string',
              enum: ['name', 'latest'],
              default: 'name',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    shops: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/ShopListItem',
                      },
                    },
                    pagination: {
                      $ref: '#/components/schemas/Pagination',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: '잘못된 요청',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/shop/{slug}': {
      get: {
        summary: '상가 상세 정보 조회',
        description: 'Slug를 기반으로 상가의 상세 정보를 조회합니다',
        tags: ['Shops'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: '상가 Slug',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ShopDetail',
                },
              },
            },
          },
          '400': {
            description: '잘못된 Slug 형식',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '404': {
            description: '상가를 찾을 수 없음',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/region/{name}': {
      get: {
        summary: 'Get region statistics',
        description: 'Get store statistics by region (dong, sigungu, sido)',
        tags: ['Regions'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Region name',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RegionStats',
                },
              },
            },
          },
          '400': {
            description: '잘못된 지역명 형식',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        summary: '관리자 통계 조회',
        description: '대시보드용 통계 정보를 조회합니다',
        tags: ['Admin'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminStats',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/jobs': {
      get: {
        summary: '작업 로그 조회',
        description: '워커 작업 로그를 조회합니다',
        tags: ['Admin'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/JobLog',
                      },
                    },
                  },
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/settings': {
      get: {
        summary: '설정 조회',
        description: '시스템 설정을 조회합니다',
        tags: ['Admin'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Settings',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      post: {
        summary: '설정 저장',
        description: '시스템 설정을 저장합니다',
        tags: ['Admin'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  aiEnabled: {
                    type: 'boolean',
                    description: 'AI generation enabled',
                  },
                  publishRateLimit: {
                    type: 'integer',
                    description: 'Publish rate limit',
                    minimum: 1,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/revalidate': {
      post: {
        summary: 'ISR 재검증',
        description: '특정 페이지의 ISR 캐시를 재검증합니다',
        tags: ['ISR'],
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slug'],
                properties: {
                  slug: {
                    type: 'string',
                    description: '재검증할 상가 Slug',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    revalidated: {
                      type: 'boolean',
                    },
                    slug: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: '잘못된 요청',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '401': {
            description: '인증 실패',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit 초과',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RateLimitError',
                },
              },
            },
          },
          '500': {
            description: '서버 오류',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer 토큰 인증 (관리자 API 및 ISR 재검증용)',
      },
    },
    schemas: {
      ShopListItem: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '상가 ID',
          },
          slug: {
            type: 'string',
            nullable: true,
            description: '상가 Slug',
          },
          name: {
            type: 'string',
            nullable: true,
            description: '상가명',
          },
          category: {
            type: 'string',
            nullable: true,
            description: '카테고리',
          },
          address: {
            type: 'string',
            nullable: true,
            description: '주소',
          },
          sido: {
            type: 'string',
            nullable: true,
            description: '시도',
          },
          sigungu: {
            type: 'string',
            nullable: true,
            description: '시군구',
          },
          dong: {
            type: 'string',
            nullable: true,
            description: '동',
          },
          lastPublishedAt: {
            type: 'integer',
            nullable: true,
            description: 'Last published time (Unix timestamp)',
          },
        },
      },
      ShopDetail: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '상가 ID',
          },
          slug: {
            type: 'string',
            description: '상가 Slug',
          },
          name: {
            type: 'string',
            nullable: true,
            description: '상가명',
          },
          category: {
            type: 'string',
            nullable: true,
            description: '카테고리',
          },
          address: {
            type: 'string',
            nullable: true,
            description: '주소',
          },
          addrRoad: {
            type: 'string',
            nullable: true,
            description: '도로명 주소',
          },
          addrJibun: {
            type: 'string',
            nullable: true,
            description: '지번 주소',
          },
          sido: {
            type: 'string',
            nullable: true,
            description: '시도',
          },
          sigungu: {
            type: 'string',
            nullable: true,
            description: '시군구',
          },
          dong: {
            type: 'string',
            nullable: true,
            description: '동',
          },
          lat: {
            type: 'number',
            nullable: true,
            description: '위도',
          },
          lng: {
            type: 'number',
            nullable: true,
            description: '경도',
          },
          status: {
            type: 'string',
            nullable: true,
            description: '영업 상태',
          },
          licenseDate: {
            type: 'string',
            nullable: true,
            description: '인허가일',
          },
          summary: {
            type: 'string',
            nullable: true,
            description: 'AI generated summary',
          },
          faq: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                },
                answer: {
                  type: 'string',
                },
              },
            },
            description: 'AI generated FAQ',
          },
          lastPublishedAt: {
            type: 'integer',
            nullable: true,
            description: 'Last published time (Unix timestamp)',
          },
        },
      },
      RegionStats: {
        type: 'object',
        properties: {
          regionName: {
            type: 'string',
            description: 'Region name',
          },
          totalStores: {
            type: 'integer',
            description: '총 상가 수',
          },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                count: {
                  type: 'integer',
                },
                percentage: {
                  type: 'string',
                },
              },
            },
            description: '카테고리별 통계',
          },
          mainCategories: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: '주요 카테고리 목록',
          },
        },
      },
      AdminStats: {
        type: 'object',
        properties: {
          totalStores: {
            type: 'integer',
            description: '전체 상가 수',
          },
          todayNewFetched: {
            type: 'integer',
            description: '오늘 신규 수집 수',
          },
          todayUpdated: {
            type: 'integer',
            description: '오늘 업데이트 수',
          },
          todayPublished: {
            type: 'integer',
            description: '오늘 발행 수',
          },
          totalPublished: {
            type: 'integer',
            description: 'Total published count',
          },
          publishedStores: {
            type: 'integer',
            description: 'Published stores count',
          },
          pendingPublish: {
            type: 'integer',
            description: 'Pending publish count',
          },
          publishedLast7Days: {
            type: 'integer',
            description: 'Published count in last 7 days',
          },
          totalRegions: {
            type: 'integer',
            description: 'Total regions count',
          },
          lastUpdated: {
            type: 'string',
            nullable: true,
            format: 'date-time',
            description: 'Last updated time',
          },
        },
      },
      Settings: {
        type: 'object',
        properties: {
          aiEnabled: {
            type: 'boolean',
            description: 'AI 생성 활성화 여부',
          },
          publishRateLimit: {
            type: 'integer',
            description: '발행 속도 제한',
          },
          nextDongIndex: {
            type: 'integer',
            description: 'Next dong index',
          },
          lastModDate: {
            type: 'string',
            description: '마지막 수정일',
          },
        },
      },
      JobLog: {
        type: 'object',
        properties: {
          worker: {
            type: 'string',
            description: '워커 이름',
          },
          success: {
            type: 'boolean',
            description: '성공 여부',
          },
          count: {
            type: 'integer',
            description: '처리된 항목 수',
          },
          duration: {
            type: 'integer',
            description: '실행 시간 (ms)',
          },
          error: {
            type: 'string',
            nullable: true,
            description: '에러 메시지',
          },
          timestamp: {
            type: 'integer',
            description: '타임스탬프 (Unix timestamp)',
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: '현재 페이지',
          },
          limit: {
            type: 'integer',
            description: '페이지당 항목 수',
          },
          total: {
            type: 'integer',
            description: '전체 항목 수',
          },
          totalPages: {
            type: 'integer',
            description: '전체 페이지 수',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: '에러 메시지',
          },
        },
      },
      RateLimitError: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'Too many requests',
          },
          message: {
            type: 'string',
            description: '상세 메시지',
          },
          retryAfter: {
            type: 'integer',
            nullable: true,
            description: 'Retry available time (seconds)',
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Shops',
      description: 'Store related API',
    },
    {
      name: 'Regions',
      description: 'Region related API',
    },
    {
      name: 'Admin',
      description: 'Admin API (authentication required)',
    },
    {
      name: 'ISR',
      description: 'ISR 재검증 API (인증 필요)',
    },
  ],
};

/**
 * OpenAPI 스펙 제공 API
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

