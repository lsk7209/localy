import type { Env } from '../types';
import type { ExecutionContext } from '@cloudflare/workers-types';
import { getDb } from '../utils/db';
import { rawStore, bizPlace, bizMeta, type BizPlaceInsert, type BizMetaInsert } from '@/db/schema';
import { parseAddress } from '../utils/address';
import { generateSlug } from '../utils/slug';
import { eq, isNull } from 'drizzle-orm';
import { WORKER_CONFIG } from '../constants';
import { WorkerTimer, sendErrorAlert } from '../utils/monitoring';
import {
  validateStoreName,
  validateAddress,
  validateCategory,
  validateRegionName,
  validateCoordinates,
  sanitizeString,
} from '../utils/validation';
import { CPUTimer, logPerformanceWarning, chunkArray, D1_BATCH_LIMITS } from '../utils/performance';
import { logger } from '../utils/logger';

/**
 * 정규화 워커
 * raw_store의 데이터를 biz_place와 biz_meta로 변환
 */
export async function handleNormalize(
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const db = getDb(env);
  const timer = new WorkerTimer('normalize', env);
  const cpuTimer = new CPUTimer();
  cpuTimer.checkpoint('start');

  try {
    // 아직 정규화되지 않은 raw_store 조회
    const rawStores = await db
      .select()
      .from(rawStore)
      .leftJoin(bizPlace, eq(rawStore.sourceId, bizPlace.sourceId))
      .where(isNull(bizPlace.id))
      .limit(WORKER_CONFIG.NORMALIZE_BATCH_SIZE)
      .all();

    if (rawStores.length === 0) {
      logger.info('No raw stores to normalize');
      return;
    }

    // 배치 처리를 위한 배열 준비
    const bizPlaceInserts: BizPlaceInsert[] = [];
    const bizMetaInserts: BizMetaInsert[] = [];
    const processedSourceIds: string[] = [];

    // 데이터 파싱 및 준비
    for (const row of rawStores) {
      const raw = row.raw_store;
      if (!raw) continue;

      try {
        // JSON 파싱
        const storeData = JSON.parse(raw.rawJson) as Record<string, unknown>;

        // 주소 파싱
        const parsedAddr = parseAddress(raw.addrRaw || null);

        // UUID 생성 (Cloudflare Workers 환경)
        const bizId = crypto.randomUUID();

        // slug 생성
        const slug = parsedAddr.dong
          ? generateSlug(raw.nameRaw || 'unknown', parsedAddr.dong)
          : null;

        // INSERT 데이터 준비 (데이터 검증 및 정제)
        const name = raw.nameRaw ? sanitizeString(raw.nameRaw) : null;
        const category = raw.categoryRaw ? sanitizeString(raw.categoryRaw) : null;
        const addrRoad = parsedAddr.addrRoad ? sanitizeString(parsedAddr.addrRoad) : null;
        const addrJibun = parsedAddr.addrJibun ? sanitizeString(parsedAddr.addrJibun) : null;
        const sido = parsedAddr.sido ? sanitizeString(parsedAddr.sido) : null;
        const sigungu = parsedAddr.sigungu ? sanitizeString(parsedAddr.sigungu) : null;
        const dong = parsedAddr.dong ? sanitizeString(parsedAddr.dong) : null;
        
        // 좌표 검증
        let lat: number | null = raw.lat || null;
        let lng: number | null = raw.lng || null;
        if (lat !== null && lng !== null && !validateCoordinates(lat, lng)) {
          logger.warn('Invalid coordinates for store', {
            sourceId: raw.sourceId,
            lat,
            lng,
          });
          lat = null;
          lng = null;
        }

        bizPlaceInserts.push({
          id: bizId,
          sourceId: raw.sourceId,
          name,
          addrRoad,
          addrJibun,
          sido,
          sigungu,
          dong,
          category,
          lat,
          lng,
          status: storeData.status ? sanitizeString(String(storeData.status)) : null,
          licenseDate: storeData.license_date ? sanitizeString(String(storeData.license_date)) : null,
        });

        bizMetaInserts.push({
          bizId,
          slug,
          aiSummary: null,
          aiFaq: null,
          isPublishable: false,
          lastPublishedAt: null,
        });

        processedSourceIds.push(raw.sourceId);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to prepare normalization for store', {
          sourceId: raw.sourceId,
        }, errorObj);
        // 개별 실패는 로깅만 하고 계속 진행
      }
    }

    cpuTimer.checkpoint('prepared');

    // 배치 INSERT를 트랜잭션으로 처리 (Cloudflare D1 제한 고려)
    if (bizPlaceInserts.length > 0 && bizMetaInserts.length > 0) {
      try {
        // D1 배치 제한을 고려하여 청크로 분할
        const chunks = chunkArray(
          bizPlaceInserts.map((place, index) => ({ place, meta: bizMetaInserts[index] })),
          D1_BATCH_LIMITS.MAX_INSERT_ROWS
        );

        for (const chunk of chunks) {
          await db.transaction(async (tx) => {
            // biz_place 배치 INSERT
            const placeChunk = chunk.map(({ place }) => place);
            await tx.insert(bizPlace).values(placeChunk).onConflictDoNothing();

            // biz_meta 배치 INSERT
            const metaChunk = chunk.map(({ meta }) => meta);
            await tx.insert(bizMeta).values(metaChunk).onConflictDoNothing();
          });
        }

        cpuTimer.checkpoint('inserted');
        logPerformanceWarning(cpuTimer, 'normalize', { 
          batchSize: processedSourceIds.length,
          chunksProcessed: chunks.length,
        });

        logger.info('Normalized stores in batch', {
          count: processedSourceIds.length,
          sourceIds: processedSourceIds,
        });

        await timer.finish(true, processedSourceIds.length);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Batch normalization transaction failed', {
          batchSize: bizPlaceInserts.length,
        }, errorObj);
        
        await sendErrorAlert(env, errorObj, {
          worker: 'normalize',
          batchSize: bizPlaceInserts.length,
        });

        // 트랜잭션 실패 시 개별 처리로 폴백
        await processIndividually(db, bizPlaceInserts, bizMetaInserts);
        await timer.finish(false, 0, errorObj.message);
      }
    } else {
      await timer.finish(true, 0);
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Normalize failed', {}, errorObj);

    await sendErrorAlert(env, errorObj, {
      worker: 'normalize',
    });

    await timer.finish(false, 0, errorObj.message);
    // 정규화 실패는 큐에 추가하지 않음 (다음 실행에서 재시도)
  }
}

/**
 * 트랜잭션 실패 시 개별 처리로 폴백
 */
async function processIndividually(
  db: ReturnType<typeof getDb>,
  bizPlaceInserts: BizPlaceInsert[],
  bizMetaInserts: BizMetaInsert[]
): Promise<void> {
  for (let i = 0; i < bizPlaceInserts.length; i++) {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(bizPlace).values(bizPlaceInserts[i]).onConflictDoNothing();
        await tx.insert(bizMeta).values(bizMetaInserts[i]).onConflictDoNothing();
      });
      logger.info('Normalized store individually', {
        sourceId: bizPlaceInserts[i].sourceId,
        bizId: bizPlaceInserts[i].id,
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to normalize store individually', {
        sourceId: bizPlaceInserts[i].sourceId,
      }, errorObj);
    }
  }
}

