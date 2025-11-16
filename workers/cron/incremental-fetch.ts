import type { Env } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDb } from '../utils/db';
import { getSetting, setSetting, addToFailQueue } from '../utils/kv';
import { rawStore } from '@/db/schema';
import { requirePublicDataApiKey } from '../utils/env';
import { WORKER_CONFIG } from '../constants';
import { fetchStoreListByDate, formatDateForApi } from '../utils/public-data-api';
import { sql, eq } from 'drizzle-orm';
import { CPUTimer, logPerformanceWarning, chunkArray, D1_BATCH_LIMITS, withTimeout, PERFORMANCE_THRESHOLDS } from '../utils/performance';
import { prepareStoreForInsert, upsertStoresIndividually } from '../utils/store-processing';
import { logger } from '../utils/logger';
import { safeParseInt } from '../utils/validation';

/**
 * 증분 수집 Cron 핸들러
 * 수정일 기준으로 변경된 데이터만 수집
 */
export async function handleIncrementalFetch(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const db = getDb(env);
  const cpuTimer = new CPUTimer();
  cpuTimer.checkpoint('start');

  // KV에서 마지막 수정일 읽기
  const lastModDateStr = await getSetting(env, 'last_mod_date');
  const lastModDate = lastModDateStr 
    ? lastModDateStr 
    : new Date(Date.now() - WORKER_CONFIG.DEFAULT_LAST_MOD_HOURS * 60 * 60 * 1000).toISOString();

  try {
    // 공공데이터 API 키 검증
    let apiKey: string;
    try {
      apiKey = requirePublicDataApiKey(env);
    } catch (error) {
      logger.warn('Public Data API key not set. Skipping incremental fetch.', {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // 날짜 형식 변환 (ISO -> YYYYMMDD)
    const formattedDate = formatDateForApi(lastModDate);

    // 이전 실행에서 중단된 페이지 번호 복원
    const lastPageStr = await getSetting(env, 'incremental_fetch_last_page');
    let pageNo = safeParseInt(lastPageStr, 1, 1);
    let hasMore = true;
    let totalStoresUpdated = 0;

    // 이전 실행에서 중단된 경우 로깅
    if (lastPageStr) {
      logger.info('Resuming incremental fetch from saved page', {
        lastPage: pageNo,
        lastModDate: formattedDate,
      });
    }

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    while (hasMore) {
      // 총 실행 시간 제한 확인 (25초 경고 임계값)
      const elapsedTime = cpuTimer.getElapsed();
      if (elapsedTime > PERFORMANCE_THRESHOLDS.WARNING_TOTAL_MS) {
        logger.warn('Incremental fetch approaching time limit. Stopping.', {
          elapsedTimeMs: elapsedTime,
          pageNo,
          totalStoresUpdated,
        });
        // 현재 페이지까지의 진행 상황을 저장하여 다음 실행에서 이어서 처리
        await setSetting(env, 'incremental_fetch_last_page', String(pageNo));
        break;
      }

      try {
        // 외부 API 호출에 타임아웃 설정 (20초, 총 실행 시간 제한 고려)
        const stores = await withTimeout(
          fetchStoreListByDate(formattedDate, apiKey, pageNo),
          20000,
          `API timeout for page ${pageNo}`
        );
        consecutiveErrors = 0; // 성공 시 에러 카운터 리셋

        if (stores.length === 0) {
          hasMore = false;
          break;
        }

        cpuTimer.checkpoint(`page-${pageNo}-start`);

        // 데이터 검증 및 정제 (배치 처리)
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

        cpuTimer.checkpoint(`page-${pageNo}-prepared`);

        // 배치 INSERT (Cloudflare D1 제한 고려)
        const chunks = chunkArray(insertValues, D1_BATCH_LIMITS.MAX_INSERT_ROWS);
        for (const chunk of chunks) {
          try {
            // 배치 INSERT 시도
            await db.insert(rawStore).values(chunk).onConflictDoNothing();
            totalStoresUpdated += chunk.length;
          } catch (error) {
            // 배치 INSERT 실패 시 개별 UPSERT로 폴백
            logger.warn('Batch insert failed, falling back to individual upserts', {
              error: error instanceof Error ? error.message : String(error),
              chunkSize: chunk.length,
            });
            
            const successCount = await upsertStoresIndividually(
              db,
              chunk,
              (sourceId, error) => {
                logger.error('Failed to upsert store', {
                  sourceId,
                }, error);
              }
            );
            totalStoresUpdated += successCount;
          }
        }

        cpuTimer.checkpoint(`page-${pageNo}-inserted`);
        logPerformanceWarning(cpuTimer, 'incremental-fetch', { pageNo, storesProcessed: stores.length });

        // 다음 페이지가 있는지 확인
        if (stores.length < 1000) {
          hasMore = false;
          // 마지막 페이지까지 완료된 경우 진행 상황 초기화
          await setSetting(env, 'incremental_fetch_last_page', '1');
        } else {
          pageNo++;
        }
      } catch (error) {
        consecutiveErrors++;
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        logger.error('Failed to fetch stores for page', {
          pageNo,
          lastModDate: formattedDate,
          consecutiveErrors,
        }, errorObj);

        // 연속 에러가 너무 많으면 중단
        if (consecutiveErrors >= maxConsecutiveErrors) {
          logger.error('Too many consecutive errors. Stopping incremental fetch.', {
            consecutiveErrors,
            maxConsecutiveErrors,
          });
          // 진행 상황 저장
          await setSetting(env, 'incremental_fetch_last_page', String(pageNo));
          await addToFailQueue(
            env,
            { type: 'incremental_fetch', lastModDate, pageNo },
            `Too many consecutive errors: ${errorObj.message}`
          );
          hasMore = false;
          break;
        }

        // 재시도 전 대기 (지수 백오프)
        const backoffDelay = Math.min(1000 * Math.pow(2, consecutiveErrors - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    // 마지막 수정일 갱신
    const now = new Date().toISOString();
    await setSetting(env, 'last_mod_date', now);

    // 성공적으로 완료된 경우 저장된 진행 상황 초기화
    await setSetting(env, 'incremental_fetch_last_page', '1');

    logger.info('Incremental fetch completed', {
      totalStoresUpdated,
      lastModDate: now,
      finalPage: pageNo,
    });
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Incremental fetch failed', {
      lastModDate,
    }, errorObj);
    await addToFailQueue(
      env,
      { type: 'incremental_fetch', lastModDate },
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

