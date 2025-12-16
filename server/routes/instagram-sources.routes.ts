import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId, normalizeInstagramUsername } from "../utils/route-helpers";
import { insertInstagramSourceSchema } from "@shared/schema";
import { scrapeInstagramReels, testApifyApiKey } from "../apify-service";
import { downloadInstagramMediaBackground } from "../lib/instagram-background-tasks";
import { logger } from "../lib/logger";
import { z } from "zod";
import { checkSourceForUpdates } from "../cron/instagram-monitor";
import { db } from "../db";
import { instagramSources } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Instagram sources management routes
 * Handles CRUD operations and scraping for Instagram sources
 */
export function registerInstagramSourcesRoutes(app: Express) {
  // GET /api/settings/instagram-sources - Get all Instagram sources
  app.get("/api/settings/instagram-sources", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const sources = await storage.getInstagramSources(userId);
      res.json(sources);
    } catch (error: any) {
      logger.error("Error fetching Instagram sources", { error: error.message });
      res.status(500).json({ message: "Failed to fetch Instagram sources" });
    }
  });

  // POST /api/settings/instagram-sources - Create new Instagram source
  app.post("/api/settings/instagram-sources", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      // Normalize Instagram username (remove @, extract from URLs)
      if (req.body.username) {
        req.body.username = normalizeInstagramUsername(req.body.username);
      }

      const validated = insertInstagramSourceSchema.parse(req.body);
      const source = await storage.createInstagramSource(userId, validated);

      // Auto-parse on creation (like RSS sources)
      // Run in background to avoid blocking the response
      (async () => {
        try {
          // Get Apify API key
          const apifyKey = await storage.getUserApiKey(userId, 'apify');
          
          if (!apifyKey) {
            logger.warn("Instagram source created but no Apify key configured", { 
              sourceId: source.id, 
              username: source.username 
            });
            return;
          }

          // Update status to 'parsing'
          await storage.updateInstagramSource(source.id, userId, {
            parseStatus: 'parsing',
            parseError: null
          });

          logger.info("Auto-parsing new Instagram source", { 
            sourceId: source.id, 
            username: source.username 
          });

          // Parse latest 50 Reels
          const result = await scrapeInstagramReels(
            source.username,
            apifyKey.decryptedKey,
            50
          );

          if (result.success) {
            // Save Reels to database
            let savedCount = 0;
            let skippedCount = 0;

            for (const reel of result.items) {
              try {
                const item = await storage.createInstagramItem({
                  sourceId: source.id,
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

                // Download video in background
                downloadInstagramMediaBackground(item.id, reel.videoUrl, reel.thumbnailUrl || null, userId);
              } catch (error: any) {
                if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
                  skippedCount++;
                } else {
                  logger.error("Error saving Reel during auto-parse", { 
                    shortCode: reel.shortCode, 
                    error: error.message 
                  });
                }
              }
            }

            // Find most recent Reel
            const latestReel = result.items.reduce((latest, current) => {
              if (!current.timestamp) return latest;
              if (!latest || !latest.timestamp) return current;
              return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
            }, result.items[0]);

            // Update source with success status
            await storage.updateInstagramSource(source.id, userId, {
              parseStatus: 'success',
              lastParsed: new Date(),
              itemCount: savedCount,
              parseError: null,
              lastScrapedDate: latestReel?.timestamp ? new Date(latestReel.timestamp) : new Date(),
              lastScrapedReelId: latestReel?.id || null,
            });

            logger.info("Auto-parse completed", { 
              sourceId: source.id,
              username: source.username, 
              savedCount, 
              skippedCount 
            });
          } else {
            await storage.updateInstagramSource(source.id, userId, {
              parseStatus: 'error',
              parseError: result.error || 'Auto-parse failed',
            });
            
            logger.error("Auto-parse failed", { 
              sourceId: source.id,
              username: source.username,
              error: result.error 
            });
          }
        } catch (error: any) {
          logger.error("Error in auto-parse", { 
            sourceId: source.id, 
            error: error.message 
          });
          
          await storage.updateInstagramSource(source.id, userId, {
            parseStatus: 'error',
            parseError: error.message || 'Auto-parse error',
          }).catch(err => logger.error("Failed to update error status", { error: err.message }));
        }
      })();

      res.json(source);
    } catch (error: any) {
      logger.error("Error creating Instagram source", { error: error.message });
      res.status(400).json({ message: "Failed to create Instagram source" });
    }
  });

  // DELETE /api/settings/instagram-sources/:id - Delete Instagram source
  app.delete("/api/settings/instagram-sources/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      await storage.deleteInstagramSource(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error("Error deleting Instagram source", { error: error.message });
      res.status(500).json({ message: "Failed to delete Instagram source" });
    }
  });

  // POST /api/instagram/sources/:id/parse - Scrape Instagram Reels from source
  app.post("/api/instagram/sources/:id/parse", requireAuth, async (req: any, res) => {
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
      logger.debug("Testing Apify API key before scraping");
      const isValidKey = await testApifyApiKey(apifyKey.decryptedKey);

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

      logger.info("Starting Instagram parse", { username: source.username, resultsLimit });

      // Start scraping (this will take some time)
      const result = await scrapeInstagramReels(
        source.username,
        apifyKey.decryptedKey, // Decrypted value from getUserApiKey
        resultsLimit
      );

      if (result.success) {
        logger.info("Successfully parsed Instagram Reels", { username: source.username, itemCount: result.itemCount });

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
              logger.debug("Skipping duplicate Reel", { shortCode: reel.shortCode });
              skippedCount++;
            } else {
              logger.error("Error saving Reel", { shortCode: reel.shortCode, error: error.message });
            }
          }
        }

        logger.info("Instagram parse completed", { savedCount, skippedCount });

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
      logger.error("Error parsing Instagram source", { error: error.message });
      res.status(500).json({ message: "Failed to parse Instagram source" });
    }
  });

  // POST /api/instagram/sources/:id/check-now - Manually check Instagram source for new Reels
  app.post("/api/instagram/sources/:id/check-now", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

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

      logger.info("Manual check initiated", { username: source.username, userId });

      try {
        // Use the same logic as cron job for consistency
        const result = await checkSourceForUpdates(source);

        logger.info("Manual check completed", { 
          username: source.username, 
          newReelsCount: result.newReelsCount,
          viralReelsCount: result.viralReelsCount,
        });

        res.json({
          success: true,
          newReelsCount: result.newReelsCount,
          viralReelsCount: result.viralReelsCount,
          message: result.newReelsCount > 0 
            ? `Found ${result.newReelsCount} new Reels${result.viralReelsCount > 0 ? ` (${result.viralReelsCount} viral)` : ''}`
            : 'No new Reels found'
        });
      } catch (checkError: any) {
        logger.error("Manual check failed", { 
          username: source.username, 
          error: checkError.message 
        });

        res.status(500).json({
          success: false,
          message: checkError.message || "Failed to check for new Reels"
        });
      }
    } catch (error: any) {
      logger.error("Error in manual Instagram check", { error: error.message });
      res.status(500).json({ message: "Failed to check Instagram source" });
    }
  });
}
