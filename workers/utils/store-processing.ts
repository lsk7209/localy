import type { PublicDataStore } from '../types';
import { rawStore } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '@/db/schema';
import {
  validateCoordinates,
  sanitizeString,
} from './validation';

/**
 * Store 데이터 검증 및 정제
 * PublicDataStore를 rawStore INSERT 형식으로 변환
 */
export function prepareStoreForInsert(store: PublicDataStore): {
  sourceId: string;
  nameRaw: string | null;
  addrRaw: string | null;
  categoryRaw: string | null;
  lat: number | null;
  lng: number | null;
  rawJson: string;
} {
  // sourceId 추출 (다양한 필드명 시도)
  let sourceId = store.source_id || 
                 (store as any).bizesId || 
                 (store as any).bizId || 
                 (store as any).id || 
                 '';
  
  // sourceId가 없으면 에러 (primary key이므로 필수)
  if (!sourceId || sourceId.trim() === '') {
    // 대체 ID 생성 (임시)
    const fallbackId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.warn('Store missing source_id, using fallback ID', {
      store: JSON.stringify(store).substring(0, 200),
      fallbackId,
    });
    sourceId = fallbackId;
  }
  
  const nameRaw = store.name ? sanitizeString(store.name) : null;
  const addrRaw = store.address ? sanitizeString(store.address) : null;
  const categoryRaw = store.category ? sanitizeString(store.category) : null;
  
  // 좌표 검증
  let lat: number | null = null;
  let lng: number | null = null;
  if (store.lat !== undefined && store.lng !== undefined) {
    if (validateCoordinates(store.lat, store.lng)) {
      lat = store.lat;
      lng = store.lng;
    }
  }

  return {
    sourceId,
    nameRaw,
    addrRaw,
    categoryRaw,
    lat,
    lng,
    rawJson: JSON.stringify(store),
  };
}

/**
 * 배치 INSERT 실패 시 개별 UPSERT로 폴백
 * Cloudflare D1의 제한사항을 고려한 안전한 처리
 */
export async function upsertStoresIndividually(
  db: DrizzleD1Database<typeof schema>,
  stores: Array<ReturnType<typeof prepareStoreForInsert>>,
  onError?: (sourceId: string, error: Error) => void
): Promise<number> {
  let successCount = 0;

  for (const store of stores) {
    try {
      // INSERT 시도
      await db.insert(rawStore).values(store);
      successCount++;
    } catch (insertError) {
      // 중복 키 오류인 경우 UPDATE 수행
      // Note: Drizzle ORM의 SQLite 타입 추론 제한으로 인해 'as any' 캐스팅 필요
      // store는 이미 검증된 데이터이므로 타입 안전성 보장됨
      try {
        await db
          .update(rawStore)
          .set(store as any)
          .where(eq(rawStore.sourceId, store.sourceId));
        successCount++;
      } catch (updateError) {
        const error = updateError instanceof Error 
          ? updateError 
          : new Error(String(updateError));
        
        if (onError) {
          onError(store.sourceId, error);
        }
      }
    }
  }

  return successCount;
}

