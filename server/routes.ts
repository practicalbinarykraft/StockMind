// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApiKeySchema, insertRssSourceSchema, insertInstagramSourceSchema, insertProjectSchema, insertProjectStepSchema, instagramItems, instagramSources } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import Parser from "rss-parser";
import { scoreNewsItem, analyzeScript, generateAiPrompt, scoreText, scoreInstagramReel } from "./ai-service";
import { scoreNewsAdvanced, scoreReelAdvanced, scoreCustomScriptAdvanced } from "./ai-service-advanced";
import { fetchVoices, generateSpeech } from "./elevenlabs-service";
import { fetchHeyGenAvatars, generateHeyGenVideo, getHeyGenVideoStatus } from "./heygen-service";
import { generateKieVideo, getKieVideoStatus } from "./kie-service";
import { scrapeInstagramReels, testApifyApiKey } from "./apify-service";
import { downloadInstagramMedia } from "./instagram-download";
import { transcribeInstagramVideo } from "./transcription-service";
import multer from "multer";
import path from "path";
import fs from "fs";

const rssParser = new Parser();

import { fetchAndExtract } from './lib/fetchAndExtract';
import { clampIdemKey, makeIdemKey } from './lib/idempotency';
import { extractScoreDelta, priorityToConfidence } from './lib/reco-utils';
import { testApiKeyByProvider } from './lib/api-key-tester';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Unified userId extraction from request
 * Supports both req.user.id and req.user?.claims?.sub authentication patterns
 */
function getUserId(req: any): string | null {
  return req.user?.id || req.user?.claims?.sub || null;
}

/**
 * Normalize Instagram username
 * Converts @username, URLs (instagram.com/username, ig.me/username) to plain username
 * @param input - Raw username input from user
 * @returns Normalized username (lowercase, alphanumeric + underscore + dot)
 */
function normalizeInstagramUsername(input: string): string {
  let username = input.trim();
  
  // Remove @ prefix
  if (username.startsWith('@')) {
    username = username.slice(1);
  }
  
  // Extract username from URLs
  // Patterns: instagram.com/username, www.instagram.com/username, ig.me/username, instagr.am/username
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/,
    /(?:https?:\/\/)?(?:www\.)?ig\.me\/([a-zA-Z0-9_.]+)/,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/([a-zA-Z0-9_.]+)/,
  ];
  
  for (const pattern of urlPatterns) {
    const match = username.match(pattern);
    if (match && match[1]) {
      username = match[1];
      break;
    }
  }
  
  // Remove trailing slashes
  username = username.replace(/\/+$/, '');
  
  // Validate username (only alphanumeric, underscore, dot allowed)
  // Instagram usernames: 1-30 chars, letters/numbers/underscore/dot
  if (!/^[a-zA-Z0-9_.]{1,30}$/.test(username)) {
    throw new Error(`Invalid Instagram username: "${username}". Must contain only letters, numbers, underscore, and dot (1-30 characters)`);
  }
  
  return username.toLowerCase();
}

// Configure multer for audio file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-m4a', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, WAV, and M4A are allowed.'));
    }
  }
});

// Background download helper for Instagram media
// Downloads video + thumbnail without blocking the response
async function downloadInstagramMediaBackground(
  itemId: string,
  videoUrl: string,
  thumbnailUrl: string | null,
  userId?: string
): Promise<void> {
  try {
    // Update status to 'downloading'
    await storage.updateInstagramItemDownloadStatus(itemId, 'downloading');

    // Download media (with retry logic built-in)
    const result = await downloadInstagramMedia(videoUrl, thumbnailUrl, itemId);

    // Check results
    if (result.video.success) {
      await storage.updateInstagramItemDownloadStatus(
        itemId,
        'completed',
        result.video.localPath,
        result.thumbnail?.localPath,
        undefined
      );
      console.log(`[Instagram] ✅ Downloaded media for item: ${itemId}`);
      
      // Auto-start transcription after successful download (Phase 5)
      if (userId && result.video.localPath) {
        console.log(`[Instagram] 🎙️ Auto-starting transcription for item: ${itemId}`);
        transcribeInstagramItemBackground(itemId, result.video.localPath, userId);
      }
    } else {
      await storage.updateInstagramItemDownloadStatus(
        itemId,
        'failed',
        undefined,
        undefined,
        result.video.error
      );
      console.error(`[Instagram] ❌ Failed to download video for item: ${itemId} - ${result.video.error}`);
    }
  } catch (error: any) {
    console.error(`[Instagram] ❌ Background download error for item ${itemId}:`, error.message);
    await storage.updateInstagramItemDownloadStatus(
      itemId,
      'failed',
      undefined,
      undefined,
      error.message
    ).catch(err => console.error('Failed to update download status:', err));
  }
}

// Background transcription helper for Instagram Reels
// Transcribes downloaded video without blocking the response
async function transcribeInstagramItemBackground(
  itemId: string,
  localVideoPath: string,
  userId: string
): Promise<void> {
  try {
    console.log(`[Transcription] Starting background transcription for item: ${itemId}`);

    // Update status to 'processing' before starting transcription
    await storage.updateInstagramItemTranscription(itemId, 'processing');

    // Transcribe the video using OpenAI Whisper
    const result = await transcribeInstagramVideo(localVideoPath, userId);

    // Check results
    if (result.success) {
      await storage.updateInstagramItemTranscription(
        itemId,
        'completed',
        result.text,
        result.language,
        undefined
      );
      console.log(`[Transcription] ✅ Transcribed item: ${itemId} (${result.text?.length || 0} chars, language: ${result.language})`);
      
      // Auto-start AI scoring after successful transcription (Phase 6)
      if (result.text) {
        console.log(`[AI Score] 🎯 Auto-starting AI analysis for item: ${itemId}`);
        scoreInstagramItemBackground(itemId, userId);
      }
    } else {
      await storage.updateInstagramItemTranscription(
        itemId,
        'failed',
        undefined,
        undefined,
        result.error
      );
      console.error(`[Transcription] ❌ Failed to transcribe item: ${itemId} - ${result.error}`);
    }
  } catch (error: any) {
    console.error(`[Transcription] ❌ Background transcription error for item ${itemId}:`, error.message);
    await storage.updateInstagramItemTranscription(
      itemId,
      'failed',
      undefined,
      undefined,
      error.message
    ).catch(err => console.error('Failed to update transcription status:', err));
  }
}

