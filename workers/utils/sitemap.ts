import type { Env } from '../types';
import { chunkArray, KV_BATCH_LIMITS } from './performance';
import { logger } from './logger';

/**
 * Sitemap 설정
 */
const SITEMAP_BASE_URL = '/sitemap';
const SITEMAP_MAX_URLS = 10000; // sitemap 분할 기준

/**
 * Sitemap 항목 타입
 */
export interface SitemapItem {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Sitemap XML 생성
 */
function generateSitemapXml(items: SitemapItem[]): string {
  const urls = items.map((item) => {
    const loc = `<loc>${escapeXml(item.loc)}</loc>`;
    const lastmod = item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : '';
    const changefreq = item.changefreq ? `<changefreq>${item.changefreq}</changefreq>` : '';
    const priority = item.priority !== undefined ? `<priority>${item.priority}</priority>` : '';
    
    return `<url>${loc}${lastmod}${changefreq}${priority}</url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * XML 특수문자 이스케이프
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sitemap Index XML 생성
 */
function generateSitemapIndexXml(sitemapUrls: string[]): string {
  const sitemaps = sitemapUrls.map((url) => {
    return `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;
}

/**
 * Sitemap 갱신 (발행된 상가 URL 추가)
 * 
 * 실제 구현 시:
 * 1. 발행된 상가의 slug 목록을 조회
 * 2. Sitemap을 분할하여 생성 (10k 단위)
 * 3. Sitemap Index 생성
 * 4. Cloudflare Pages/KV에 저장하거나 Next.js API를 통해 업데이트
 */
export async function updateSitemap(
  env: Env,
  publishedSlugs: string[],
  baseUrl: string
): Promise<void> {
  if (publishedSlugs.length === 0) {
    logger.info('No new slugs to add to sitemap');
    return;
  }

  try {
    // 발행된 상가 URL 생성
    const sitemapItems: SitemapItem[] = publishedSlugs.map((slug) => ({
      loc: `${baseUrl}/shop/${slug}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    }));

    // Sitemap 분할 (10k 단위)
    const sitemapFiles: string[] = [];
    for (let i = 0; i < sitemapItems.length; i += SITEMAP_MAX_URLS) {
      const chunk = sitemapItems.slice(i, i + SITEMAP_MAX_URLS);
      const sitemapXml = generateSitemapXml(chunk);
      const sitemapIndex = Math.floor(i / SITEMAP_MAX_URLS) + 1;
      const sitemapUrl = `${baseUrl}${SITEMAP_BASE_URL}-${sitemapIndex}.xml`;
      
      // TODO: 실제로는 Cloudflare KV나 R2에 저장하거나 Next.js API를 통해 업데이트
      // 현재는 로깅만 수행
      logger.info('Generated sitemap', {
        sitemapIndex,
        urlCount: chunk.length,
        sitemapUrl,
      });
      sitemapFiles.push(sitemapUrl);
    }

    // Sitemap Index 생성
    const sitemapIndexXml = generateSitemapIndexXml(sitemapFiles);
    const sitemapIndexUrl = `${baseUrl}${SITEMAP_BASE_URL}.xml`;
    
    logger.info('Generated sitemap index', {
      sitemapCount: sitemapFiles.length,
      sitemapIndexUrl,
    });
    
    // Sitemap을 KV에 저장
    if (env.SITEMAP) {
      try {
        // Sitemap Index 저장
        const sitemapIndexKey = 'sitemap-index.xml';
        await env.SITEMAP.put(sitemapIndexKey, sitemapIndexXml, {
          metadata: {
            contentType: 'application/xml',
            lastModified: new Date().toISOString(),
          },
        });

        // 각 Sitemap 파일 저장 (병렬 처리로 최적화)
        const sitemapXmls: string[] = [];
        for (let i = 0; i < sitemapItems.length; i += SITEMAP_MAX_URLS) {
          const chunk = sitemapItems.slice(i, i + SITEMAP_MAX_URLS);
          sitemapXmls.push(generateSitemapXml(chunk));
        }

        // KV 배치 저장을 병렬로 처리
        const putPromises = sitemapFiles.map((_, index) => {
          const sitemapKey = `sitemap-${index + 1}.xml`;
          return env.SITEMAP.put(sitemapKey, sitemapXmls[index], {
            metadata: {
              contentType: 'application/xml',
              lastModified: new Date().toISOString(),
            },
          }).catch((error) => {
            logger.error('Failed to save sitemap file', {
              sitemapKey,
            }, error instanceof Error ? error : new Error(String(error)));
            throw error;
          });
        });

        await Promise.all(putPromises);

        logger.info('Saved sitemap files to KV', {
          fileCount: sitemapFiles.length + 1,
        });
      } catch (error) {
        logger.error('Failed to save sitemap to KV', {}, error instanceof Error ? error : new Error(String(error)));
        // KV 저장 실패해도 계속 진행 (다음 실행에서 재시도)
      }
    } else {
      logger.warn('SITEMAP KV namespace not configured. Skipping sitemap storage.');
    }
  } catch (error) {
    logger.error('Failed to update sitemap', {
      slugCount: publishedSlugs.length,
    }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

