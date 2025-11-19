import type { Env } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDb } from '../utils/db';
import { getSetting, setSetting, addToFailQueue } from '../utils/kv';
import { rawStore } from '@/db/schema';
import { requirePublicDataApiKey } from '../utils/env';
import { WORKER_CONFIG } from '../constants';
import { getDongList, fetchStoreListInDong } from '../utils/public-data-api';
import { CPUTimer, logPerformanceWarning, chunkArray, D1_BATCH_LIMITS, withTimeout, PERFORMANCE_THRESHOLDS } from '../utils/performance';
import { prepareStoreForInsert, upsertStoresIndividually } from '../utils/store-processing';
import { logger } from '../utils/logger';
import { safeParseInt } from '../utils/validation';
import { getSettingsBatch } from '../utils/kv';
import { sql } from 'drizzle-orm';
import { retryWithBackoff } from '../utils/retry';

/**
 * 초기 수집 Cron 핸들러
 * 시간당 10개 행정동 처리
 */
export async function handleInitialFetch(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const db = getDb(env);
  const cpuTimer = new CPUTimer();
  cpuTimer.checkpoint('start');

  // KV에서 설정 값 일괄 읽기 (병렬 처리로 성능 향상)
  const settings = await getSettingsBatch(env, [
    'next_dong_index',
    'initial_fetch_last_dong',
    'initial_fetch_last_page',
  ]);
  
  const nextDongIndex: number = safeParseInt(settings.get('next_dong_index'), 0, 0) ?? 0;
  const resumeDong = settings.get('initial_fetch_last_dong') || null;
  const resumePage: number | null = safeParseInt(settings.get('initial_fetch_last_page'), null, 1);

  // 이전 실행에서 중단된 경우 로깅
  if (resumeDong || resumePage) {
    logger.info('Resuming initial fetch from saved position', {
      resumeDong,
      resumePage,
      nextDongIndex,
    });
  }

  try {
    // 공공데이터 API 키 검증
    let apiKey: string;
    try {
      apiKey = requirePublicDataApiKey(env);
    } catch (error) {
      logger.warn('Public Data API key not set. Skipping initial fetch.', {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // 행정동 목록 조회
    const dongList = await getDongList(nextDongIndex, WORKER_CONFIG.INITIAL_FETCH_DONG_COUNT);
    
    logger.info('Dong list retrieved', {
      nextDongIndex,
      requestedCount: WORKER_CONFIG.INITIAL_FETCH_DONG_COUNT,
      actualCount: dongList.length,
      dongCodes: dongList.slice(0, 5), // 처음 5개만 로깅
    });
    
    if (dongList.length === 0) {
      logger.warn('No dong list available. This may indicate all data has been fetched or API needs configuration.', {
        nextDongIndex,
        requestedCount: WORKER_CONFIG.INITIAL_FETCH_DONG_COUNT,
      });
      return;
    }

    let totalStoresInserted = 0;
    let shouldResume = resumeDong !== null;
    let isResumingDong = false;

    // 각 행정동별로 상가 목록 조회 및 저장 (재시도 로직 포함)
    for (const dongCode of dongList) {
      // 이전 실행에서 중단된 동이면 해당 동부터 재개
      if (shouldResume && dongCode !== resumeDong) {
        continue;
      }
      if (shouldResume && dongCode === resumeDong) {
        shouldResume = false; // 재개 완료
        isResumingDong = true;
      } else {
        isResumingDong = false;
      }
      
      // 재시도 로직을 retryWithBackoff로 대체
      try {
        await retryWithBackoff(
          async () => {
            // 첫 페이지 조회 (이전 실행에서 중단된 경우 해당 페이지부터 재개)
            let pageNo: number = (isResumingDong && resumePage) ? resumePage : 1;
            let hasMore = true;

            while (hasMore) {
          // 총 실행 시간 제한 확인 (25초 경고 임계값)
          const elapsedTime = cpuTimer.getElapsed();
          if (elapsedTime > PERFORMANCE_THRESHOLDS.WARNING_TOTAL_MS) {
            logger.warn('Initial fetch approaching time limit. Stopping.', {
              elapsedTimeMs: elapsedTime,
              dongCode,
              pageNo,
            });
            // 현재 동까지의 진행 상황을 저장하여 다음 실행에서 이어서 처리
            await setSetting(env, 'initial_fetch_last_dong', dongCode);
            await setSetting(env, 'initial_fetch_last_page', String(pageNo));
            hasMore = false;
            break;
          }

          // 외부 API 호출에 타임아웃 설정 (20초, 총 실행 시간 제한 고려)
          const stores = await withTimeout(
            fetchStoreListInDong(dongCode, apiKey, pageNo),
            20000,
            `API timeout for dong ${dongCode}, page ${pageNo}`
          );

          if (stores.length === 0) {
            hasMore = false;
            break;
          }

          // 배치 INSERT (데이터 검증 및 정제 포함)
          const insertValues = stores.map((store) => {
            const prepared = prepareStoreForInsert(store);
            
            // sourceId 검증
            if (!prepared.sourceId || prepared.sourceId.trim() === '') {
              logger.error('Store missing sourceId after preparation', {
                dongCode,
                pageNo,
                store: JSON.stringify(store).substring(0, 200),
              });
              return null; // null 반환하여 필터링
            }
            
            // 좌표 검증 실패 시 경고
            if (store.lat !== undefined && store.lng !== undefined && !prepared.lat) {
              logger.warn('Invalid coordinates for store', {
                sourceId: prepared.sourceId,
                lat: store.lat,
                lng: store.lng,
              });
            }
            
            return prepared;
          }).filter((item): item is NonNullable<typeof item> => item !== null); // null 필터링

          logger.info('Prepared stores for insert', {
            dongCode,
            pageNo,
            originalCount: stores.length,
            preparedCount: insertValues.length,
            filteredCount: stores.length - insertValues.length,
          });

          if (insertValues.length > 0) {
            // INSERT 전 카운트 확인
            let beforeCount = 0;
            try {
              const beforeResult = await db.select({ count: sql<number>`COUNT(*)` }).from(rawStore).get();
              beforeCount = beforeResult?.count || 0;
            } catch (countError) {
              logger.warn('Failed to get before count', {
                error: countError instanceof Error ? countError.message : String(countError),
              });
            }

            // Cloudflare D1 배치 INSERT 제한 고려하여 청크로 분할
            const chunks = chunkArray(insertValues, D1_BATCH_LIMITS.MAX_INSERT_ROWS);
            let chunkIndex = 0;
            
            for (const chunk of chunks) {
              chunkIndex++;
              const isLastChunk = chunkIndex === chunks.length;
              
              try {
                // INSERT 시도
                await db.insert(rawStore).values(chunk).onConflictDoNothing();
                
                // 마지막 청크이거나 일정 간격으로만 카운트 확인 (성능 최적화)
                // 모든 청크마다 카운트하면 성능 저하가 발생할 수 있음
                let actuallyInserted = chunk.length; // 기본값: 모두 저장된 것으로 가정
                
                if (isLastChunk || chunkIndex % 5 === 0) {
                  // 마지막 청크이거나 5개 청크마다 실제 카운트 확인
                  let afterCount = beforeCount;
                  try {
                    const afterResult = await db.select({ count: sql<number>`COUNT(*)` }).from(rawStore).get();
                    afterCount = afterResult?.count || 0;
                    actuallyInserted = afterCount - beforeCount;
                    beforeCount = afterCount; // 다음 확인을 위한 카운트 업데이트
                  } catch (countError) {
                    logger.warn('Failed to get after count', {
                      error: countError instanceof Error ? countError.message : String(countError),
                    });
                    // 카운트 실패 시 기본값 사용 (chunk.length)
                  }
                } else {
                  // 중간 청크는 기본값 사용 (성능 최적화)
                  beforeCount += chunk.length; // 추정치 업데이트
                }
                
                totalStoresInserted += actuallyInserted;
                
                logger.info('Batch insert completed', {
                  dongCode,
                  pageNo,
                  chunkIndex,
                  totalChunks: chunks.length,
                  chunkSize: chunk.length,
                  actuallyInserted,
                  totalInserted: totalStoresInserted,
                  note: isLastChunk || chunkIndex % 5 === 0
                    ? (actuallyInserted < chunk.length 
                        ? `${chunk.length - actuallyInserted} items were duplicates (onConflictDoNothing)`
                        : 'All items inserted successfully')
                    : 'Count verified periodically (performance optimization)',
                });
              } catch (error) {
                logger.warn('Batch insert failed for dong, falling back to individual upserts', {
                  dongCode,
                  pageNo,
                  error: error instanceof Error ? error.message : String(error),
                  errorStack: error instanceof Error ? error.stack : undefined,
                  chunkSize: chunk.length,
                });
                // 개별 INSERT로 폴백
                const successCount = await upsertStoresIndividually(
                  db,
                  chunk,
                  (sourceId, error) => {
                    logger.error('Failed to upsert store', {
                      sourceId,
                      dongCode,
                      pageNo,
                    }, error);
                  }
                );
                totalStoresInserted += successCount;
                logger.info('Individual upserts completed', {
                  dongCode,
                  pageNo,
                  successCount,
                  totalInserted: totalStoresInserted,
                });
              }
            }
          } else {
            logger.warn('No valid stores to insert after preparation', {
              dongCode,
              pageNo,
              originalStoresCount: stores.length,
            });
          }
          
          cpuTimer.checkpoint(`dong-${dongCode}-inserted`);
          logPerformanceWarning(cpuTimer, 'initial-fetch', { dongCode, storesProcessed: stores.length });

          // 다음 페이지가 있는지 확인 (API 응답의 totalCount 확인 필요)
          // 현재는 단순히 페이지당 최대 개수보다 적으면 종료
          if (stores.length < 1000) {
            hasMore = false;
            // 해당 동의 마지막 페이지까지 완료된 경우 진행 상황 초기화
            await setSetting(env, 'initial_fetch_last_page', '1');
          } else {
            pageNo++;
          }
        }

            // 해당 동 완료 시 진행 상황 초기화
            await setSetting(env, 'initial_fetch_last_dong', '');
            await setSetting(env, 'initial_fetch_last_page', '1');
            
            logger.info('Fetched stores for dong', {
              dongCode,
              storesInserted: totalStoresInserted,
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            onRetry: (attempt, error) => {
              logger.warn('Retrying fetch for dong', {
                dongCode,
                attempt,
                maxRetries: 3,
                error: error instanceof Error ? error.message : String(error),
              });
            },
            onFailure: async (error) => {
              const errorObj = error instanceof Error ? error : new Error(String(error));
              logger.error('Failed to fetch stores for dong after max retries', {
                dongCode,
              }, errorObj);
              // 최대 재시도 횟수 초과 시 실패 큐에 추가
              await addToFailQueue(
                env,
                { type: 'initial_fetch', dongCode },
                errorObj.message
              );
            },
          }
        );
      } catch (error) {
        // retryWithBackoff가 모든 재시도를 시도한 후에도 실패한 경우
        // onFailure 콜백에서 이미 처리했으므로 여기서는 로깅만
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Initial fetch failed for dong', {
          dongCode,
        }, errorObj);
      }
    }

    // 다음 인덱스 저장
    await setSetting(env, 'next_dong_index', String(nextDongIndex + WORKER_CONFIG.INITIAL_FETCH_DONG_COUNT));

    // 성공적으로 완료된 경우 저장된 진행 상황 초기화
    await setSetting(env, 'initial_fetch_last_dong', '');
    await setSetting(env, 'initial_fetch_last_page', '1');

    logger.info('Initial fetch completed', {
      totalStoresInserted,
      nextIndex: nextDongIndex + WORKER_CONFIG.INITIAL_FETCH_DONG_COUNT,
      dongListLength: dongList.length,
      processedDongs: dongList.length,
    });
    
    // totalStoresInserted가 0이면 경고 로그
    if (totalStoresInserted === 0) {
      logger.warn('Initial fetch completed but no stores were inserted', {
        nextDongIndex,
        dongListLength: dongList.length,
        possibleReasons: [
          'API returned empty arrays for all dongs',
          'All stores already exist in database (onConflictDoNothing)',
          'API key may be invalid or expired',
          'API endpoint may have changed',
        ],
      });
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Initial fetch failed', {
      nextDongIndex,
    }, errorObj);
    await addToFailQueue(
      env,
      { type: 'initial_fetch', nextDongIndex },
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