// Background AI scoring helper for Instagram Reels
// Scores transcribed Reels without blocking the response
async function scoreInstagramItemBackground(
  itemId: string,
  userId: string
): Promise<void> {
  try {
    console.log(`[AI Score] Starting AI analysis for item: ${itemId}`);

    // Get the item with transcription
    const items = await storage.getInstagramItems(userId);
    const item = items.find(i => i.id === itemId);

    if (!item) {
      console.error(`[AI Score] ❌ Item not found: ${itemId}`);
      return;
    }

    if (!item.transcriptionText) {
      console.error(`[AI Score] ❌ No transcription available for item: ${itemId}`);
      return;
    }

    // Get Anthropic API key
    const apiKeyRecord = await storage.getUserApiKey(userId, 'anthropic');
    if (!apiKeyRecord) {
      console.error(`[AI Score] ❌ Anthropic API key not found for user`);
      return;
    }

    const apiKey = apiKeyRecord.encryptedKey; // Already decrypted by storage

    // Score the Reel
    const result = await scoreInstagramReel(
      apiKey,
      item.transcriptionText,
      item.caption,
      {
        likes: item.likesCount,
        comments: item.commentsCount,
        views: item.videoViewCount,
      }
    );

    // Update item with AI scores
    await storage.updateInstagramItemAiScore(
      itemId,
      result.score,
      result.comment,
      result.freshnessScore,
      result.viralityScore,
      result.qualityScore
    );

    console.log(`[AI Score] ✅ Scored item: ${itemId} (overall: ${result.score}, freshness: ${result.freshnessScore}, virality: ${result.viralityScore}, quality: ${result.qualityScore})`);
  } catch (error: any) {
    console.error(`[AI Score] ❌ Background scoring error for item ${itemId}:`, error.message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================
  
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // API KEYS ROUTES
  // ============================================================================

  app.get("/api/settings/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const keys = await storage.getApiKeys(userId);
      
      // Return only safe fields (never send encryptedKey to client)
      const safeKeys = keys.map(key => ({
        id: key.id,
        provider: key.provider,
        last4: key.last4 || null, // null for legacy keys without last4
        description: key.description,
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      }));
      
      res.json(safeKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/settings/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const validated = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(userId, validated);
      
      // Return safe fields only (never send encryptedKey to client)
      const safeApiKey = {
        id: apiKey.id,
        provider: apiKey.provider,
        last4: apiKey.last4 || null, // null for legacy keys without last4
        description: apiKey.description,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      };
      
      res.json(safeApiKey);
    } catch (error: any) {
      console.error("Error creating API key:", error);
      res.status(400).json({ message: error.message || "Failed to create API key" });
    }
  });

  app.delete("/api/settings/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.deleteApiKey(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  app.post("/api/settings/api-keys/:id/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      
      // Get the API key from database (with decrypted value)
      const apiKey = await storage.getApiKeyById(id, userId);
      
      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      // NOTE: apiKey.encryptedKey is misleadingly named - it contains the DECRYPTED key
      // after getApiKeyById() returns (see storage.ts line 239 where it calls decryptApiKey)
      const decryptedKey = apiKey.encryptedKey;
      
      // Test using centralized utility
      const result = await testApiKeyByProvider(apiKey.provider, decryptedKey);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("Error testing API key:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to test API key" 
      });
    }
  });

  // ============================================================================
  // RSS SOURCES ROUTES
  // ============================================================================

  app.get("/api/settings/rss-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const sources = await storage.getRssSources(userId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching RSS sources:", error);
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  });

  app.post("/api/settings/rss-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const validated = insertRssSourceSchema.parse(req.body);
      const source = await storage.createRssSource(userId, validated);

      // Trigger parsing in background (don't await)
      parseRssSource(source.id, source.url, userId).catch(err => 
        console.error(`Background RSS parsing failed for ${source.id}:`, err)
      );

      res.json(source);
    } catch (error: any) {
      console.error("Error creating RSS source:", error);
      res.status(400).json({ message: error.message || "Failed to create RSS source" });
    }
  });

  app.patch("/api/settings/rss-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const source = await storage.updateRssSource(id, userId, req.body);
      if (!source) {
        return res.status(404).json({ message: "RSS source not found" });
      }
      res.json(source);
    } catch (error) {
      console.error("Error updating RSS source:", error);
      res.status(500).json({ message: "Failed to update RSS source" });
    }
  });

  app.delete("/api/settings/rss-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.deleteRssSource(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RSS source:", error);
      res.status(500).json({ message: "Failed to delete RSS source" });
    }
  });

  // ============================================================================
  // INSTAGRAM SOURCES ROUTES
  // ============================================================================

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
      
      // TODO: Future - trigger Apify parsing in background

      res.json(source);
    } catch (error: any) {
      console.error("Error creating Instagram source:", error);
      res.status(400).json({ message: error.message || "Failed to create Instagram source" });
    }
  });

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
            // Try to create Instagram item - unique constraint will prevent duplicates
            const item = await storage.createInstagramItem({
              sourceId: id,
              userId,
              externalId: reel.shortCode, // Use shortCode for consistency with cron
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
              aiScore: null, // Will be scored later
              aiComment: null,
              userAction: null,
              actionAt: null,
              usedInProject: null,
              freshnessScore: null,
              viralityScore: null,
              qualityScore: null,
              publishedAt: reel.timestamp ? new Date(reel.timestamp) : null,
              downloadStatus: 'pending', // Will download in background
            });

            savedCount++;

            // Download video in background (non-blocking)
            // This is critical because Apify URLs expire in 24-48h!
            // After download, auto-transcribe using OpenAI Whisper (Phase 5)
            downloadInstagramMediaBackground(item.id, reel.videoUrl, reel.thumbnailUrl || null, userId);

          } catch (error: any) {
            // Check if error is due to unique constraint violation
            if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
              console.log(`[Instagram] Skipping duplicate Reel: ${reel.shortCode}`);
              skippedCount++;
            } else {
              console.error(`[Instagram] Error saving Reel ${reel.shortCode}:`, error.message);
            }
          }
        }

        console.log(`[Instagram] Saved ${savedCount} new Reels, skipped ${skippedCount} duplicates`);

        // Find the most recent Reel (by publishedAt) to track last scraped
        const latestReel = result.items.reduce((latest, current) => {
          if (!current.timestamp) return latest;
          if (!latest || !latest.timestamp) return current;
          return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest;
        }, result.items[0]);

        // Update source with success status and track last scraped Reel
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
          items: result.items,
        });
      } else {
        // Update source with error status
        await storage.updateInstagramSource(id, userId, {
          parseStatus: 'error',
          parseError: result.error || 'Unknown error',
        });

        console.error(`[Instagram] Failed to parse @${source.username}:`, result.error);

        res.status(500).json({
          success: false,
          message: result.error || 'Failed to scrape Instagram Reels',
        });
      }
    } catch (error: any) {
      console.error("Error parsing Instagram source:", error);
      
      // Update source with error status
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.updateInstagramSource(id, userId, {
        parseStatus: 'error',
        parseError: error.message || 'Unknown error',
      }).catch(err => console.error('Failed to update error status:', err));

      res.status(500).json({ message: error.message || "Failed to parse Instagram source" });
    }
  });

  // Toggle auto-update for Instagram source
  app.patch("/api/instagram/sources/:id/auto-update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      
      // Validate input with Zod
      const autoUpdateSchema = z.object({
        enabled: z.boolean(),
        intervalHours: z.number().int().min(1).max(168).optional(), // 1 hour to 1 week
      });
      
      const validationResult = autoUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.errors 
        });
      }
      
      const { enabled, intervalHours } = validationResult.data;

      // Verify ownership
      const sources = await storage.getInstagramSources(userId);
      const source = sources.find(s => s.id === id);

      if (!source) {
        return res.status(404).json({ message: "Instagram source not found" });
      }

      // Safe interval calculation
      const safeInterval = intervalHours || source.checkIntervalHours || 6;
      
      // Update auto-update settings
      await storage.updateInstagramSource(id, userId, {
        autoUpdateEnabled: enabled,
        checkIntervalHours: safeInterval,
        nextCheckAt: enabled ? new Date(Date.now() + safeInterval * 60 * 60 * 1000) : null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating auto-update settings:", error);
      res.status(500).json({ message: "Failed to update auto-update settings" });
    }
  });

  // Manually trigger check for new Reels
  app.post("/api/instagram/sources/:id/check-now", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      // Verify ownership
      const sources = await storage.getInstagramSources(userId);
      const source = sources.find(s => s.id === id);

      if (!source) {
        return res.status(404).json({ message: "Instagram source not found" });
      }

      // Get Apify API key
      const apifyKeyObj = await storage.getUserApiKey(userId, 'apify');
      if (!apifyKeyObj) {
        return res.status(400).json({ message: "Apify API key not configured" });
      }

      // Parse latest 20 Reels (light check)
      const result = await scrapeInstagramReels(source.username, apifyKeyObj.encryptedKey, 20);

      if (!result.success) {
        return res.status(500).json({ message: result.error || 'Scraping failed' });
      }

      let newReelsCount = 0;
      for (const reel of result.items) {
        const existing = await db
          .select()
          .from(instagramItems)
          .where(
            and(
              eq(instagramItems.userId, userId),
              eq(instagramItems.externalId, reel.shortCode)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(instagramItems).values({
            sourceId: source.id,
            userId: userId,
            externalId: reel.shortCode,
            shortCode: reel.shortCode,
            caption: reel.caption,
            url: reel.url,
            videoUrl: reel.videoUrl,
            thumbnailUrl: reel.thumbnailUrl,
            videoDuration: reel.videoDuration,
            likesCount: reel.likesCount,
            commentsCount: reel.commentsCount,
            videoViewCount: reel.videoViewCount,
            ownerUsername: reel.ownerUsername,
            ownerFullName: reel.ownerFullName,
            publishedAt: new Date(reel.timestamp),
          });
          newReelsCount++;
        }
      }

      // Update source statistics (properly increment counters using SQL)
      const safeInterval = source.checkIntervalHours || 6;
      await db
        .update(instagramSources)
        .set({
          lastCheckedAt: new Date(),
          lastSuccessfulParseAt: new Date(),
          nextCheckAt: new Date(Date.now() + safeInterval * 60 * 60 * 1000),
          totalChecks: sql`${instagramSources.totalChecks} + 1`,
          newReelsFound: sql`${instagramSources.newReelsFound} + ${newReelsCount}`,
          itemCount: sql`${instagramSources.itemCount} + ${newReelsCount}`,
          failedChecks: 0, // Reset on success
        })
        .where(and(
          eq(instagramSources.id, id),
          eq(instagramSources.userId, userId)
        ));

      res.json({ 
        success: true,
        newReelsCount,
        message: `Found ${newReelsCount} new Reels`
      });
    } catch (error: any) {
      console.error("Error checking for new Reels:", error);
      
      // Update failed checks counter
      const { id } = req.params;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      try {
        await db
          .update(instagramSources)
          .set({
            lastCheckedAt: new Date(),
            failedChecks: sql`${instagramSources.failedChecks} + 1`,
          })
          .where(and(
            eq(instagramSources.id, id),
            eq(instagramSources.userId, userId)
          ));
      } catch (updateError) {
        console.error("Failed to update failedChecks counter:", updateError);
      }
      
      // Provide specific error messages
      const errorMessage = error.message || "Failed to check for new Reels";
      const isTimeout = errorMessage.includes('timeout');
      
      res.status(500).json({ 
        message: isTimeout 
          ? "Request timed out - Instagram scraping is taking longer than expected. Please try again."
          : errorMessage
      });
    }
  });

  // ============================================================================
  // INSTAGRAM ITEMS ROUTES
  // ============================================================================

  app.get("/api/instagram/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { sourceId } = req.query;

      const items = await storage.getInstagramItems(userId, sourceId);
      
      res.json(items);
    } catch (error: any) {
      console.error("Error fetching Instagram items:", error);
      res.status(500).json({ message: "Failed to fetch Instagram items" });
    }
  });

  app.get("/api/instagram/items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      const items = await storage.getInstagramItems(userId);
      const item = items.find(i => i.id === id);

      if (!item) {
        return res.status(404).json({ message: "Instagram item not found" });
      }

      res.json(item);
    } catch (error: any) {
      console.error("Error fetching Instagram item:", error);
      res.status(500).json({ message: "Failed to fetch Instagram item" });
    }
  });

  app.patch("/api/instagram/items/:id/action", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const { action, projectId } = req.body;

      if (!action || !['selected', 'dismissed', 'seen'].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const item = await storage.updateInstagramItemAction(id, userId, action, projectId);

      if (!item) {
        return res.status(404).json({ message: "Instagram item not found or not authorized" });
      }

      res.json(item);
    } catch (error: any) {
      console.error("Error updating Instagram item action:", error);
      res.status(500).json({ message: "Failed to update Instagram item" });
    }
  });

  app.post("/api/instagram/items/:id/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      // Get the item and verify ownership
      const items = await storage.getInstagramItems(userId);
      const item = items.find(i => i.id === id);

      if (!item) {
        return res.status(404).json({ message: "Instagram item not found or not authorized" });
      }

      // Check if video is downloaded
      if (!item.localVideoPath || item.downloadStatus !== 'completed') {
        return res.status(400).json({ 
          message: "Video must be downloaded before transcription. Current status: " + (item.downloadStatus || 'pending')
        });
      }

      // Update status to processing
      await storage.updateInstagramItemTranscription(id, 'processing');

      // Start transcription in background (non-blocking)
      transcribeInstagramItemBackground(id, item.localVideoPath, userId);

      res.json({ 
        message: "Transcription started",
        status: "processing" 
      });
    } catch (error: any) {
      console.error("Error starting transcription:", error);
      res.status(500).json({ message: "Failed to start transcription" });
    }
  });

  // Score Instagram Reel with AI (Phase 6)
  app.post("/api/instagram/items/:id/score", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;

      // Get the item and verify ownership
      const items = await storage.getInstagramItems(userId);
      const item = items.find(i => i.id === id);

      if (!item) {
        return res.status(404).json({ message: "Instagram item not found or not authorized" });
      }

      // Check if transcription is completed
      if (!item.transcriptionText || item.transcriptionStatus !== 'completed') {
        return res.status(400).json({ 
          message: "Transcription must be completed before AI scoring. Current status: " + (item.transcriptionStatus || 'pending')
        });
      }

      // Get Anthropic API key
      const apiKeyRecord = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKeyRecord) {
        return res.status(400).json({ 
          message: "Anthropic API key not found. Please add it in Settings." 
        });
      }

      const apiKey = apiKeyRecord.encryptedKey; // Already decrypted by storage

      // Score the Reel
      const result = await scoreInstagramReel(
        apiKey,
        item.transcriptionText,
        item.caption,
        {
          likes: item.likesCount,
          comments: item.commentsCount,
          views: item.videoViewCount,
        }
      );

      // Update item with AI scores
      await storage.updateInstagramItemAiScore(
        id,
        result.score,
        result.comment,
        result.freshnessScore,
        result.viralityScore,
        result.qualityScore
      );

      res.json({ 
        message: "AI scoring completed",
        score: result.score,
        comment: result.comment,
        freshnessScore: result.freshnessScore,
        viralityScore: result.viralityScore,
        qualityScore: result.qualityScore,
      });
    } catch (error: any) {
      console.error("Error scoring Instagram item:", error);
      res.status(500).json({ message: "Failed to score Instagram item: " + error.message });
    }
  });

  // ============================================================================
  // NEWS / RSS ITEMS ROUTES
  // ============================================================================

  app.get("/api/news", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const items = await storage.getRssItems(userId);
      
      // Add freshness label based on publishedAt
      const enrichedItems = items.map(item => {
        let freshnessLabel = 'old';
        if (item.publishedAt) {
          const hoursAgo = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
          if (hoursAgo < 1) freshnessLabel = 'hot';
          else if (hoursAgo < 6) freshnessLabel = 'trending';
          else if (hoursAgo < 24) freshnessLabel = 'recent';
        }
        
        return {
          ...item,
          freshnessLabel,
        };
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

  // Update news item action (dismiss, select, seen)
  app.patch("/api/news/:id/action", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const { action, projectId } = req.body; // action: 'dismissed' | 'selected' | 'seen'
      
      const updated = await storage.updateRssItemAction(id, userId, action, projectId);
      if (!updated) {
        return res.status(404).json({ message: "News item not found" });
      }
      
      res.json({ success: true, item: updated });
    } catch (error) {
      console.error("Error updating news item action:", error);
      res.status(500).json({ message: "Failed to update news item" });
    }
  });

  // Manual refresh news from RSS sources
  app.post("/api/news/refresh", isAuthenticated, async (req: any, res) => {
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

  // Fetch full article content from URL (web scraping)
  app.post("/api/news/:id/fetch-full-content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      
      // Get RSS item
      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === id);
      
      if (!item) {
        return res.status(404).json({ message: "News item not found" });
      }
      
      // Check if full content was recently fetched (within 6 hours)
      const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
      if (item.fullContent && item.lastFetchedAt) {
        const age = Date.now() - new Date(item.lastFetchedAt).getTime();
        if (age < SIX_HOURS_MS && item.fullContent.length >= 500) {
          console.log(`[Article Extractor] Using cached content for ${item.url} (${age / 1000}s old)`);
          return res.json({
            success: true,
            content: item.fullContent,
            cached: true,
          });
        }
      }
      
      // Extract full content
      const result = await fetchAndExtract(item.url);
      
      if (!result.ok) {
        console.warn(`[Article Extractor] Failed to extract ${item.url}: ${result.reason}`);
        return res.json({
          success: false,
          error: result.reason,
          fallback: item.content, // Return RSS snippet as fallback
        });
      }
      
      // Save full content to database
      await storage.updateRssItem(id, {
        fullContent: result.content,
        lastFetchedAt: new Date(),
      });
      
      console.log(`[Article Extractor] Successfully extracted and cached content for ${item.url}`);
      
      res.json({
        success: true,
        content: result.content,
        cached: false,
      });
    } catch (error: any) {
      console.error("Error fetching full article content:", error);
      res.status(500).json({ 
        message: "Failed to fetch article content",
        error: error.message,
      });
    }
  });

  // Extended parsing (fetches all available items from RSS feeds)
  // NOTE: RSS feeds typically only return latest N items (10-50), so date range is used for filtering, not fetching
  app.post("/api/news/refresh-extended", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { startDate, endDate } = req.body;
      const sources = await storage.getRssSources(userId);
      
      // Log date range for debugging (RSS feeds won't honor this, but we log it for transparency)
      if (startDate && endDate) {
        console.log(`[Extended Parse] User requested date range: ${startDate} to ${endDate}`);
        console.log('[Extended Parse] Note: RSS feeds typically only provide latest items, date range filtering happens client-side');
      }
      
      let totalNew = 0;
      let totalProcessed = 0;
      for (const source of sources.filter(s => s.isActive)) {
        try {
          const feed = await rssParser.parseURL(source.url);
          const existingUrls = new Set((await storage.getRssItemsBySource(source.id)).map(item => item.url));
          
          // Process ALL items from the feed (extended parsing)
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

  // ============================================================================
  // PROJECTS ROUTES
  // ============================================================================

  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const projects = await storage.getProjects(userId);
      
      // Enrich projects with auto-title and stats from steps
      const enrichedProjects = await Promise.all(projects.map(async (project) => {
        const steps = await storage.getProjectSteps(project.id);
        
        // Auto-generate title from Step 3 first scene if no title set
        let autoTitle = project.title;
        if (!autoTitle || autoTitle === "Untitled Project") {
          const step3 = steps.find(s => s.stepNumber === 3);
          const step3Data = step3?.data as any;
          if (step3Data?.scenes && step3Data.scenes.length > 0) {
            const firstSceneText = step3Data.scenes[0].text || "";
            autoTitle = firstSceneText.substring(0, 50) + (firstSceneText.length > 50 ? "..." : "");
          }
        }
        
        // Extract stats from steps
        const step3 = steps.find(s => s.stepNumber === 3);
        const step4 = steps.find(s => s.stepNumber === 4);
        const step5 = steps.find(s => s.stepNumber === 5);
        const step3Data = step3?.data as any;
        const step4Data = step4?.data as any;
        const step5Data = step5?.data as any;
        
        const stats = {
          scenesCount: step3Data?.scenes?.length || 0,
          duration: step5Data?.duration || step4Data?.duration || 0,
          format: step3Data?.selectedFormat || step3Data?.format || "unknown",
          thumbnailUrl: step5Data?.thumbnailUrl || null,
        };
        
        return {
          ...project,
          displayTitle: autoTitle || project.title || "Untitled Project",
          stats,
        };
      }));
      
      res.json(enrichedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const project = await storage.getProject(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const validated = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(userId, validated);
      res.json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: error.message || "Failed to create project" });
    }
  });

  // Create project from Instagram Reel (Phase 7)
  app.post("/api/projects/from-instagram/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { itemId } = req.params;

      // Get the Instagram item
      const items = await storage.getInstagramItems(userId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        return res.status(404).json({ message: "Instagram Reel not found or not authorized" });
      }

      // Check if already used in a project
      if (item.usedInProject) {
        return res.status(400).json({ 
          message: "This Reel is already used in another project",
          projectId: item.usedInProject
        });
      }

      // Check if transcription is available
      if (!item.transcriptionText || item.transcriptionStatus !== 'completed') {
        return res.status(400).json({ 
          message: "Reel must be transcribed before creating a project. Current status: " + (item.transcriptionStatus || 'pending')
        });
      }

      // Generate project title from caption or transcription (max 50 chars)
      const titleSource = item.caption || item.transcriptionText || 'Instagram Reel';
      const title = titleSource.length > 50 
        ? titleSource.substring(0, 47) + '...' 
        : titleSource;

      // Create project (start at Stage 2 - Content Input)
      const project = await storage.createProject(userId, {
        title,
        sourceType: 'instagram',
        sourceData: {
          itemId: item.id,
          externalId: item.externalId,
          shortCode: item.shortCode,
          url: item.url,
          caption: item.caption,
          ownerUsername: item.ownerUsername,
          transcription: item.transcriptionText,
          language: item.language,
          aiScore: item.aiScore,
          aiComment: item.aiComment,
          freshnessScore: item.freshnessScore,
          viralityScore: item.viralityScore,
          qualityScore: item.qualityScore,
          engagement: {
            likes: item.likesCount,
            comments: item.commentsCount,
            views: item.videoViewCount,
          }
        },
        currentStage: 2,  // Skip Stage 1 (source already selected)
        status: 'draft',
      });

      // Create Step 2 (Content Input) with transcription
      await storage.createProjectStep({
        projectId: project.id,
        stepNumber: 2,
        data: {
          id: item.id,  // CRITICAL: needed for marking as used and progression
          contentType: 'instagram',
          transcriptionText: item.transcriptionText,  // Match API field names
          caption: item.caption,
          language: item.language,
          aiScore: item.aiScore,
          aiComment: item.aiComment,
          freshnessScore: item.freshnessScore,
          viralityScore: item.viralityScore,
          qualityScore: item.qualityScore,
          thumbnailUrl: item.thumbnailUrl,
          url: item.url,
          ownerUsername: item.ownerUsername,
        },
      });

      // Update Instagram item to mark as used
      await storage.updateInstagramItemAction(itemId, 'selected', project.id);

      console.log(`[Project] Created from Instagram Reel: ${project.id} (item: ${itemId})`);
      res.json(project);
    } catch (error: any) {
      console.error("Error creating project from Instagram:", error);
      res.status(500).json({ message: error.message || "Failed to create project from Instagram Reel" });
    }
  });

  // POST /api/projects/from-news/:itemId - Create project from news item
  app.post("/api/projects/from-news/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { itemId } = req.params;

      // Get the news item
      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        return res.status(404).json({ message: "News item not found or not authorized" });
      }

      // Check if already used in a project
      if (item.usedInProject) {
        return res.status(400).json({ 
          message: "This news item is already used in another project",
          projectId: item.usedInProject
        });
      }

      // Generate concise project title from news title (max 60 chars)
      const titleSource = item.title || 'News Article';
      const title = titleSource.length > 60 
        ? titleSource.substring(0, 57) + '...' 
        : titleSource;

      // Create project (start at Stage 2 - Content Input)
      const project = await storage.createProject(userId, {
        title,
        sourceType: 'news',
        sourceData: {
          itemId: item.id,
          title: item.title,
          url: item.url,
          content: item.content,
          imageUrl: item.imageUrl,
          publishedAt: item.publishedAt,
          aiScore: item.aiScore,
          aiComment: item.aiComment,
        },
        currentStage: 2,  // Skip Stage 1 (source already selected)
        status: 'draft',
      });

      // Create Step 2 (Content Input) with news content
      await storage.createProjectStep({
        projectId: project.id,
        stepNumber: 2,
        data: {
          title: item.title,
          content: item.content,
          url: item.url,
          imageUrl: item.imageUrl,
          publishedAt: item.publishedAt,
          aiScore: item.aiScore,
          aiComment: item.aiComment,
        }
      });

      // Mark news item as used
      await storage.updateRssItemAction(itemId, userId, 'selected', project.id);

      return res.json(project);
    } catch (error: any) {
      console.error("Error creating project from news:", error);
      res.status(500).json({ message: error.message || "Failed to create project from news item" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      const project = await storage.updateProject(id, userId, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.deleteProject(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Permanent delete (actually remove from database)
  app.delete("/api/projects/:id/permanent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { id } = req.params;
      await storage.permanentlyDeleteProject(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error permanently deleting project:", error);
      res.status(500).json({ message: "Failed to permanently delete project" });
    }
  });

  // ============================================================================
  // AI ANALYSIS ROUTES
  // ============================================================================

  app.post("/api/ai/analyze-script", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { format, content } = req.body;

      if (!format || !content) {
        return res.status(400).json({ message: "Format and content are required" });
      }

      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No Anthropic API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[AI] Analyzing script for format: ${format}`);
      const analysis = await analyzeScript(apiKey.encryptedKey, format, content);
      
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      
      // Check for authentication errors from Anthropic
      if (error.message?.includes('invalid x-api-key') || error.message?.includes('authentication')) {
        return res.status(400).json({ 
          message: "Invalid Anthropic API key. Please verify your API key in Settings is correct." 
        });
      }
      
      res.status(500).json({ message: error.message || "Failed to analyze script" });
    }
  });

  app.post("/api/ai/score-text", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No Anthropic API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[AI] Scoring text (${text.length} chars)`);
      const result = await scoreText(apiKey.encryptedKey, text);
      
      res.json(result);
    } catch (error: any) {
      console.error("Error scoring text:", error);
      res.status(500).json({ message: error.message || "Failed to score text" });
    }
  });

  // ============================================================================
  // AUDIO UPLOAD ROUTES
  // ============================================================================

  app.post("/api/audio/upload", isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const audioUrl = `/uploads/audio/${req.file.filename}`;
      res.json({ 
        success: true, 
        filename: req.file.filename,
        audioUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error: any) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ message: error.message || "Failed to upload audio" });
    }
  });

  // ============================================================================
  // ELEVENLABS ROUTES
  // ============================================================================

  app.get("/api/elevenlabs/voices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      // Get user's ElevenLabs API key
      const apiKey = await storage.getUserApiKey(userId, 'elevenlabs');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No ElevenLabs API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[ElevenLabs] Fetching voices for user ${userId}`);
      const voices = await fetchVoices(apiKey.encryptedKey);
      
      res.json(voices);
    } catch (error: any) {
      console.error("Error fetching voices:", error);
      res.status(500).json({ message: error.message || "Failed to fetch voices" });
    }
  });

  app.post("/api/elevenlabs/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { voiceId, text, voiceSettings } = req.body;

      if (!voiceId || !text) {
        return res.status(400).json({ message: "Voice ID and text are required" });
      }

      // Get user's ElevenLabs API key
      const apiKey = await storage.getUserApiKey(userId, 'elevenlabs');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No ElevenLabs API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[ElevenLabs] Generating speech for user ${userId}, voice ${voiceId}`);
      const audioBuffer = await generateSpeech(apiKey.encryptedKey, voiceId, text, {
        voice_settings: voiceSettings,
      });

      // Return audio as base64 for easy frontend handling
      const audioBase64 = audioBuffer.toString('base64');
      res.json({ 
        audio: audioBase64,
        format: 'mp3',
        size: audioBuffer.length 
      });
    } catch (error: any) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: error.message || "Failed to generate speech" });
    }
  });

  // ============================================================================
  // HEYGEN ROUTES
  // ============================================================================

  app.get("/api/heygen/avatars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Fetching avatars for user ${userId}`);
      const avatars = await fetchHeyGenAvatars(apiKey.encryptedKey);
      
      res.json(avatars);
    } catch (error: any) {
      console.error("Error fetching HeyGen avatars:", error);
      res.status(500).json({ message: error.message || "Failed to fetch avatars" });
    }
  });

  app.post("/api/heygen/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { avatarId, script, audioUrl, voiceId, dimension } = req.body;

      if (!avatarId || !script) {
        return res.status(400).json({ message: "Avatar ID and script are required" });
      }

      // Critical validation: HeyGen requires either audioUrl (audio mode) or voiceId (text mode)
      // Without this check, HeyGen API returns 400: "voice_id is required"
      if (!audioUrl && !voiceId) {
        return res.status(400).json({
          message: "Either audioUrl or voiceId is required for HeyGen generation"
        });
      }

      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Generating video for user ${userId}, avatar ${avatarId}, mode: ${audioUrl ? 'audio' : 'text'}`);
      const videoId = await generateHeyGenVideo(apiKey.encryptedKey, {
        avatar_id: avatarId,
        script,
        audio_url: audioUrl,
        voice_id: voiceId,
        dimension
      });

      res.json({ videoId });
    } catch (error: any) {
      console.error("Error generating HeyGen video:", error);
      
      // Proper error handling: pass through provider status codes
      const heygenError = error as any;
      const status = heygenError.statusCode || heygenError.response?.status || 500;
      return res.status(status > 0 ? status : 500).json({
        message: error instanceof Error ? error.message : "Failed to generate HeyGen video",
        error: heygenError.apiMessage || (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });

  app.get("/api/heygen/status/:videoId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({ message: "Video ID is required" });
      }

      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Checking video status for ${videoId}`);
      const status = await getHeyGenVideoStatus(apiKey.encryptedKey, videoId);
      
      res.json(status);
    } catch (error: any) {
      console.error("Error checking HeyGen video status:", error);
      res.status(500).json({ message: error.message || "Failed to check video status" });
    }
  });

  // ============================================================================
  // PROJECT STEPS ROUTES
  // ============================================================================

  app.get("/api/projects/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const steps = await storage.getProjectSteps(id);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching project steps:", error);
      res.status(500).json({ message: "Failed to fetch project steps" });
    }
  });

  app.post("/api/projects/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validated = insertProjectStepSchema.parse({
        ...req.body,
        projectId: id,
      });
      const step = await storage.createProjectStep(validated);
      res.json(step);
    } catch (error: any) {
      console.error("Error creating project step:", error);
      res.status(400).json({ message: error.message || "Failed to create project step" });
    }
  });

  // ============================================================================
  // B-ROLL GENERATION ROUTES (STAGE 7)
  // ============================================================================

  app.post("/api/projects/:id/broll/generate-prompt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { shotInstructions, sceneText } = req.body;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!shotInstructions) {
        return res.status(400).json({ message: "Shot instructions required" });
      }

      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log(`[B-Roll] Generating AI prompt for project ${id}...`);
      const aiPrompt = await generateAiPrompt(apiKey.encryptedKey, shotInstructions, sceneText);
      
      res.json({ aiPrompt });
    } catch (error: any) {
      console.error("Error generating AI prompt:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI prompt" });
    }
  });

  app.post("/api/projects/:id/broll/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { sceneId, aiPrompt, model, aspectRatio } = req.body;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!aiPrompt) {
        return res.status(400).json({ message: "AI prompt required" });
      }

      // Get Kie.ai API key
      const apiKey = await storage.getUserApiKey(userId, 'kieai');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Kie.ai API key not configured. Please add it in Settings." 
        });
      }

      // Idempotency: generate stable request ID based on parameters
      const finalModel = model || 'veo3_fast';
      const finalAspectRatio = aspectRatio || '9:16';
      const { generateIdempotencyKey } = await import('./lib/idempotency');
      const idempotencyKey = generateIdempotencyKey({
        projectId: id,
        sceneId,
        prompt: aiPrompt,
        model: finalModel,
        aspectRatio: finalAspectRatio,
      });

      console.log(`[B-Roll] Generating video for project ${id}, scene ${sceneId} (requestId: ${idempotencyKey})...`);
      const taskId = await generateKieVideo(apiKey.encryptedKey, {
        prompt: aiPrompt,
        model: finalModel,
        aspectRatio: finalAspectRatio,
        requestId: idempotencyKey,
      });
      
      res.json({ taskId, reused: false });
    } catch (error: any) {
      console.error("Error generating B-Roll:", error);
      
      // Proper error handling: pass through provider status codes and messages
      const kieError = error as any;
      const status = kieError.statusCode || kieError.response?.status || 500;
      return res.status(status > 0 ? status : 500).json({
        message: error instanceof Error ? error.message : "Failed to generate B-Roll video",
        error: kieError.apiMessage || (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });

  app.get("/api/projects/:id/broll/status/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id, taskId } = req.params;

      // Verify project ownership
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const apiKey = await storage.getUserApiKey(userId, 'kieai');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Kie.ai API key not configured" 
        });
      }

      console.log(`[B-Roll] Checking status for task ${taskId} (project ${id})`);
      const status = await getKieVideoStatus(apiKey.encryptedKey, taskId);
      
      res.json(status);
    } catch (error: any) {
      console.error("Error checking B-Roll status:", error);
      
      // Proper error handling: pass through provider status codes
      const kieError = error as any;
      const status = kieError.statusCode || kieError.response?.status || 500;
      return res.status(status > 0 ? status : 500).json({
        message: error instanceof Error ? error.message : "Failed to check video status",
        error: kieError.apiMessage || (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });

  // ============================================================================
  // ADVANCED AI ANALYSIS (Testing Endpoints)
  // ============================================================================

  // Test advanced news analysis
  app.post("/api/analyze/advanced/news", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content required" });
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log('[Advanced AI] Analyzing news with multi-agent system...');
      const startTime = Date.now();
      
      const result = await scoreNewsAdvanced(apiKey.encryptedKey, title, content);
      
      const duration = Date.now() - startTime;
      console.log(`[Advanced AI] Analysis completed in ${duration}ms`);
      
      res.json({
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error in advanced news analysis:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze news content",
        error: error.toString()
      });
    }
  });

  // Test advanced Instagram Reel analysis
  app.post("/api/analyze/advanced/reel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { transcription, caption } = req.body;
      if (!transcription) {
        return res.status(400).json({ message: "Transcription required" });
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log('[Advanced AI] Analyzing Instagram Reel with multi-agent system...');
      const startTime = Date.now();
      
      const result = await scoreReelAdvanced(apiKey.encryptedKey, transcription, caption || null);
      
      const duration = Date.now() - startTime;
      console.log(`[Advanced AI] Analysis completed in ${duration}ms`);
      
      res.json({
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error in advanced reel analysis:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze reel content",
        error: error.toString()
      });
    }
  });

  // Test advanced custom script analysis
  app.post("/api/analyze/advanced/script", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { text, format, scenes } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Text required" });
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log('[Advanced AI] Analyzing custom script with multi-agent system...');
      const startTime = Date.now();
      
      const result = await scoreCustomScriptAdvanced(
        apiKey.encryptedKey,
        text,
        format || 'short-form',
        scenes
      );
      
      const duration = Date.now() - startTime;
      console.log(`[Advanced AI] Analysis completed in ${duration}ms`);
      
      res.json({
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error in advanced script analysis:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze script",
        error: error.toString()
      });
    }
  });

  // Compare old vs new analysis systems
  app.post("/api/analyze/compare", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { type, title, content, transcription, caption } = req.body;
      
      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log('[AI Comparison] Running both old and new analysis systems...');
      
      let oldResult: any;
      let newResult: any;
      const startOld = Date.now();
      const startNew = Date.now();

      if (type === 'news') {
        if (!title || !content) {
          return res.status(400).json({ message: "Title and content required for news" });
        }
        
        oldResult = await scoreNewsItem(apiKey.encryptedKey, title, content);
        const oldDuration = Date.now() - startOld;
        
        newResult = await scoreNewsAdvanced(apiKey.encryptedKey, title, content);
        const newDuration = Date.now() - startNew;
        
        res.json({
          comparison: {
            old: {
              result: oldResult,
              duration: oldDuration
            },
            new: {
              result: newResult,
              duration: newDuration
            },
            scoreDifference: newResult.overallScore - oldResult.score,
            detailImprovement: {
              oldFields: Object.keys(oldResult).length,
              newFields: Object.keys(newResult).length,
              newBreakdowns: Object.keys(newResult.breakdown || {}).length
            }
          }
        });
      } else if (type === 'reel') {
        if (!transcription) {
          return res.status(400).json({ message: "Transcription required for reel" });
        }
        
        oldResult = await scoreInstagramReel(apiKey.encryptedKey, transcription, caption || null);
        const oldDuration = Date.now() - startOld;
        
        newResult = await scoreReelAdvanced(apiKey.encryptedKey, transcription, caption || null);
        const newDuration = Date.now() - startNew;
        
        res.json({
          comparison: {
            old: {
              result: oldResult,
              duration: oldDuration
            },
            new: {
              result: newResult,
              duration: newDuration
            },
            scoreDifference: newResult.overallScore - oldResult.score,
            detailImprovement: {
              oldFields: Object.keys(oldResult).length,
              newFields: Object.keys(newResult).length,
              newBreakdowns: Object.keys(newResult.breakdown || {}).length
            }
          }
        });
      } else {
        return res.status(400).json({ message: "Type must be 'news' or 'reel'" });
      }
    } catch (error: any) {
      console.error("Error in comparison:", error);
      res.status(500).json({ 
        message: error.message || "Failed to compare analysis systems",
        error: error.toString()
      });
    }
  });

  // Analyze project source and recommend format
  app.post("/api/projects/:id/analyze-source", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      
      // Get project
      const project = await storage.getProject(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log(`[Source Analysis] Analyzing ${project.sourceType} source...`);
      const startTime = Date.now();

      let analysisResult: any;
      let sourceData: any = project.sourceData || {};

      // Run appropriate analysis based on source type
      if (project.sourceType === 'news') {
        const title = sourceData.title || '';
        const content = sourceData.content || '';
        
        if (!title || !content) {
          return res.status(400).json({ message: "News source missing title or content" });
        }

        analysisResult = await scoreNewsAdvanced(apiKey.encryptedKey, title, content);
      } else if (project.sourceType === 'instagram') {
        const transcription = sourceData.transcription || '';
        const caption = sourceData.caption || null;
        
        if (!transcription) {
          return res.status(400).json({ message: "Instagram source missing transcription" });
        }

        analysisResult = await scoreReelAdvanced(apiKey.encryptedKey, transcription, caption);
      } else if (project.sourceType === 'custom') {
        const text = sourceData.text || '';
        
        if (!text) {
          return res.status(400).json({ message: "Custom source missing text" });
        }

        analysisResult = await scoreCustomScriptAdvanced(apiKey.encryptedKey, text, 'short-form');
      } else {
        return res.status(400).json({ message: "Unsupported source type" });
      }

      // Extract metadata from analysis
      const breakdown = analysisResult.breakdown || {};
      const topics: string[] = [];
      const keywords: string[] = [];
      const risks: string[] = [];
      const strengths: string[] = [];

      // Extract topics from different breakdowns
      if (breakdown.structure?.points) {
        topics.push(...breakdown.structure.points.slice(0, 3));
      }
      if (breakdown.hook?.strength === 'strong') {
        topics.push('Сильный хук');
      }

      // Extract keywords from content
      const content = sourceData.content || sourceData.text || sourceData.transcription || '';
      const words = content.split(/\s+/).filter((w: string) => w.length > 4);
      keywords.push(...words.slice(0, 5));

      // Detect content language (simple heuristic)
      const cyrillicRatio = (content.match(/[а-яА-ЯёЁ]/g) || []).length / content.length;
      const detectedLanguage = cyrillicRatio > 0.3 ? 'ru' : 'en';

      // Extract strengths
      if (analysisResult.overallScore >= 70) {
        strengths.push('Высокий потенциал виральности');
      }
      if (breakdown.hook?.strength === 'strong') {
        strengths.push('Сильный захватывающий хук');
      }
      if (breakdown.emotional?.engagement === 'high') {
        strengths.push('Высокая эмоциональная вовлеченность');
      }
      if (breakdown.structure?.clarity === 'excellent') {
        strengths.push('Четкая структура повествования');
      }
      if (breakdown.cta?.effectiveness === 'high') {
        strengths.push('Эффективный призыв к действию');
      }
      if (strengths.length === 0 && analysisResult.overallScore >= 50) {
        strengths.push('Приемлемое качество для работы');
      }

      // Extract risks
      if (breakdown.structure?.weakPoints) {
        risks.push(...breakdown.structure.weakPoints);
      }
      if (analysisResult.overallScore < 50) {
        risks.push('Низкий общий балл - требуется доработка');
      }
      if (breakdown.hook?.strength === 'weak') {
        risks.push('Слабый хук - может не привлечь внимание');
      }

      // Recommend format based on source type and score
      const recommendedFormat = getRecommendedFormat(
        project.sourceType,
        analysisResult.overallScore,
        breakdown
      );

      const duration = Date.now() - startTime;
      console.log(`[Source Analysis] Completed in ${duration}ms - Score: ${analysisResult.overallScore}`);

      const responseData = {
        analysis: {
          score: analysisResult.overallScore,
          topics: topics.length > 0 ? topics : ['Общая тема'],
          sentiment: breakdown.emotional?.tone || 'Neutral',
          keywords: keywords.length > 0 ? keywords : undefined,
          risks: risks.length > 0 ? risks : undefined,
          strengths: strengths.length > 0 ? strengths : undefined,
        },
        recommendedFormat,
        sourceMetadata: {
          type: project.sourceType,
          score: analysisResult.overallScore,
          language: detectedLanguage,
          wordCount: content.split(/\s+/).length,
          title: sourceData.title || sourceData.caption || 'Untitled',
          content: content,
        },
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      };

      // Cache analysis result in project_steps for future visits
      try {
        // Check if step 3 already exists
        const existingSteps = await storage.getProjectSteps(id);
        const existingStep3 = existingSteps.find(s => s.stepNumber === 3);
        
        const stepData = {
          sourceAnalysis: responseData.analysis,
          recommendedFormat: responseData.recommendedFormat,
          sourceMetadata: responseData.sourceMetadata,
          cachedAt: new Date().toISOString(),
        };
        
        if (existingStep3) {
          // Update existing step
          await storage.updateProjectStep(existingStep3.id, {
            data: stepData,
            completedAt: null, // Not completed until script is generated
          });
          console.log('[Source Analysis] Updated cached result in project_steps');
        } else {
          // Create new step
          await storage.createProjectStep({
            projectId: id,
            stepNumber: 3,
            data: stepData,
            completedAt: null, // Not completed until script is generated
          });
          console.log('[Source Analysis] Created cached result in project_steps');
        }
      } catch (cacheError) {
        console.error('[Source Analysis] Failed to cache result:', cacheError);
        // Continue anyway - caching failure shouldn't break the response
      }

      res.json(responseData);
    } catch (error: any) {
      console.error("Error in source analysis:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze source",
        error: error.toString()
      });
    }
  });

  // Translate content to target language
  app.post("/api/projects/:id/translate-content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { content, targetLanguage = 'ru' } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Get project to verify ownership
      const project = await storage.getProject(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log(`[Translation] Translating ${content.length} characters to ${targetLanguage}...`);
      const startTime = Date.now();

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: apiKey.encryptedKey });

      const prompt = `Translate the following text to ${targetLanguage === 'ru' ? 'Russian' : targetLanguage}. 
Keep the original formatting and structure. Only output the translated text, nothing else.

Text to translate:
${content}`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = message.content.find((c: any) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response from AI");
      }

      const translatedContent = textContent.text.trim();

      const duration = Date.now() - startTime;
      console.log(`[Translation] Completed in ${duration}ms`);

      res.json({
        translatedContent,
        targetLanguage,
        originalLength: content.length,
        translatedLength: translatedContent.length,
        metadata: {
          translationTime: duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Error translating content:", error);
      res.status(500).json({ 
        message: error.message || "Failed to translate content",
        error: error.toString()
      });
    }
  });

  // Helper to recommend format based on source analysis
  function getRecommendedFormat(
    sourceType: string,
    score: number,
    breakdown: any
  ): { 
    formatId: string; 
    name: string; 
    reason: string; 
    why: string[]; // 3-4 reasons why this format is recommended
    whyBetter?: string;
    expectedImpact: { retention?: string; saves?: string; engagement?: string };
    firstFrameIdeas?: string[]; // 3 ideas for first frame
    hookOptions?: string[]; // 3 hook variants
  } {
    // For news sources
    if (sourceType === 'news') {
      if (score >= 80) {
        return {
          formatId: 'news_update',
          name: 'News Update',
          reason: 'Высокая новостная ценность и актуальность материала делают его идеальным для оперативного новостного формата',
          why: [
            'Материал содержит актуальную информацию с высокой новостной ценностью',
            'Временной фактор критичен - чем раньше выйдет, тем больше охват',
            'Структура легко адаптируется под короткий динамичный формат',
            'Аудитория ожидает оперативности от новостного контента'
          ],
          whyBetter: 'Новостной формат на 18% эффективнее для актуальных тем и позволяет максимально использовать временной фактор',
          expectedImpact: { retention: '+12%', saves: '+18%', engagement: '+20%' },
          firstFrameIdeas: [
            'Крупный заголовок с ключевой цифрой или фактом',
            'Визуал места события или главного героя новости',
            'Таймер обратного отсчета с надписью "BREAKING NEWS"'
          ],
          hookOptions: [
            '⚡ СРОЧНО: [главный факт]',
            'Только что стало известно: [интрига]',
            '[Цифра или факт], который изменит всё'
          ]
        };
      } else if (score >= 60) {
        return {
          formatId: 'explainer',
          name: 'Explainer',
          reason: 'Хорошее качество контента, подходит для образовательного формата с детальным разбором',
          why: [
            'Контент содержит полезную информацию, которую можно структурировать',
            'Образовательный формат компенсирует отсутствие сенсационности',
            'Долгосрочная ценность - такие видео смотрят и сохраняют месяцами',
            'Четкая структура помогает удержать внимание до конца'
          ],
          whyBetter: 'Explainer формат помогает раскрыть сложные темы и удерживает внимание на 8-12% дольше',
          expectedImpact: { retention: '+8%', saves: '+12%', engagement: '+10%' },
          firstFrameIdeas: [
            'Вопрос, на который даст ответ видео',
            'Инфографика с ключевыми пунктами разбора',
            'Интригующий факт или статистика по теме'
          ],
          hookOptions: [
            'Знаете ли вы, что [интересный факт]?',
            'Давайте разберем: почему [явление] работает именно так',
            'В этом видео — всё, что нужно знать о [тема]'
          ]
        };
      } else {
        return {
          formatId: 'hook_and_story',
          name: 'Hook & Story',
          reason: 'Контент требует сильного хука для привлечения внимания, история поможет удержать зрителя',
          why: [
            'Контент нуждается в драматургии, чтобы зацепить зрителя',
            'История с развитием удерживает внимание лучше сухих фактов',
            'Эмоциональная вовлеченность компенсирует недостаток новизны',
            'Формат позволяет превратить обычный материал в интересный'
          ],
          whyBetter: 'Формат Hook & Story компенсирует средний score сильным началом и повышает retention на 15%',
          expectedImpact: { retention: '+15%', saves: '+8%', engagement: '+12%' },
          firstFrameIdeas: [
            'Кульминационный момент истории — начинаем с самого интересного',
            'Провокационный вопрос, который волнует зрителя',
            'Контрастное сравнение "До/После" или "Ожидание/Реальность"'
          ],
          hookOptions: [
            'Вы не поверите, что случилось дальше...',
            'Это изменило всё. Вот как это было:',
            'История, которую вы не ожидали услышать'
          ]
        };
      }
    }

    // For Instagram sources
    if (sourceType === 'instagram') {
      if (breakdown.hook?.strength === 'strong') {
        return {
          formatId: 'reaction_video',
          name: 'Reaction Video',
          reason: 'Сильный хук и визуальный контент идеально подходят для реакционного формата',
          why: [
            'Исходный reel уже доказал свою вирусность - используем это',
            'Добавление личной реакции создает дополнительный слой ценности',
            'Формат позволяет выразить мнение и начать дискуссию в комментариях',
            'Аудитория любит реакции на популярный контент'
          ],
          whyBetter: 'Reaction формат использует существующую вирусность и добавляет личную интерпретацию, увеличивая engagement на 20%',
          expectedImpact: { retention: '+20%', saves: '+15%', engagement: '+25%' },
          firstFrameIdeas: [
            'Стоп-кадр самого яркого момента оригинала с вашей эмоциональной реакцией',
            'Разделенный экран: оригинал слева, ваша реакция справа',
            'Крупный план вашего лица с надписью "Смотрю популярный рилс"'
          ],
          hookOptions: [
            'Все обсуждают это видео, и вот почему...',
            'Моя реакция на [тема]: *шок*',
            'Давайте разберем, что здесь вообще происходит'
          ]
        };
      } else {
        return {
          formatId: 'tutorial',
          name: 'Tutorial',
          reason: 'Инструкционный формат добавит структуру и практическую ценность контенту',
          why: [
            'Контент можно структурировать как пошаговую инструкцию',
            'Tutorial имеет долгосрочную ценность - люди возвращаются к нему',
            'Практическая польза повышает сохранения и репосты',
            'Четкие шаги легче запомнить и применить'
          ],
          whyBetter: 'Tutorial формат превращает развлечение в полезный контент, повышая saves на 20% и долгосрочную ценность',
          expectedImpact: { retention: '+10%', saves: '+20%', engagement: '+15%' },
          firstFrameIdeas: [
            'Итоговый результат со счетчиком "5 простых шагов"',
            'Список пунктов с чекбоксами и заголовком "Как сделать [X]"',
            'Контраст "Было → Стало" с акцентом на трансформацию'
          ],
          hookOptions: [
            'Как сделать [X] за 60 секунд',
            'Простой способ [действие], который работает',
            'Повторяйте за мной: шаг 1...'
          ]
        };
      }
    }

    // Default for custom sources
    return {
      formatId: 'story_time',
      name: 'Story Time',
      reason: 'Нарративный формат подходит для пользовательского контента и создает эмоциональную связь',
      why: [
        'Личные истории создают эмоциональную связь с аудиторией',
        'Формат универсален и подходит практически для любого контента',
        'Storytelling удерживает внимание от начала до конца',
        'Можно добавить неожиданный поворот для усиления эффекта'
      ],
      whyBetter: 'Story Time формат универсален и позволяет адаптировать любой контент под личную историю',
      expectedImpact: { retention: '+10%', saves: '+8%', engagement: '+12%' },
      firstFrameIdeas: [
        'Эмоциональный момент из истории (радость, удивление, шок)',
        'Загадочное начало: "Вы не поверите, что случилось..."',
        'Контекст места и времени: "Это было [когда] в [где]..."'
      ],
      hookOptions: [
        'Хотите услышать историю о [тема]?',
        'Вот что произошло, когда я [действие]...',
        'Я никогда не забуду тот день, когда...'
      ]
    };
  }

  // Generate script from source with specified format
  app.post("/api/projects/:id/generate-script", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { id } = req.params;
      const { formatId, targetLocale = 'ru', idempotencyKey: rawIdempotencyKey } = req.body;
      
      if (!formatId) {
        return res.status(400).json({ message: "formatId is required" });
      }

      // Get project
      const project = await storage.getProject(id, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate and generate idempotency key
      const validatedKey = clampIdemKey(rawIdempotencyKey);
      const idempotencyKey = validatedKey || makeIdemKey();
      
      console.log(`[Generate Script] Using idempotency key: ${idempotencyKey} (${validatedKey ? 'provided' : 'generated'})`);

      // Check if this exact request was already processed using idempotency key
      const existingVersions = await storage.findVersionByIdemKey(id, idempotencyKey);
      if (existingVersions.length > 0) {
        const existingVersion = existingVersions[0];
        console.log(`[Generate Script] Found existing version for idempotency key ${idempotencyKey}`);
        return res.json({
          success: true,
          version: existingVersion,
          message: 'Returning existing version (idempotent request)',
          idempotent: true,
        });
      }

      // Fallback: Check if script already exists (prevents duplicate generations when no key provided)
      const currentVersion = await storage.getCurrentScriptVersion(id);
      if (currentVersion) {
        console.log(`[Generate Script] Script already exists for project ${id}, returning current version`);
        return res.json({
          success: true,
          version: currentVersion,
          message: 'Script already exists',
          idempotent: true,
        });
      }

      // Get Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log(`[Generate Script] Generating script for ${project.sourceType} with format ${formatId}...`);
      const startTime = Date.now();

      const sourceData: any = project.sourceData || {};
      
      // Prepare content for script generation
      let content = '';
      if (project.sourceType === 'news') {
        const title = sourceData.title || '';
        const newsContent = sourceData.content || '';
        
        if (!title || !newsContent) {
          return res.status(400).json({ message: "News source missing title or content" });
        }
        
        content = `${title}\n\n${newsContent}`;
      } else if (project.sourceType === 'instagram') {
        const transcription = sourceData.transcription || '';
        const caption = sourceData.caption || null;
        
        if (!transcription) {
          return res.status(400).json({ message: "Instagram source missing transcription" });
        }
        
        content = caption ? `${transcription}\n\nCaption: ${caption}` : transcription;
      } else if (project.sourceType === 'custom') {
        content = sourceData.text || '';
        
        if (!content) {
          return res.status(400).json({ message: "Custom source missing text" });
        }
      } else {
        return res.status(400).json({ message: "Unsupported source type" });
      }

      // Generate script with scenes using analyzeScript
      const analysisResult = await analyzeScript(apiKey.encryptedKey, formatId, content);

      if (!analysisResult.scenes || analysisResult.scenes.length === 0) {
        return res.status(500).json({ 
          message: "AI analysis did not generate scenes" 
        });
      }

      // Create initial script version
      const newVersion = await createNewScriptVersion({
        projectId: id,
        scenes: analysisResult.scenes,
        createdBy: 'system',
        changes: {
          type: 'initial',
          description: `Initial version from ${formatId} format`,
        },
        analysisResult,
        analysisScore: analysisResult.overallScore,
        provenance: {
          source: 'ai_recommendation',
          formatId: formatId,
          targetLocale: targetLocale,
          userId: userId,
          idempotencyKey: idempotencyKey,
          ts: new Date().toISOString(),
        },
        userId: userId,
      });

      // Extract and create recommendations (sceneId = scene number, not database PK)
      const recommendationsData = extractRecommendationsFromAnalysis(analysisResult, analysisResult.scenes.length);
      
      if (recommendationsData.length > 0) {
        const recommendations = recommendationsData.map(rec => ({
          ...rec,
          scriptVersionId: newVersion.id,
        }));
        
        console.log(`[Generate Script] Creating ${recommendations.length} recommendations in database`);
        await storage.createSceneRecommendations(recommendations);
        console.log(`[Generate Script] Recommendations created successfully`);
      } else {
        console.log(`[Generate Script] No recommendations to create`);
      }

      const duration = Date.now() - startTime;
      console.log(`[Generate Script] Completed in ${duration}ms`);

      res.json({
        success: true,
        version: newVersion,
        analysisResult,
        recommendationsCount: recommendationsData.length,
        metadata: {
          formatId,
          targetLocale,
          analysisTime: duration,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Error generating script:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ 
        message: error.message || "Failed to generate script",
        error: error.toString(),
        stack: error.stack
      });
    }
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  async function parseRssSource(sourceId: string, url: string, userId: string) {
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

  async function scoreRssItems(items: any[], userId: string) {
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

      console.log(`[AI] Completed scoring ${items.length} items`);
    } catch (error) {
      console.error('[AI] Scoring failed:', error);
    }
  }

  // ============================================================================
  // SCRIPT VERSIONING & SCENE EDITING ENDPOINTS
  // ============================================================================

  // Helper: Create new script version
  async function createNewScriptVersion(data: {
    projectId: string;
    scenes: any[];
    createdBy: 'user' | 'ai' | 'system';
    changes: any;
    parentVersionId?: string;
    analysisResult?: any;
    analysisScore?: number;
    provenance?: any; // { source, agent?, userId?, ts }
    diff?: any[]; // [{ sceneId, before, after }]
    userId?: string;
  }) {
    const { projectId, scenes, createdBy, changes, parentVersionId, analysisResult, analysisScore, provenance, diff, userId } = data;
    
    // Get next version number
    const versions = await storage.getScriptVersions(projectId);
    const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.versionNumber)) + 1 : 1;
    
    // Build full script text
    const fullScript = scenes
      .map((s: any) => `[${s.start}-${s.end}s] ${s.text}`)
      .join('\n');
    
    // Get current version for diff calculation
    const currentVersion = await storage.getCurrentScriptVersion(projectId);
    
    // Calculate diff if not provided
    let finalDiff = diff;
    if (!finalDiff && currentVersion && currentVersion.scenes) {
      finalDiff = calculateSceneDiff(currentVersion.scenes as any[], scenes);
    }
    
    // Build provenance if not provided
    let finalProvenance = provenance;
    if (!finalProvenance) {
      finalProvenance = {
        source: changes?.type || 'unknown',
        userId: userId,
        ts: new Date().toISOString(),
      };
    }
    
    // Unmark old current version
    if (currentVersion) {
      await storage.updateScriptVersionCurrent(projectId, ''); // This will unmark all
    }
    
    // Create new version
    const newVersion = await storage.createScriptVersion({
      projectId,
      versionNumber: nextVersion,
      fullScript,
      scenes,
      changes,
      createdBy,
      isCurrent: true,
      parentVersionId,
      analysisResult,
      analysisScore,
      provenance: finalProvenance,
      diff: finalDiff,
    });
    
    return newVersion;
  }
  
  // Helper: Calculate diff between old and new scenes
  function calculateSceneDiff(oldScenes: any[], newScenes: any[]): any[] {
    const diffs: any[] = [];
    
    // Compare each scene
    for (let i = 0; i < Math.max(oldScenes.length, newScenes.length); i++) {
      const oldScene = oldScenes[i];
      const newScene = newScenes[i];
      
      // Scene was added
      if (!oldScene && newScene) {
        diffs.push({
          sceneId: newScene.id || i + 1,
          before: '',
          after: newScene.text || '',
        });
      }
      // Scene was removed
      else if (oldScene && !newScene) {
        diffs.push({
          sceneId: oldScene.id || i + 1,
          before: oldScene.text || '',
          after: '',
        });
      }
      // Scene was modified
      else if (oldScene && newScene && oldScene.text !== newScene.text) {
        diffs.push({
          sceneId: newScene.id || i + 1,
          before: oldScene.text || '',
          after: newScene.text || '',
        });
      }
    }
    
    return diffs;
  }

  // Helper: Extract scene recommendations from advanced analysis
  function extractRecommendationsFromAnalysis(analysis: any, totalScenes: number): any[] {
    const recommendations: any[] = [];
    
    if (!analysis || !analysis.recommendations) {
      console.log('[Extract Recommendations] No recommendations found in analysis');
      return recommendations;
    }
    
    console.log(`[Extract Recommendations] Processing ${analysis.recommendations.length} recommendations for ${totalScenes} scenes`);
    
    // Map recommendations to scenes using scene numbers (1-indexed)
    for (const rec of analysis.recommendations) {
      // Use explicit sceneNumber from AI (1-indexed)
      const sceneNumber = rec.sceneNumber;
      
      if (sceneNumber && sceneNumber > 0 && sceneNumber <= totalScenes) {
        // Extract score delta from expectedImpact (e.g., "+18 points" → 18)
        const scoreDelta = extractScoreDelta(rec.expectedImpact);
        
        // Map priority to confidence
        const confidence = priorityToConfidence(rec.priority);
        
        recommendations.push({
          sceneId: sceneNumber, // sceneId is just the scene number (1, 2, 3...), not a database PK
          priority: rec.priority || 'medium',
          area: rec.area || 'general',
          currentText: rec.current || '',
          suggestedText: rec.suggested || '',
          reasoning: rec.reasoning || '',
          expectedImpact: rec.expectedImpact || '',
          sourceAgent: rec.area || 'general', // Agent that generated this recommendation
          scoreDelta,
          confidence,
        });
        
        console.log(`[Extract Recommendations] Added recommendation for scene #${sceneNumber}, area: ${rec.area}, priority: ${rec.priority}`);
      } else {
        console.log(`[Extract Recommendations] Skipped recommendation - invalid sceneNumber: ${sceneNumber} (total scenes: ${totalScenes})`);
      }
    }
    
    console.log(`[Extract Recommendations] Extracted ${recommendations.length} valid recommendations`);
    return recommendations;
  }
  
  // Helper: Extract numeric score delta from impact string
  function extractScoreDelta(impact: string): number | undefined {
    if (!impact) return undefined;
    
    // Match patterns like "+18 points", "+35%", "18 points", etc.
    const match = impact.match(/[+]?(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  
  // Helper: Map priority to confidence score
  function priorityToConfidence(priority: string): number {
    const mapping: Record<string, number> = {
      critical: 0.95,
      high: 0.85,
      medium: 0.7,
      low: 0.5,
    };
    return mapping[priority] || 0.7;
  }

  // Helper: Find which scene a recommendation applies to
  function findSceneForRecommendation(rec: any, scenes: any[]): number | undefined {
    const area = rec.area?.toLowerCase() || '';
    
    // Map recommendation areas to scene indices
    if (area.includes('hook') || area.includes('opening') || area.includes('attention')) {
      return 1; // First scene
    } else if (area.includes('cta') || area.includes('call-to-action') || area.includes('ending')) {
      return scenes.length; // Last scene
    } else if (area.includes('structure') || area.includes('pacing')) {
      return 2; // Middle scenes
    }
    
    // If current text matches a scene, use that
    const currentText = rec.current?.toLowerCase() || '';
    for (let i = 0; i < scenes.length; i++) {
      const sceneText = scenes[i].text?.toLowerCase() || '';
      if (currentText && sceneText.includes(currentText)) {
        return i + 1;
      }
    }
    
    return undefined; // Can't determine scene
  }

  // Shared handler for script versions/history endpoint
  const getScriptHistoryHandler = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Get all versions
      const versions = await storage.getScriptVersions(id);
      
      // Get current version
      const currentVersion = versions.find(v => v.isCurrent) || versions[0];
      
      if (!currentVersion) {
        return res.json({
          currentVersion: null,
          versions: [],
          recommendations: [],
          hasUnappliedRecommendations: false,
        });
      }
      
      // Get recommendations for current version
      const recommendations = await storage.getSceneRecommendations(currentVersion.id);
      
      return res.json({
        currentVersion,
        versions,
        recommendations,
        hasUnappliedRecommendations: recommendations.some(r => !r.applied),
      });
    } catch (error: any) {
      console.error('[Script History] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  };

  // GET /api/projects/:id/script-history - Single source of truth for script versions and recommendations
  app.get("/api/projects/:id/script-history", isAuthenticated, getScriptHistoryHandler);

  // GET /api/projects/:id/script-versions - Get all script versions for frontend
  app.get("/api/projects/:id/script-versions", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const versions = await storage.listScriptVersions(id);
      return res.json({ versions });
    } catch (error: any) {
      console.error('[Script Versions] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // GET /api/projects/:id/scene-recommendations - Get scene recommendations for current version
  app.get("/api/projects/:id/scene-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const currentVersion = await storage.getCurrentScriptVersion(id);
      if (!currentVersion) {
        return res.json([]);
      }
      
      const recommendations = await storage.getSceneRecommendations(currentVersion.id);
      
      // Transform to match SceneEditor interface
      const transformed = recommendations.map(r => ({
        id: r.id,
        sceneId: r.sceneId, // sceneId is already the scene number (1-indexed)
        priority: r.priority,
        area: r.area,
        currentText: r.currentText,
        suggestedText: r.suggestedText,
        reasoning: r.reasoning,
        expectedImpact: r.expectedImpact,
        appliedAt: r.appliedAt,
      }));
      
      return res.json(transformed);
    } catch (error: any) {
      console.error('[Scene Recommendations] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // POST /api/projects/:id/apply-scene-recommendation - Apply recommendation to single scene
  app.post("/api/projects/:id/apply-scene-recommendation", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { sceneId, recommendationId } = req.body;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Get current version
      const currentVersion = await storage.getCurrentScriptVersion(id);
      if (!currentVersion) {
        return res.status(404).json({ message: 'No script version found' });
      }
      
      // Get recommendation
      const recommendations = await storage.getSceneRecommendations(currentVersion.id);
      const recommendation = recommendations.find(r => r.id === recommendationId);
      
      if (!recommendation) {
        return res.status(404).json({ message: 'Recommendation not found' });
      }
      
      // Clone current scenes and apply recommendation
      const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
      const targetScene = scenes.find((s: any) => s.id === sceneId);
      
      if (!targetScene) {
        return res.status(404).json({ message: 'Scene not found' });
      }
      
      const oldText = targetScene.text;
      targetScene.text = recommendation.suggestedText;
      targetScene.recommendationApplied = true;
      targetScene.lastModified = new Date().toISOString();
      
      // Create new version with provenance
      const newVersion = await createNewScriptVersion({
        projectId: id,
        scenes,
        createdBy: 'ai',
        changes: {
          type: 'scene_recommendation',
          affectedScenes: [sceneId],
          sceneId,
          before: oldText,
          after: recommendation.suggestedText,
          reason: recommendation.reasoning,
        },
        parentVersionId: currentVersion.id,
        analysisResult: currentVersion.analysisResult,
        analysisScore: currentVersion.analysisScore ?? undefined,
        provenance: {
          source: 'ai_recommendation',
          agent: recommendation.sourceAgent || recommendation.area || 'general',
          userId: userId,
          ts: new Date().toISOString(),
        },
        userId: userId,
      });
      
      // Mark recommendation as applied
      await storage.markRecommendationApplied(recommendationId);
      
      return res.json({
        success: true,
        newVersion,
        affectedScene: targetScene,
      });
    } catch (error: any) {
      console.error('[Apply Scene Recommendation] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // POST /api/projects/:id/apply-all-recommendations - Apply all recommendations
  app.post("/api/projects/:id/apply-all-recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const currentVersion = await storage.getCurrentScriptVersion(id);
      if (!currentVersion) {
        return res.status(404).json({ message: 'No script version found' });
      }
      
      // Get unapplied recommendations
      const allRecommendations = await storage.getSceneRecommendations(currentVersion.id);
      const unappliedRecommendations = allRecommendations.filter(r => !r.applied);
      
      if (unappliedRecommendations.length === 0) {
        return res.json({
          success: true,
          message: 'No recommendations to apply',
          newVersion: currentVersion,
        });
      }
      
      // Sort recommendations by priority, score delta, confidence, and sceneId (for determinism)
      unappliedRecommendations.sort((a, b) => {
        // Priority order: critical > high > medium > low
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Then by score delta (higher first)
        const aScore = a.scoreDelta || 0;
        const bScore = b.scoreDelta || 0;
        if (aScore !== bScore) return bScore - aScore;
        
        // Then by confidence (higher first)
        const aConf = a.confidence || 0.5;
        const bConf = b.confidence || 0.5;
        if (aConf !== bConf) return bConf - aConf;
        
        // Finally by sceneId (for deterministic ordering)
        return a.sceneId - b.sceneId;
      });
      
      // Clone scenes and apply all recommendations
      const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
      const affectedSceneIds: number[] = [];
      
      for (const rec of unappliedRecommendations) {
        const scene = scenes.find((s: any) => s.id === rec.sceneId);
        if (scene) {
          scene.text = rec.suggestedText;
          scene.recommendationApplied = true;
          scene.lastModified = new Date().toISOString();
          affectedSceneIds.push(rec.sceneId);
        }
      }
      
      // Create new version with provenance
      const newVersion = await createNewScriptVersion({
        projectId: id,
        scenes,
        createdBy: 'ai',
        changes: {
          type: 'bulk_apply',
          affectedScenes: affectedSceneIds,
          count: unappliedRecommendations.length,
          description: `Applied ${unappliedRecommendations.length} AI recommendations`,
        },
        parentVersionId: currentVersion.id,
        analysisResult: currentVersion.analysisResult,
        analysisScore: currentVersion.analysisScore ?? undefined,
        provenance: {
          source: 'bulk_apply',
          agent: 'architect', // Aggregator that orchestrated all agent recommendations
          userId: userId,
          ts: new Date().toISOString(),
        },
        userId: userId,
      });
      
      // Mark all as applied
      for (const rec of unappliedRecommendations) {
        await storage.markRecommendationApplied(rec.id);
      }
      
      return res.json({
        success: true,
        newVersion,
        appliedCount: unappliedRecommendations.length,
        affectedScenes: affectedSceneIds,
      });
    } catch (error: any) {
      console.error('[Apply All Recommendations] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // POST /api/projects/:id/edit-scene - Manual edit scene
  app.post("/api/projects/:id/edit-scene", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { sceneId, newText } = req.body;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const currentVersion = await storage.getCurrentScriptVersion(id);
      if (!currentVersion) {
        return res.status(404).json({ message: 'No script version found' });
      }
      
      // Clone and update
      const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
      const scene = scenes.find((s: any) => s.id === sceneId);
      
      if (!scene) {
        return res.status(404).json({ message: 'Scene not found' });
      }
      
      const oldText = scene.text;
      scene.text = newText;
      scene.manuallyEdited = true;
      scene.lastModified = new Date().toISOString();
      
      // Create new version with provenance
      const newVersion = await createNewScriptVersion({
        projectId: id,
        scenes,
        createdBy: 'user',
        changes: {
          type: 'manual_edit',
          affectedScenes: [sceneId],
          sceneId,
          before: oldText,
          after: newText,
        },
        parentVersionId: currentVersion.id,
        analysisResult: currentVersion.analysisResult,
        analysisScore: currentVersion.analysisScore ?? undefined,
        provenance: {
          source: 'manual_edit',
          userId: userId,
          ts: new Date().toISOString(),
        },
        userId: userId,
      });
      
      return res.json({
        success: true,
        newVersion,
        needsReanalysis: true,
      });
    } catch (error: any) {
      console.error('[Edit Scene] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // POST /api/projects/:id/revert-to-version - Revert to previous version
  app.post("/api/projects/:id/revert-to-version", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { versionId } = req.body;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Get all versions to find target
      const versions = await storage.getScriptVersions(id);
      const targetVersion = versions.find(v => v.id === versionId);
      
      if (!targetVersion) {
        return res.status(404).json({ message: 'Version not found' });
      }
      
      const currentVersion = await storage.getCurrentScriptVersion(id);
      
      // Create new version from old one (non-destructive!) with provenance
      const newVersion = await createNewScriptVersion({
        projectId: id,
        scenes: targetVersion.scenes as any[],
        createdBy: 'user',
        changes: {
          type: 'revert',
          revertedFrom: currentVersion?.id,
          revertedToVersion: targetVersion.versionNumber,
        },
        parentVersionId: currentVersion?.id,
        analysisResult: targetVersion.analysisResult as any,
        analysisScore: targetVersion.analysisScore ?? undefined,
        provenance: {
          source: 'revert',
          userId: userId,
          revertedToVersion: targetVersion.versionNumber,
          ts: new Date().toISOString(),
        },
        userId: userId,
      });
      
      return res.json({
        success: true,
        newVersion,
        message: `Reverted to version ${targetVersion.versionNumber}`,
      });
    } catch (error: any) {
      console.error('[Revert Version] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  // POST /api/projects/:id/create-initial-version - Create initial script version from analysis
  app.post("/api/projects/:id/create-initial-version", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { scenes, analysisResult, analysisScore } = req.body;
      const userId = getUserId(req);
      
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Check if version already exists
      const existingVersion = await storage.getCurrentScriptVersion(id);
      if (existingVersion) {
        return res.json({
          success: true,
          version: existingVersion,
          message: 'Version already exists',
        });
      }
      
      // Create initial version
      const newVersion = await createNewScriptVersion({
        projectId: id,
        scenes,
        createdBy: 'system',
        changes: {
          type: 'initial',
          description: 'Initial version from AI analysis',
        },
        analysisResult,
        analysisScore,
      });
      
      // Extract and create recommendations
      const recommendationsData = extractRecommendationsFromAnalysis(analysisResult, scenes);
      
      if (recommendationsData.length > 0) {
        const recommendations = recommendationsData.map(rec => ({
          ...rec,
          scriptVersionId: newVersion.id,
        }));
        
        await storage.createSceneRecommendations(recommendations);
      }
      
      return res.json({
        success: true,
        version: newVersion,
        recommendationsCount: recommendationsData.length,
      });
    } catch (error: any) {
      console.error('[Create Initial Version] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
