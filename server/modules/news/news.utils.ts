import { logger } from "../../lib/logger";
import Parser from "rss-parser";
import type { RssItem } from "@shared/schema";

/**
 * RSS Parser конфигурация
 */
export const rssParser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['media:content', 'media'],
      ['dc:creator', 'creator'],
      ['dc:date', 'date'],
    ]
  },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
    timeout: 10000,
  },
  maxRedirects: 5,
});

/**
 * Clean RSS content - remove extra whitespace, HTML tags, and junk
 */
export function cleanRssContent(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&apos;/g, "'");
  
  // Remove common date patterns
  cleaned = cleaned.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, '');
  cleaned = cleaned.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, '');
  
  // Remove time patterns
  cleaned = cleaned.replace(/\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b/g, '');
  
  // Remove common junk patterns
  cleaned = cleaned.replace(/\b(Updated|Published|Last updated):\s*[^\n]+\n?/gi, '');
  cleaned = cleaned.replace(/\b(Share|Tweet|Like|Follow|Subscribe)[^\n]*\n?/gi, '');
  cleaned = cleaned.replace(/\b(Advertisement|Ad|Sponsored)[^\n]*\n?/gi, '');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // Remove leading/trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // Remove empty lines at start and end
  cleaned = cleaned.replace(/^\n+|\n+$/g, '');
  
  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Normalize RSS URL - add /feed/ if missing for common domains
 */
export function normalizeRssUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    const feedDomains = ['techcrunch.com', 'www.techcrunch.com'];
    
    if (feedDomains.includes(hostname) && (pathname === '/' || pathname === '')) {
      urlObj.pathname = '/feed/';
      logger.debug(`[RSS] Normalizing URL: ${url} -> ${urlObj.toString()}`);
      return urlObj.toString();
    }
    
    if (!pathname.includes('feed') && !pathname.includes('rss')) {
      if (feedDomains.includes(hostname)) {
        urlObj.pathname = '/feed/';
        logger.debug(`[RSS] Normalizing URL: ${url} -> ${urlObj.toString()}`);
        return urlObj.toString();
      }
    }
    
    return url;
  } catch (error: any) {
    logger.error(`[RSS] Error normalizing URL ${url}`, { url });
    return url;
  }
}

/**
 * Сортировка новостей: сначала по score (desc), потом по дате (desc)
 */
export function sortNewsByScoreAndDate<T extends { aiScore: number | null; publishedAt: Date | null }>(
  items: T[]
): T[] {
  return items.sort((a, b) => {
    if (a.aiScore === null && b.aiScore === null) {
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    }
    if (a.aiScore === null) return 1;
    if (b.aiScore === null) return -1;
    if (b.aiScore !== a.aiScore) return b.aiScore - a.aiScore;
    const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bDate - aDate;
  });
}

/**
 * Фильтр по score категории
 */
export function filterByScoreCategory(itemScore: number, category: string): boolean {
  switch (category) {
    case 'high':
      return itemScore >= 80;
    case 'medium':
      return itemScore >= 50 && itemScore < 80;
    case 'low':
      return itemScore < 50;
    default:
      return true;
  }
}

/**
 * Парсинг JSONB поля (для articleAnalysis, articleTranslation)
 */
export function parseJsonbField(value: any): any {
  if (!value || value === null || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}
