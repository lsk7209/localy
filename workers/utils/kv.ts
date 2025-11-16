import type { Env, SettingsKey, FailQueueMessage } from '../types';
import { KV_BATCH_LIMITS } from './performance';

/**
 * 설정 값 읽기
 */
export async function getSetting(env: Env, key: SettingsKey): Promise<string | null> {
  return await env.SETTINGS.get(key);
}

/**
 * 설정 값 저장
 */
export async function setSetting(env: Env, key: SettingsKey, value: string): Promise<void> {
  await env.SETTINGS.put(key, value);
}

/**
 * 여러 설정 값 일괄 읽기 (배치 최적화)
 */
export async function getSettingsBatch(
  env: Env,
  keys: SettingsKey[]
): Promise<Map<SettingsKey, string | null>> {
  const results = new Map<SettingsKey, string | null>();
  
  // KV는 배치 읽기를 직접 지원하지 않으므로 Promise.all로 병렬 처리
  const promises = keys.map(async (key) => {
    const value = await env.SETTINGS.get(key);
    return { key, value };
  });
  
  const values = await Promise.all(promises);
  values.forEach(({ key, value }) => {
    results.set(key, value);
  });
  
  return results;
}

/**
 * 실패 큐에 메시지 추가
 */
export async function addToFailQueue(
  env: Env,
  payload: unknown,
  error: string,
  retryCount = 0
): Promise<void> {
  const message: FailQueueMessage = {
    payload,
    retryCount,
    error,
    timestamp: Date.now(),
  };

  const key = `fail:${Date.now()}:${Math.random().toString(36).substring(7)}`;
  await env.FETCH_FAIL_QUEUE.put(key, JSON.stringify(message));
}

/**
 * 실패 큐에서 메시지 조회 (재시도용)
 * 메시지를 읽은 후 큐에서 삭제하여 중복 처리 방지
 * Cloudflare KV 배치 처리 최적화 적용
 */
export async function getFailQueueMessages(env: Env, limit = 100): Promise<FailQueueMessage[]> {
  // KV list() 제한 고려
  const actualLimit = Math.min(limit, KV_BATCH_LIMITS.MAX_LIST_KEYS);
  const list = await env.FETCH_FAIL_QUEUE.list({ limit: actualLimit });
  
  if (list.keys.length === 0) {
    return [];
  }

  // 배치 읽기: Promise.all로 병렬 처리하여 성능 향상
  const getPromises = list.keys.map(async (key) => {
    try {
      const value = await env.FETCH_FAIL_QUEUE.get(key.name);
      return { key: key.name, value };
    } catch (error) {
      console.error(`Failed to get fail queue message: ${key.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { key: key.name, value: null };
    }
  });

  const results = await Promise.all(getPromises);
  const messages: FailQueueMessage[] = [];
  const deletePromises: Promise<void>[] = [];

  // 메시지 파싱 및 삭제 준비
  for (const { key, value } of results) {
    if (!value) {
      // 값이 없으면 삭제
      deletePromises.push(
        env.FETCH_FAIL_QUEUE.delete(key).catch((error) => {
          console.error(`Failed to delete fail queue message: ${key}`, error);
        })
      );
      continue;
    }

    try {
      const message = JSON.parse(value) as FailQueueMessage;
      messages.push(message);
      // 메시지를 읽은 후 큐에서 삭제하여 중복 처리 방지
      deletePromises.push(
        env.FETCH_FAIL_QUEUE.delete(key).catch((error) => {
          console.error(`Failed to delete fail queue message: ${key}`, error);
        })
      );
    } catch (e) {
      console.error(`Failed to parse fail queue message: ${key}`, e);
      // 파싱 실패한 메시지는 삭제하여 큐 정리
      deletePromises.push(
        env.FETCH_FAIL_QUEUE.delete(key).catch((error) => {
          console.error(`Failed to delete invalid fail queue message: ${key}`, error);
        })
      );
    }
  }

  // 삭제 작업을 병렬로 실행 (결과는 기다리지 않음)
  Promise.all(deletePromises).catch((error) => {
    console.error('Some fail queue message deletions failed:', error);
  });

  return messages;
}

/**
 * 영구 실패 큐로 이동
 */
export async function moveToDeadQueue(env: Env, message: FailQueueMessage): Promise<void> {
  const key = `dead:${Date.now()}:${Math.random().toString(36).substring(7)}`;
  await env.DEAD_FAIL_QUEUE.put(key, JSON.stringify(message));
}

