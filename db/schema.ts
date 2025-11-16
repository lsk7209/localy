import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 원본 데이터 저장 테이블
 * 공공데이터 API에서 받은 raw JSON을 그대로 저장
 */
export const rawStore = sqliteTable('raw_store', {
  sourceId: text('source_id').primaryKey(),
  nameRaw: text('name_raw'),
  addrRaw: text('addr_raw'),
  categoryRaw: text('category_raw'),
  lat: real('lat'),
  lng: real('lng'),
  rawJson: text('raw_json').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * 정규화된 상가 정보 테이블
 */
export const bizPlace = sqliteTable('biz_place', {
  id: text('id').primaryKey(), // UUID
  sourceId: text('source_id').notNull().unique(),
  name: text('name'),
  addrRoad: text('addr_road'),
  addrJibun: text('addr_jibun'),
  sido: text('sido'),
  sigungu: text('sigungu'),
  dong: text('dong'),
  category: text('category'),
  lat: real('lat'),
  lng: real('lng'),
  status: text('status'),
  licenseDate: text('license_date'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * 발행/AI 메타데이터 테이블
 */
export const bizMeta = sqliteTable('biz_meta', {
  bizId: text('biz_id').primaryKey().references(() => bizPlace.id),
  slug: text('slug').unique(),
  aiSummary: text('ai_summary'),
  aiFaq: text('ai_faq'),
  isPublishable: integer('is_publishable', { mode: 'boolean' }).default(false),
  lastPublishedAt: integer('last_published_at', { mode: 'timestamp' }),
});

export type RawStore = typeof rawStore.$inferSelect;
export type BizPlace = typeof bizPlace.$inferSelect;
export type BizMeta = typeof bizMeta.$inferSelect;

export type RawStoreInsert = typeof rawStore.$inferInsert;
export type BizPlaceInsert = typeof bizPlace.$inferInsert;
export type BizMetaInsert = typeof bizMeta.$inferInsert;

