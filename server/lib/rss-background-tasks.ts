import Parser from "rss-parser";
import { storage } from "../storage";
import { scoreNewsItem } from "../ai-services";
import { logger } from "../lib/logger";

/**
 * Clean RSS content - remove extra whitespace, HTML tags, and junk
 */
function cleanRssContent(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove HTML tags if present
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
  cleaned = cleaned.replace(/\s+/g, ' '); // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Replace 3+ newlines with 2
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Replace tabs and multiple spaces

  // Remove leading/trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // Remove empty lines at start and end
  cleaned = cleaned.replace(/^\n+|\n+$/g, '');

  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// Configure parser with more lenient XML parsing options
const rssParser = new Parser({
  // Remove xml2js options that might cause issues - use defaults
  // xml2js options are handled internally by rss-parser
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['media:content', 'media'],
      ['dc:creator', 'creator'],
      ['dc:date', 'date'],
    ]
  },
  // Request options for better compatibility
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
    timeout: 10000, // 10 seconds timeout
  },
  // Maximum redirects
  maxRedirects: 5,
});

/**
 * Normalize RSS URL - add /feed/ if missing for common domains
 */
function normalizeRssUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Common domains that need /feed/ suffix
    const feedDomains = ['techcrunch.com', 'www.techcrunch.com'];
    
    // If it's a feed domain and path is empty or just "/", add /feed/
    if (feedDomains.includes(hostname) && (pathname === '/' || pathname === '')) {
      urlObj.pathname = '/feed/';
      logger.debug(`[RSS] Normalizing URL: ${url} -> ${urlObj.toString()}`);
      return urlObj.toString();
    }
    
    // If path doesn't contain 'feed' or 'rss', try to find RSS link
    if (!pathname.includes('feed') && !pathname.includes('rss')) {
      // For known domains, try /feed/ first
      if (feedDomains.includes(hostname)) {
        urlObj.pathname = '/feed/';
        logger.debug(`[RSS] Normalizing URL: ${url} -> ${urlObj.toString()}`);
        return urlObj.toString();
      }
    }
    
    return url;
  } catch (error) {
    logger.error(`[RSS] Error normalizing URL ${url}`, { url, error: error.message });
    return url;
  }
}

/**
 * Parse RSS feed and save items to database
 * Runs in background without blocking the response
 */
