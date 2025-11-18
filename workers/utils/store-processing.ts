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
      // INSERT 시도 (onConflictDoNothing 사용)
      await db.insert(rawStore).values(store).onConflictDoNothing();
      
      // 실제로 INSERT되었는지 확인 (중복이면 조용히 무시되므로)
      // SELECT로 확인하여 실제 저장 여부 판단
      const existing = await db
        .select()
        .from(rawStore)
        .where(eq(rawStore.sourceId, store.sourceId))
        .get();
      
      if (existing) {
        successCount++;
      } else {
        // INSERT가 실패했지만 에러가 발생하지 않은 경우 (이상한 상황)
        const error = new Error('INSERT failed silently (onConflictDoNothing but item not found)');
        if (onError) {
          onError(store.sourceId, error);
        }
      }
    } catch (insertError) {
      // INSERT 에러 발생 (중복 키 외의 에러)
      const error = insertError instanceof Error 
        ? insertError 
        : new Error(String(insertError));
      
      // SQLite 중복 키 에러 체크
      const isDuplicateError = error.message.includes('UNIQUE constraint') || 
                                error.message.includes('duplicate') ||
                                error.message.includes('PRIMARY KEY');
      
      if (isDuplicateError) {
        // 중복 키인 경우 성공으로 간주 (이미 존재함)
        successCount++;
      } else {
        // 다른 에러인 경우 onError 콜백 호출
        if (onError) {
          onError(store.sourceId, error);
        }
      }
    }
  }

  return successCount;
}

