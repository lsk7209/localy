import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import type { Env } from '../types';

/**
 * D1 데이터베이스 인스턴스 생성
 */
export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

