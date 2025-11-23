import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import Parser from "rss-parser";
import { fetchAndExtract } from "../lib/fetch-and-extract";
import { scoreRssItems } from "./helpers/background-tasks";

const rssParser = new Parser();

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
        console.log(`[AI] Found ${itemsWithoutScore.length} items without AI score, starting auto-scoring...`);
        scoreRssItems(itemsWithoutScore, userId).catch(err =>
          console.error('[AI] Auto-scoring failed:', err)
        );
      }

      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching news items:", error);
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
    } catch (error) {
      console.error("Error fetching news item score:", error);
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
    } catch (error) {
      console.error("Error updating news item action:", error);
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
          const feed = await rssParser.parseURL(source.url);
          const existingUrls = new Set((await storage.getRssItemsBySource(source.id)).map(item => item.url));

          for (const item of feed.items) {
            if (!existingUrls.has(item.link || '')) {
              await storage.createRssItem({
                sourceId: source.id,
                userId,
                title: item.title || 'Untitled',
                url: item.link || '',
                content: item.contentSnippet || item.content || '',
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
          console.error(`Error parsing RSS ${source.name}:`, error);
          await storage.updateRssSource(source.id, userId, {
            parseStatus: 'error',
            parseError: error.message,
          });
        }
      }

      res.json({ success: true, newItems: totalNew });
    } catch (error) {
      console.error("Error refreshing news:", error);
      res.status(500).json({ message: "Failed to refresh news" });
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
          console.log(`[Article Extractor] Using cached content for ${item.url} (${age / 1000}s old)`);
          return res.json({ success: true, content: item.fullContent, cached: true });
        }
      }

      // Extract full content
      const result = await fetchAndExtract(item.url);
      if (!result.ok) {
        console.warn(`[Article Extractor] Failed to extract ${item.url}: ${result.reason}`);
        return res.json({ success: false, error: result.reason, fallback: item.content });
      }

      // Save full content to database
      await storage.updateRssItem(id, {
        fullContent: result.content,
        lastFetchedAt: new Date(),
      });
      console.log(`[Article Extractor] Successfully extracted and cached content for ${item.url}`);

      res.json({ success: true, content: result.content, cached: false });
    } catch (error: any) {
      console.error("Error fetching full article content:", error);
      res.status(500).json({ message: "Failed to fetch article content", error: error.message });
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
        console.log(`[Extended Parse] User requested date range: ${startDate} to ${endDate}`);
        console.log('[Extended Parse] Note: RSS feeds typically only provide latest items');
      }

      let totalNew = 0;
      let totalProcessed = 0;
      for (const source of sources.filter(s => s.isActive)) {
        try {
          const feed = await rssParser.parseURL(source.url);
          const existingUrls = new Set((await storage.getRssItemsBySource(source.id)).map(item => item.url));

          for (const item of feed.items) {
            totalProcessed++;
            if (!existingUrls.has(item.link || '')) {
              await storage.createRssItem({
                sourceId: source.id,
                userId,
                title: item.title || 'Untitled',
                url: item.link || '',
                content: item.contentSnippet || item.content || '',
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
          console.error(`Error parsing RSS ${source.name} (extended):`, error);
          await storage.updateRssSource(source.id, userId, {
            parseStatus: 'error',
            parseError: error.message,
          });
        }
      }

      res.json({ success: true, newItems: totalNew, totalProcessed });
    } catch (error) {
      console.error("Error in extended refresh:", error);
      res.status(500).json({ message: "Failed to perform extended refresh" });
    }
  });
}
