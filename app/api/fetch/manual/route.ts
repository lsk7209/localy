import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '../../types';
import { logger } from '@/workers/utils/logger';
import type { Env } from '@/workers/types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { count } from 'drizzle-orm';
import { fetchStoreListInDong, fetchStoreListByDate, formatDateForApi } from '@/workers/utils/public-data-api';
import { prepareStoreForInsert, upsertStoresIndividually } from '@/workers/utils/store-processing';
import { chunkArray, D1_BATCH_LIMITS, withTimeout } from '@/workers/utils/performance';

/**
 * 수동 수집 API
 * 
 * 특정 행정동 코드나 날짜를 지정하여 공공데이터를 수집하고 데이터베이스에 저장합니다.
 * 
 * @example
 * POST /api/fetch/manual
 * Body: { "type": "dong", "dongCode": "1168010100", "maxPages": 10 }
 * 또는
 * Body: { "type": "date", "date": "20250119", "maxPages": 10 }
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Manual fetch API called', {
      timestamp: new Date().toISOString(),
    });
    
    const env = getCloudflareEnv();
    
    // API 키 검증 (선택사항)
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');
    const expectedKey = env.REVALIDATE_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!env?.DB || !env?.SETTINGS) {
      return NextResponse.json(
        { error: 'Database or Settings KV not available' },
        { status: 503 }
      );
    }

    // 요청 본문 파싱
    let body: { type?: string; dongCode?: string; date?: string; maxPages?: number } = {};
    try {
      body = await request.json();
    } catch (jsonError) {
      logger.warn('Failed to parse request body', {
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
      });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { type, dongCode, date, maxPages = 10 } = body;

    logger.info('Manual fetch request received', {
      type,
      hasDongCode: !!dongCode,
      hasDate: !!date,
      maxPages,
    });

    if (!type || (type !== 'dong' && type !== 'date')) {
      logger.warn('Invalid type in manual fetch request', { type });
      return NextResponse.json(
        { error: 'Invalid type. Must be "dong" or "date"' },
        { status: 400 }
      );
    }

    if (type === 'dong' && !dongCode) {
      logger.warn('Missing dongCode in manual fetch request', { type });
      return NextResponse.json(
        { error: 'dongCode is required when type is "dong"' },
        { status: 400 }
      );
    }

    if (type === 'date' && !date) {
      logger.warn('Missing date in manual fetch request', { type });
      return NextResponse.json(
        { error: 'date is required when type is "date"' },
        { status: 400 }
      );
    }

    // maxPages 유효성 검증 (Cloudflare Pages 타임아웃 방지를 위해 최대 10페이지로 제한)
    const validatedMaxPages = Math.max(1, Math.min(10, Number(maxPages) || 5));
    
    logger.info('Manual fetch parameters validated', {
      type,
      validatedMaxPages,
      dongCode: type === 'dong' ? dongCode : undefined,
      date: type === 'date' ? date : undefined,
    });

    // 공공데이터 API 키 검증
    const publicDataApiKey = env.PUBLIC_DATA_API_KEY;
    if (!publicDataApiKey) {
      logger.warn('Public Data API key not configured in manual fetch API');
      return NextResponse.json(
        { error: 'Public Data API key not configured' },
        { status: 503 }
      );
    }

    // ExecutionContext 모의 객체 생성
    const ctx: ExecutionContext = {
      waitUntil: (promise: Promise<unknown>) => {
        promise.catch((error) => {
          logger.error('waitUntil promise failed', {}, error instanceof Error ? error : new Error(String(error)));
        });
      },
      passThroughOnException: () => {},
    } as ExecutionContext;

    const db = drizzle(env.DB, { schema });
    
    // 수집 전 데이터베이스 카운트 확인
    let beforeCountValue = 0;
    try {
      const beforeCount = await db
        .select({ count: count() })
        .from(schema.rawStore)
        .get();
      beforeCountValue = beforeCount?.count || 0;
    } catch (dbError) {
      logger.warn('Failed to get before count, using 0', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    let totalInserted = 0;
    let pagesProcessed = 0;
    const errors: Array<{ page: number; error: string }> = [];

    try {
      if (type === 'dong') {
        // 행정동별 수집
        // dongCode는 이미 검증되었으므로 string으로 단언 가능
        const validatedDongCode = dongCode as string;
        
        logger.info('Manual fetch by dong code', {
          dongCode: validatedDongCode,
          maxPages: validatedMaxPages,
        });

        let pageNo = 1;
        let hasMore = true;

        while (hasMore && pageNo <= validatedMaxPages) {
          try {
            const stores = await withTimeout(
              fetchStoreListInDong(validatedDongCode, publicDataApiKey, pageNo),
              20000,
              `API timeout for dong ${validatedDongCode}, page ${pageNo}`
            );

            if (stores.length === 0) {
              hasMore = false;
              break;
            }

            // 데이터 준비 및 검증
            const insertValues = stores
              .map((store) => {
                const prepared = prepareStoreForInsert(store);
                if (!prepared.sourceId || prepared.sourceId.trim() === '') {
                  logger.warn('Store missing sourceId', {
                    dongCode: validatedDongCode,
                    pageNo,
                    store: JSON.stringify(store).substring(0, 200),
                  });
                  return null;
                }
                return prepared;
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);

            if (insertValues.length > 0) {
              // 배치 INSERT
              const chunks = chunkArray(insertValues, D1_BATCH_LIMITS.MAX_INSERT_ROWS);
              
              for (const chunk of chunks) {
                try {
                  await db.insert(schema.rawStore).values(chunk).onConflictDoNothing();
                  totalInserted += chunk.length;
                } catch (insertError) {
                  // 배치 INSERT 실패 시 개별 UPSERT로 폴백
                  const successCount = await upsertStoresIndividually(
                    db,
                    chunk,
                    (sourceId, error) => {
                      logger.error('Failed to insert store', {
                        sourceId,
                        error: error.message,
                      });
                    }
                  );
                  totalInserted += successCount;
                }
              }
            }

            pagesProcessed++;
            pageNo++;

            // 다음 페이지가 없으면 종료
            if (stores.length < 1000) {
              hasMore = false;
            }
          } catch (pageError) {
            const errorMessage = pageError instanceof Error ? pageError.message : String(pageError);
            errors.push({ page: pageNo, error: errorMessage });
            logger.error('Failed to fetch page', {
              dongCode: validatedDongCode,
              pageNo,
              error: errorMessage,
            });
            pageNo++;
            // 에러가 발생해도 다음 페이지 시도
          }
        }
      } else if (type === 'date') {
        // 날짜별 증분 수집
        // date는 이미 검증되었으므로 string으로 단언 가능
        const validatedDate = date as string;
        
        // date는 이미 YYYYMMDD 형식이므로 formatDateForApi는 필요 없음
        // 하지만 formatDateForApi는 Date 객체나 문자열을 받을 수 있으므로 사용 가능
        let formattedDate: string;
        if (validatedDate.length === 8 && /^\d{8}$/.test(validatedDate)) {
          // 이미 YYYYMMDD 형식인 경우
          formattedDate = validatedDate;
        } else {
          // 다른 형식인 경우 변환
          formattedDate = formatDateForApi(validatedDate);
        }
        logger.info('Manual fetch by date', {
          date: formattedDate,
          maxPages: validatedMaxPages,
        });

        let pageNo = 1;
        let hasMore = true;

        while (hasMore && pageNo <= validatedMaxPages) {
          try {
            const stores = await withTimeout(
              fetchStoreListByDate(formattedDate, publicDataApiKey, pageNo),
              20000,
              `API timeout for date ${formattedDate}, page ${pageNo}`
            );

            if (stores.length === 0) {
              hasMore = false;
              break;
            }

            // 데이터 준비 및 검증
            const insertValues = stores
              .map((store) => {
                const prepared = prepareStoreForInsert(store);
                if (!prepared.sourceId || prepared.sourceId.trim() === '') {
                  logger.warn('Store missing sourceId', {
                    date: formattedDate,
                    pageNo,
                    store: JSON.stringify(store).substring(0, 200),
                  });
                  return null;
                }
                return prepared;
              })
              .filter((item): item is NonNullable<typeof item> => item !== null);

            if (insertValues.length > 0) {
              // 배치 INSERT
              const chunks = chunkArray(insertValues, D1_BATCH_LIMITS.MAX_INSERT_ROWS);
              
              for (const chunk of chunks) {
                try {
                  await db.insert(schema.rawStore).values(chunk).onConflictDoNothing();
                  totalInserted += chunk.length;
                } catch (insertError) {
                  // 배치 INSERT 실패 시 개별 UPSERT로 폴백
                  const successCount = await upsertStoresIndividually(
                    db,
                    chunk,
                    (sourceId, error) => {
                      logger.error('Failed to insert store', {
                        sourceId,
                        error: error.message,
                      });
                    }
                  );
                  totalInserted += successCount;
                }
              }
            }

            pagesProcessed++;
            pageNo++;

            // 다음 페이지가 없으면 종료
            if (stores.length < 1000) {
              hasMore = false;
            }
          } catch (pageError) {
            const errorMessage = pageError instanceof Error ? pageError.message : String(pageError);
            errors.push({ page: pageNo, error: errorMessage });
            logger.error('Failed to fetch page', {
              date: formattedDate,
              pageNo,
              error: errorMessage,
            });
            pageNo++;
            // 에러가 발생해도 다음 페이지 시도
          }
        }
      }

      // 수집 후 데이터베이스 카운트 확인
      let afterCountValue = beforeCountValue;
      try {
        const afterCount = await db
          .select({ count: count() })
          .from(schema.rawStore)
          .get();
        afterCountValue = afterCount?.count || 0;
      } catch (dbError) {
        logger.warn('Failed to get after count', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }

      // 실제 저장된 개수는 DB 카운트 차이로 계산
      const actualInserted = afterCountValue - beforeCountValue;
      
      logger.info('Manual fetch completed', {
        type,
        dongCode: type === 'dong' ? dongCode : undefined,
        date: type === 'date' ? date : undefined,
        beforeCount: beforeCountValue,
        afterCount: afterCountValue,
        estimatedInserted: totalInserted,
        actualInserted,
        pagesProcessed,
        errors: errors.length,
      });

      return NextResponse.json({
        success: true,
        message: 'Manual fetch completed',
        data: {
          type,
          dongCode: type === 'dong' ? (dongCode as string) : undefined,
          date: type === 'date' ? (date as string) : undefined,
          beforeCount: beforeCountValue,
          afterCount: afterCountValue,
          insertedCount: actualInserted, // 실제 DB 카운트 차이 사용
          estimatedInserted: totalInserted, // 추정값 (중복 제외 전)
          pagesProcessed,
          maxPages: validatedMaxPages,
          errors: errors.length > 0 ? errors : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError) {
      // 수집 실패 시에도 카운트 확인
      let afterCountValue = beforeCountValue;
      try {
        const afterCount = await db
          .select({ count: count() })
          .from(schema.rawStore)
          .get();
        afterCountValue = afterCount?.count || 0;
      } catch (dbError) {
        logger.warn('Failed to get after count after error', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }

      logger.error('Manual fetch failed', {
        type,
        dongCode: type === 'dong' ? (dongCode as string) : undefined,
        date: type === 'date' ? (date as string) : undefined,
        beforeCount: beforeCountValue,
        afterCount: afterCountValue,
      }, fetchError instanceof Error ? fetchError : new Error(String(fetchError)));

      throw fetchError;
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to trigger manual fetch', {
      error: errorObj.message,
      stack: errorObj.stack,
      name: errorObj.name,
    }, errorObj);
    
    return NextResponse.json(
      {
        error: 'Failed to trigger manual fetch',
        message: errorObj.message,
      },
      { status: 500 }
    );
  }
}

