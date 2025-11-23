import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit-auth";
import { getUserId, normalizeInstagramUsername } from "../utils/route-helpers";
import { insertInstagramSourceSchema } from "@shared/schema";
import { scrapeInstagramReels, testApifyApiKey } from "../apify-service";
import { downloadInstagramMediaBackground } from "../lib/instagram-background-tasks";
import { z } from "zod";

/**
 * Instagram sources management routes
 * Handles CRUD operations and scraping for Instagram sources
 */
export function registerInstagramSourcesRoutes(app: Express) {
  // GET /api/settings/instagram-sources - Get all Instagram sources
  app.get("/api/settings/instagram-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const sources = await storage.getInstagramSources(userId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching Instagram sources:", error);
      res.status(500).json({ message: "Failed to fetch Instagram sources" });
    }
  });

  // POST /api/settings/instagram-sources - Create new Instagram source
  app.post("/api/settings/instagram-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Normalize Instagram username (remove @, extract from URLs)
      if (req.body.username) {
        req.body.username = normalizeInstagramUsername(req.body.username);
      }

      const validated = insertInstagramSourceSchema.parse(req.body);
      const source = await storage.createInstagramSource(userId, validated);

      // NOTE: Auto-parsing disabled for Instagram (unlike RSS) because:
      // 1. Requires Apify API key (user may not have it configured yet)
      // 2. Apify scraping takes 1-3 minutes (too long for auto-trigger)
      // 3. User can manually trigger via /api/instagram/sources/:id/parse endpoint

      res.json(source);
    } catch (error: any) {
      console.error("Error creating Instagram source:", error);
      res.status(400).json({ message: error.message || "Failed to create Instagram source" });
    }
  });

  // DELETE /api/settings/instagram-sources/:id - Delete Instagram source
  app.delete("/api/settings/instagram-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await storage.deleteInstagramSource(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting Instagram source:", error);
      res.status(500).json({ message: "Failed to delete Instagram source" });
    }
  });

  // POST /api/instagram/sources/:id/parse - Scrape Instagram Reels from source
  app.post("/api/instagram/sources/:id/parse", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { resultsLimit = 50 } = req.body;

      // Get Instagram source and verify ownership
      const sources = await storage.getInstagramSources(userId);
      const source = sources.find(s => s.id === id);

      if (!source) {
        return res.status(404).json({ message: "Instagram source not found" });
      }

      // Get Apify API key (decrypted)
      const apifyKey = await storage.getUserApiKey(userId, 'apify');

      if (!apifyKey) {
        return res.status(400).json({
          message: "Apify API key not configured. Please add it in Settings."
        });
      }

      // Test Apify API key before scraping
      console.log(`[Instagram] Testing Apify API key before scraping...`);
      const isValidKey = await testApifyApiKey(apifyKey.encryptedKey);

      if (!isValidKey) {
        return res.status(400).json({
          message: "Invalid Apify API key. Please check your credentials in Settings."
        });
      }

      // Update status to 'parsing'
      await storage.updateInstagramSource(id, userId, {
        parseStatus: 'parsing',
        parseError: null
      });

      console.log(`[Instagram] Starting to parse @${source.username} (limit: ${resultsLimit})`);

      // Start scraping (this will take some time)
      const result = await scrapeInstagramReels(
        source.username,
        apifyKey.encryptedKey, // Already decrypted by getUserApiKey
        resultsLimit
      );

      if (result.success) {
        console.log(`[Instagram] Successfully parsed ${result.itemCount} Reels from @${source.username}`);

        // Save Reels to database
        let savedCount = 0;
        let skippedCount = 0;

        for (const reel of result.items) {
          try {
            const item = await storage.createInstagramItem({
              sourceId: id,
              userId,
              externalId: reel.shortCode,
              shortCode: reel.shortCode,
              caption: reel.caption || null,
              url: reel.url,
              videoUrl: reel.videoUrl,
              thumbnailUrl: reel.thumbnailUrl || null,
              videoDuration: reel.videoDuration || null,
              likesCount: reel.likesCount,
              commentsCount: reel.commentsCount,
              videoViewCount: reel.videoViewCount || null,
              videoPlayCount: reel.videoPlayCount || null,
              sharesCount: reel.sharesCount || null,
              hashtags: reel.hashtags || [],
              mentions: reel.mentions || [],
              ownerUsername: reel.ownerUsername || null,
              ownerFullName: reel.ownerFullName || null,
              ownerId: reel.ownerId || null,
              musicInfo: reel.musicInfo || null,
              aiScore: null,
              aiComment: null,
              userAction: null,
              actionAt: null,
              usedInProject: null,
              freshnessScore: null,
              viralityScore: null,
              qualityScore: null,
              publishedAt: reel.timestamp ? new Date(reel.timestamp) : null,
              downloadStatus: 'pending',
            });

            savedCount++;

            // Download video in background (Apify URLs expire in 24-48h!)
            downloadInstagramMediaBackground(item.id, reel.videoUrl, reel.thumbnailUrl || null, userId);

          } catch (error: any) {
            if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
              console.log(`[Instagram] Skipping duplicate Reel: ${reel.shortCode}`);
              skippedCount++;
            } else {
              console.error(`[Instagram] Error saving Reel ${reel.shortCode}:`, error.message);
            }
          }
        }

        console.log(`[Instagram] Saved ${savedCount} new Reels, skipped ${skippedCount} duplicates`);

        // Find the most recent Reel
        const latestReel = result.items.reduce((latest, current) => {
          if (!current.timestamp) return latest;
          if (!latest || !latest.timestamp) return current;
          return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
        }, result.items[0]);

        // Update source with success status
        await storage.updateInstagramSource(id, userId, {
          parseStatus: 'success',
          lastParsed: new Date(),
          itemCount: result.itemCount,
          parseError: null,
          lastScrapedDate: latestReel?.timestamp ? new Date(latestReel.timestamp) : new Date(),
          lastScrapedReelId: latestReel?.id || null,
        });

        res.json({
          success: true,
          itemCount: result.itemCount,
          savedCount,
          skippedCount,
        });
      } else {
        await storage.updateInstagramSource(id, userId, {
          parseStatus: 'error',
          parseError: result.error || 'Unknown error',
        });

        res.status(500).json({
          success: false,
          message: result.error || 'Failed to scrape Instagram Reels',
        });
      }
    } catch (error: any) {
      console.error("Error parsing Instagram source:", error);
      res.status(500).json({ message: error.message || "Failed to parse Instagram source" });
    }
  });
}
