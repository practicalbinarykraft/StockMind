import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import Parser from "rss-parser";
import { fetchAndExtract } from "../lib/fetch-and-extract";

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
import { scoreRssItems } from "./helpers/background-tasks";
import { logger } from "../lib/logger";

// Use the same parser configuration as background tasks for consistency
const rssParser = new Parser({
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
    timeout: 10000, // 10 seconds timeout
  },
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
  } catch (error: any) {
    logger.error(`[RSS] Error normalizing URL ${url}`, { url });
    return url;
  }
}

/**
 * News/RSS Items routes
 * Handles fetching, scoring, refreshing, and managing news feed items
 */
export function registerNewsRoutes(app: Express) {
  // GET /api/news - Get all news items with enriched data
  app.get("/api/news", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const items = await storage.getRssItems(userId);

      // Add freshness label and normalize score field
      const enrichedItems = items.map(item => {
        let freshnessLabel = 'old';
        if (item.publishedAt) {
          const hoursAgo = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
          if (hoursAgo < 1) freshnessLabel = 'hot';
          else if (hoursAgo < 6) freshnessLabel = 'trending';
          else if (hoursAgo < 24) freshnessLabel = 'recent';
        }
        const score = item.aiScore ?? item.freshnessScore ?? item.viralityScore ?? null;
        return { ...item, freshnessLabel, score };
      });

      // Auto-score items without AI score in background
      const itemsWithoutScore = items.filter(item => item.aiScore === null);
      if (itemsWithoutScore.length > 0) {
        logger.debug("Starting auto-scoring for items without AI score", { count: itemsWithoutScore.length });
        scoreRssItems(itemsWithoutScore, userId).catch(err =>
          logger.error("Auto-scoring failed", { error: err.message })
        );
      }

      res.json(enrichedItems);
    } catch (error: any) {
      logger.error("Error fetching news items", { error: error.message });
      res.status(500).json({ message: "Failed to fetch news items" });
    }
  });

  // GET /api/news/score/:id - Get AI score for specific news item
  app.get("/api/news/score/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === id);
      if (!item) return res.status(404).json({ message: "News item not found" });

      const score = item.aiScore ?? item.freshnessScore ?? item.viralityScore ?? null;
      res.json({
        id: item.id,
        score,
        aiScore: item.aiScore,
        freshnessScore: item.freshnessScore,
        viralityScore: item.viralityScore,
        aiComment: item.aiComment,
      });
    } catch (error: any) {
      logger.error("Error fetching news item score", { error: error.message });
      res.status(500).json({ message: "Failed to fetch score" });
    }
  });

  // PATCH /api/news/:id/action - Update item action (dismiss, select, seen)
  app.patch("/api/news/:id/action", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const { action, projectId } = req.body;

      const updated = await storage.updateRssItemAction(id, userId, action, projectId);
      if (!updated) return res.status(404).json({ message: "News item not found" });

      res.json({ success: true, item: updated });
    } catch (error: any) {
      logger.error("Error updating news item action", { error: error.message });
      res.status(500).json({ message: "Failed to update news item" });
    }
  });

  // POST /api/news/refresh - Manual refresh from RSS sources
  app.post("/api/news/refresh", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const sources = await storage.getRssSources(userId);

      let totalNew = 0;
      for (const source of sources.filter(s => s.isActive)) {
        try {
          const normalizedUrl = normalizeRssUrl(source.url);
          const feed = await rssParser.parseURL(normalizedUrl);
          const existingUrls = new Set((await storage.getRssItemsBySource(source.id)).map(item => item.url));

          for (const item of feed.items) {
            if (!existingUrls.has(item.link || '')) {
              await storage.createRssItem({
                sourceId: source.id,
                userId,
                title: item.title || 'Untitled',
                url: item.link || '',
                content: cleanRssContent(item.contentSnippet || item.content || ''),
                imageUrl: item.enclosure?.url || null,
                publishedAt: item.pubDate ? new Date(item.pubDate) : null,
              });
              totalNew++;
            }
          }

          await storage.updateRssSource(source.id, userId, {
            lastParsed: new Date(),
            parseStatus: 'success',
            itemCount: feed.items.length,
          });
        } catch (error: any) {
          logger.error(`Error parsing RSS ${source.name}:`, { error: error.message, url: source.url });
          await storage.updateRssSource(source.id, userId, {
            parseStatus: 'error',
            parseError: error.message,
          });
        }
      }

      res.json({ success: true, newItems: totalNew });
    } catch (error: any) {
      logger.error("Error refreshing news", { error: error.message });
      res.status(500).json({ message: "Failed to refresh news" });
    }
  });

  // GET /api/news/:id/analysis - Get saved analysis for an article
  app.get("/api/news/:id/analysis", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        logger.warn(`[News Analysis] Unauthorized request for article analysis`);
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      
      const { id } = req.params;
      logger.info(`[News Analysis] Fetching analysis for article ${id}`, { userId });

      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === id);
      
      if (!item) {
        logger.warn(`[News Analysis] Article ${id} not found for user ${userId}`);
        return res.status(404).json({ success: false, error: "News item not found" });
      }

      const analysis = (item as any).articleAnalysis;
      if (!analysis) {
        logger.info(`[News Analysis] No saved analysis found for article ${id}`);
        return res.status(404).json({ success: false, error: "No saved analysis found for this article" });
      }

      logger.info(`[News Analysis] ✅ Returning saved analysis for article ${id}`, {
        hasScore: !!analysis.score,
        verdict: analysis.verdict,
      });
      
      return res.json({ success: true, data: analysis });
    } catch (error: any) {
      logger.error("[News Analysis] ❌ Error fetching article analysis:", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch analysis",
        message: error.message 
      });
    }
  });

  // POST /api/news/:id/fetch-full-content - Fetch full article via web scraping
  app.post("/api/news/:id/fetch-full-content", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === id);
      if (!item) return res.status(404).json({ message: "News item not found" });

      // Check if full content was recently fetched (within 6 hours)
      const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
      if (item.fullContent && item.lastFetchedAt) {
        const age = Date.now() - new Date(item.lastFetchedAt).getTime();
        if (age < SIX_HOURS_MS && item.fullContent.length >= 500) {
          logger.debug("Using cached article content", { url: item.url, ageSeconds: Math.round(age / 1000) });
          return res.json({ success: true, content: item.fullContent, cached: true });
        }
      }

      // Extract full content
      const result = await fetchAndExtract(item.url);
      if (!result.ok) {
        logger.warn("Failed to extract article", { url: item.url, reason: result.reason });
        return res.json({ success: false, error: result.reason, fallback: item.content });
      }

      // Save full content to database
      await storage.updateRssItem(id, {
        fullContent: result.content,
        lastFetchedAt: new Date(),
      });
      logger.info("Successfully extracted and cached article content", { url: item.url });

      res.json({ success: true, content: result.content, cached: false });
    } catch (error: any) {
      logger.error("Error fetching full article content", { error: error.message });
      res.status(500).json({ message: "Failed to fetch article content" });
    }
  });

  // POST /api/news/refresh-extended - Extended parsing (all available items)
  app.post("/api/news/refresh-extended", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { startDate, endDate } = req.body;
      const sources = await storage.getRssSources(userId);

      if (startDate && endDate) {
        logger.debug("Extended parse with date range", { startDate, endDate, note: "RSS feeds typically only provide latest items" });
      }

      let totalNew = 0;
      let totalProcessed = 0;
      for (const source of sources.filter(s => s.isActive)) {
        try {
          const normalizedUrl = normalizeRssUrl(source.url);
          const feed = await rssParser.parseURL(normalizedUrl);
          const existingUrls = new Set((await storage.getRssItemsBySource(source.id)).map(item => item.url));

          for (const item of feed.items) {
            totalProcessed++;
            if (!existingUrls.has(item.link || '')) {
              await storage.createRssItem({
                sourceId: source.id,
                userId,
                title: item.title || 'Untitled',
                url: item.link || '',
                content: cleanRssContent(item.contentSnippet || item.content || ''),
                imageUrl: item.enclosure?.url || null,
                publishedAt: item.pubDate ? new Date(item.pubDate) : null,
              });
              totalNew++;
            }
          }

          await storage.updateRssSource(source.id, userId, {
            lastParsed: new Date(),
            parseStatus: 'success',
            itemCount: feed.items.length,
          });
        } catch (error: any) {
          logger.error(`Error parsing RSS ${source.name} (extended):`, { error: error.message, url: source.url });
          await storage.updateRssSource(source.id, userId, {
            parseStatus: 'error',
            parseError: error.message,
          });
        }
      }

      res.json({ success: true, newItems: totalNew, totalProcessed });
    } catch (error: any) {
      logger.error("Error in extended refresh", { error: error.message });
      res.status(500).json({ message: "Failed to perform extended refresh" });
    }
  });

  // GET /api/news/all - Get all articles with filters (News Hub)
  app.get("/api/news/all", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const { source, score, sort } = req.query;
      let items = await storage.getRssItems(userId);

      // Filter by source
      if (source && source !== "all") {
        items = items.filter(item => item.sourceId === source);
      }

      // Filter by score
      if (score && score !== "all") {
        items = items.filter(item => {
          const itemScore = item.aiScore ?? 0;
          if (score === "high") return itemScore >= 80;
          if (score === "medium") return itemScore >= 50 && itemScore < 80;
          if (score === "low") return itemScore < 50;
          return true;
        });
      }

      // Sort
      if (sort === "score") {
        items.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
      } else {
        // Sort by date (newest first)
        items.sort((a, b) => {
          const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return bDate - aDate;
        });
      }

      // Enrich with source name and include articleAnalysis and articleTranslation
      const sources = await storage.getRssSources(userId);
      const sourceMap = new Map(sources.map(s => [s.id, s.name]));
      const enrichedItems = items.map(item => {
        const enriched = {
          ...item,
          sourceName: sourceMap.get(item.sourceId) || 'Unknown Source',
          // articleAnalysis and articleTranslation are already included from getRssItems() if they exist
        };
        
        // Debug: log if articleAnalysis exists
        if ((item as any).articleAnalysis) {
          logger.debug(`[News All] Article ${item.id} has saved analysis`, {
            score: (item as any).articleAnalysis?.score,
            verdict: (item as any).articleAnalysis?.verdict,
          });
        }
        
        // Debug: log if articleTranslation exists
        if ((item as any).articleTranslation) {
          logger.debug(`[News All] Article ${item.id} has saved translation`, {
            hasText: !!(item as any).articleTranslation?.text,
            language: (item as any).articleTranslation?.language,
          });
        }
        
        return enriched;
      });

      const withAnalysis = enrichedItems.filter(i => (i as any).articleAnalysis).length;
      const withTranslation = enrichedItems.filter(i => (i as any).articleTranslation).length;
      
      // Debug: log first few items to see their structure
      if (enrichedItems.length > 0) {
        const firstItem = enrichedItems[0] as any;
        logger.debug(`[News All] Sample item structure`, {
          id: firstItem.id,
          hasArticleAnalysis: !!firstItem.articleAnalysis,
          articleAnalysisType: typeof firstItem.articleAnalysis,
          articleAnalysisValue: firstItem.articleAnalysis ? 'exists' : 'null/undefined',
          allKeys: Object.keys(firstItem).slice(0, 15),
        });
      }
      
      logger.info(`[News All] Returning ${enrichedItems.length} articles`, {
        withAnalysis,
        withTranslation,
        articleIdsWithAnalysis: enrichedItems
          .filter(i => (i as any).articleAnalysis)
          .map(i => i.id)
          .slice(0, 5),
        articleIdsWithTranslation: enrichedItems
          .filter(i => (i as any).articleTranslation)
          .map(i => i.id)
          .slice(0, 5),
      });

      res.json(enrichedItems);
    } catch (error: any) {
      logger.error("Error fetching all news", { error: error.message });
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // POST /api/news/:id/favorite - Add article to favorites
  app.post("/api/news/:id/favorite", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const { notes } = req.body;

      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === id);
      if (!item) return res.status(404).json({ message: "News item not found" });

      await storage.updateRssItem(id, {
        isFavorite: true,
        favoritedAt: new Date(),
        userNotes: notes || null,
      });

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Error adding to favorites", { error: error.message });
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  // DELETE /api/news/:id/favorite - Remove article from favorites
  app.delete("/api/news/:id/favorite", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === id);
      if (!item) return res.status(404).json({ message: "News item not found" });

      await storage.updateRssItem(id, {
        isFavorite: false,
        favoritedAt: null,
      });

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Error removing from favorites", { error: error.message });
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // GET /api/news/favorites - Get all favorite articles
  app.get("/api/news/favorites", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      let items = await storage.getRssItems(userId);
      items = items.filter(item => item.isFavorite === true);

      // Sort by favorited date (newest first)
      items.sort((a, b) => {
        const aDate = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
        const bDate = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
        return bDate - aDate;
      });

      // Enrich with source name
      const sources = await storage.getRssSources(userId);
      const sourceMap = new Map(sources.map(s => [s.id, s.name]));
      const enrichedItems = items.map(item => ({
        ...item,
        sourceName: sourceMap.get(item.sourceId) || 'Unknown Source'
      }));

      res.json(enrichedItems);
    } catch (error: any) {
      logger.error("Error fetching favorites", { error: error.message });
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });
}
