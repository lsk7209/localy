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
  
  const nextDongIndex = safeParseInt(settings.get('next_dong_index'), 0, 0);
  const resumeDong = settings.get('initial_fetch_last_dong') || null;
  const resumePage = safeParseInt(settings.get('initial_fetch_last_page'), null, 1);

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
      
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
        // 첫 페이지 조회 (이전 실행에서 중단된 경우 해당 페이지부터 재개)
        let pageNo = (isResumingDong && resumePage) ? resumePage : 1;
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
            
            // 좌표 검증 실패 시 경고
            if (store.lat !== undefined && store.lng !== undefined && !prepared.lat) {
              logger.warn('Invalid coordinates for store', {
                sourceId: prepared.sourceId,
                lat: store.lat,
                lng: store.lng,
              });
            }
            
            return prepared;
          });

          if (insertValues.length > 0) {
            // Cloudflare D1 배치 INSERT 제한 고려하여 청크로 분할
            const chunks = chunkArray(insertValues, D1_BATCH_LIMITS.MAX_INSERT_ROWS);
            for (const chunk of chunks) {
              try {
                await db.insert(rawStore).values(chunk).onConflictDoNothing();
                totalStoresInserted += chunk.length;
              } catch (error) {
                logger.warn('Batch insert failed for dong, falling back to individual upserts', {
                  dongCode,
                  error: error instanceof Error ? error.message : String(error),
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
                    }, error);
                  }
                );
                totalStoresInserted += successCount;
              }
            }
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

        success = true;
        // 해당 동 완료 시 진행 상황 초기화
        await setSetting(env, 'initial_fetch_last_dong', '');
        await setSetting(env, 'initial_fetch_last_page', '1');
        
        logger.info('Fetched stores for dong', {
          dongCode,
          storesInserted: totalStoresInserted,
        });
      } catch (error) {
          retryCount++;
          const errorObj = error instanceof Error ? error : new Error(String(error));
          
          if (retryCount >= maxRetries) {
            logger.error(`Failed to fetch stores for dong after ${maxRetries} retries`, {
              dongCode,
              retryCount,
            }, errorObj);
            // 최대 재시도 횟수 초과 시 실패 큐에 추가
            await addToFailQueue(
              env,
              { type: 'initial_fetch', dongCode },
              errorObj.message
            );
          } else {
            // 재시도 전 대기 (지수 백오프)
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
            logger.warn('Retrying fetch for dong', {
              dongCode,
              attempt: retryCount + 1,
              maxRetries,
            });
          }
        }
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

