import Parser from "rss-parser";
import { storage } from "../storage";
import { scoreNewsItem } from "../ai-service";

const rssParser = new Parser();

/**
 * Parse RSS feed and save items to database
 * Runs in background without blocking the response
 */
export async function parseRssSource(sourceId: string, url: string, userId: string) {
  try {
    console.log(`[RSS] Parsing source ${sourceId}: ${url}`);
    const feed = await rssParser.parseURL(url);

    let itemCount = 0;
    const createdItems: any[] = [];

    for (const item of feed.items.slice(0, 20)) { // Limit to 20 items
      try {
        const rssItem = await storage.createRssItem({
          sourceId,
          title: item.title || 'Untitled',
          url: item.link || url,
          content: item.contentSnippet || item.content || '',
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          aiScore: null,
          aiComment: null,
        });
        createdItems.push(rssItem);
        itemCount++;
      } catch (err) {
        console.error(`[RSS] Failed to save item:`, err);
      }
    }

    await storage.updateRssSource(sourceId, userId, {
      parseStatus: 'success',
      lastParsed: new Date(),
      itemCount,
      parseError: null,
    });

    console.log(`[RSS] Successfully parsed ${itemCount} items from ${sourceId}`);

    // Trigger AI scoring in background
    scoreRssItems(createdItems, userId).catch(err =>
      console.error('AI scoring failed:', err)
    );

  } catch (error: any) {
    console.error(`[RSS] Parsing failed for ${sourceId}:`, error);
    await storage.updateRssSource(sourceId, userId, {
      parseStatus: 'error',
      parseError: error.message || 'Failed to parse RSS feed',
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
          apiKey.encryptedKey, // This is decrypted in getUserApiKey
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