export async function parseRssSource(sourceId: string, url: string, userId: string) {
  try {
    // Normalize URL (add /feed/ if needed)
    const normalizedUrl = normalizeRssUrl(url);
    
    logger.info(`[RSS] Parsing source ${sourceId}`, { sourceId, url, normalizedUrl, userId });
    
    let feed;
    try {
      feed = await rssParser.parseURL(normalizedUrl);
      logger.info(`[RSS] Feed parsed successfully`, { 
        sourceId, 
        feedTitle: feed.title,
        feedItemsCount: feed.items?.length || 0 
      });
    } catch (parseError: any) {
      logger.error(`[RSS] Failed to parse feed`, {
        sourceId,
        url: normalizedUrl,
        error: parseError.message,
        errorType: parseError.constructor?.name,
        stack: parseError.stack,
      });
      
      // Try alternative URL if original failed
      if (normalizedUrl.endsWith('/feed/')) {
        const altUrl = normalizedUrl.replace('/feed/', '/feed');
        logger.info(`[RSS] Trying alternative URL: ${altUrl}`);
        try {
          feed = await rssParser.parseURL(altUrl);
          logger.info(`[RSS] Alternative URL worked!`, { 
            sourceId, 
            feedTitle: feed.title,
            feedItemsCount: feed.items?.length || 0 
          });
        } catch (altError: any) {
          logger.error(`[RSS] Alternative URL also failed`, {
            sourceId,
            altUrl,
            error: altError.message,
          });
          throw parseError; // Throw original error
        }
      } else {
        throw parseError;
      }
    }

    let newItemCount = 0;
    let existingCount = 0;
    const createdItems: any[] = [];

    logger.info(`[RSS] Feed has ${feed.items.length} items, processing first 20...`, {
      sourceId,
      totalItems: feed.items.length
    });

    for (const item of feed.items.slice(0, 20)) { // Limit to 20 items
      const itemData = {
        sourceId,
        userId, // Add userId to link items to user
        title: item.title || 'Untitled',
        url: item.link || url,
        content: cleanRssContent(item.contentSnippet || item.content || ''),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        aiScore: null,
        aiComment: null,
      };

      // Use createRssItemIfNotExists to handle duplicates gracefully
      const rssItem = await storage.createRssItemIfNotExists(itemData);

      if (rssItem) {
        createdItems.push(rssItem);
        newItemCount++;
        logger.info(`[RSS] ✅ Saved new item`, {
          sourceId,
          itemId: rssItem.id,
          title: item.title?.substring(0, 50)
        });
      } else {
        existingCount++;
        logger.debug(`[RSS] ⏭️ Item already exists`, {
          sourceId,
          title: item.title?.substring(0, 50),
          url: item.link?.substring(0, 100),
        });
      }
    }

    logger.info(`[RSS] Processed items`, {
      sourceId,
      processed: feed.items.slice(0, 20).length,
      new: newItemCount,
      existing: existingCount
    });

    // Update source with results - show success if items exist (even if all were duplicates)
    const totalInFeed = feed.items.length;
    const errorMessage = null; // No error if parsing succeeded

    await storage.updateRssSource(sourceId, userId, {
      parseStatus: 'success', // Always success if we parsed the feed
      lastParsed: new Date(),
      itemCount: newItemCount + existingCount, // Total processed
      parseError: errorMessage,
    });

    if (newItemCount > 0) {
      logger.info(`[RSS] Successfully parsed ${newItemCount} new items from ${sourceId}`, {
        sourceId,
        newItems: newItemCount,
        existingItems: existingCount
      });
    } else if (existingCount > 0) {
      logger.info(`[RSS] Parsed ${sourceId}: all ${existingCount} items already exist`, {
        sourceId,
        existingItems: existingCount
      });
    } else {
      logger.warn(`[RSS] Parsed ${sourceId} but found no items`, {
        sourceId,
        feedItemsCount: feed.items.length
      });
    }

    // Trigger AI scoring in background
    scoreRssItems(createdItems, userId).catch(err =>
      console.error('AI scoring failed:', err)
    );

  } catch (error: any) {
    console.error(`[RSS] Parsing failed for ${sourceId}:`, error);
    
    // Try to extract more helpful error message
    let errorMessage = error.message || 'Failed to parse RSS feed';
    if (error.message?.includes('Invalid character in entity name')) {
      errorMessage = `XML parsing error: ${error.message}. The RSS feed may contain invalid characters. Try using the feed URL (e.g., https://techcrunch.com/feed/) instead of the main site URL.`;
    }
    
    await storage.updateRssSource(sourceId, userId, {
      parseStatus: 'error',
      parseError: errorMessage,
    });
  }
}

/**
 * Score RSS items using AI in background
 */
export async function scoreRssItems(items: any[], userId: string) {
  try {
    // Get user's Anthropic API key
    const apiKey = await storage.getUserApiKey(userId, 'anthropic');
    if (!apiKey) {
      console.log('[AI] No Anthropic API key found for user, skipping scoring');
      return;
    }

    console.log(`[AI] Scoring ${items.length} RSS items...`);

    for (const item of items) {
      try {
        const result = await scoreNewsItem(
          apiKey.decryptedKey, // Decrypted value from getUserApiKey
          item.title,
          item.content
        );

        // Update the item with AI score
        await storage.updateRssItem(item.id, {
          aiScore: result.score,
          aiComment: result.comment,
        });

        console.log(`[AI] Scored item "${item.title}": ${result.score}/100`);
      } catch (err) {
        console.error(`[AI] Failed to score item "${item.title}":`, err);
      }
    }

    console.log(`[AI] Finished scoring ${items.length} RSS items`);
  } catch (error: any) {
    console.error('[AI] RSS scoring error:', error);
  }
}
