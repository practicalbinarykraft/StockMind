// Reference: javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApiKeySchema, insertRssSourceSchema, insertInstagramSourceSchema, insertProjectSchema, insertProjectStepSchema } from "@shared/schema";
import Parser from "rss-parser";
import { scoreNewsItem, analyzeScript, generateAiPrompt, scoreText, scoreInstagramReel } from "./ai-service";
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const keys = await storage.getApiKeys(userId);
      res.json(keys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/settings/api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(userId, validated);
      res.json(apiKey);
    } catch (error: any) {
      console.error("Error creating API key:", error);
      res.status(400).json({ message: error.message || "Failed to create API key" });
    }
  });

  app.delete("/api/settings/api-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Get the API key from database (with decrypted value)
      const apiKey = await storage.getApiKeyById(id, userId);
      
      if (!apiKey) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      // Test based on provider
      if (apiKey.provider === 'anthropic') {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({ apiKey: apiKey.encryptedKey }); // encryptedKey is actually decrypted here
        
        // Simple test message with correct Anthropic API schema
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50, // Note: SDK accepts max_tokens, not max_output_tokens
          messages: [{ 
            role: 'user', 
            content: 'Say "API key is working!" in one sentence.' 
          }],
        });
        
        const textContent = message.content.find((c: any) => c.type === 'text');
        res.json({ 
          success: true, 
          message: (textContent as any)?.text || 'Test successful',
          provider: apiKey.provider 
        });
      } else {
        res.json({ success: true, message: `${apiKey.provider} key test not yet implemented` });
      }
    } catch (error: any) {
      console.error("Error testing API key:", error);
      
      if (error.message?.includes('invalid') || error.message?.includes('authentication')) {
        return res.status(400).json({ 
          success: false, 
          message: "API key is invalid or expired" 
        });
      }
      
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
      const userId = req.user.claims.sub;
      const sources = await storage.getRssSources(userId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching RSS sources:", error);
      res.status(500).json({ message: "Failed to fetch RSS sources" });
    }
  });

  app.post("/api/settings/rss-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const sources = await storage.getInstagramSources(userId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching Instagram sources:", error);
      res.status(500).json({ message: "Failed to fetch Instagram sources" });
    }
  });

  app.post("/api/settings/instagram-sources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
              externalId: reel.id,
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

        // Update source with success status
        await storage.updateInstagramSource(id, userId, {
          parseStatus: 'success',
          lastParsed: new Date(),
          itemCount: result.itemCount,
          parseError: null,
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
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.updateInstagramSource(id, userId, {
        parseStatus: 'error',
        parseError: error.message || 'Unknown error',
      }).catch(err => console.error('Failed to update error status:', err));

      res.status(500).json({ message: error.message || "Failed to parse Instagram source" });
    }
  });

  // ============================================================================
  // INSTAGRAM ITEMS ROUTES
  // ============================================================================

  app.get("/api/instagram/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Extended parsing (fetches all available items from RSS feeds)
  // NOTE: RSS feeds typically only return latest N items (10-50), so date range is used for filtering, not fetching
  app.post("/api/news/refresh-extended", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
      const { avatarId, script, audioUrl, voiceId, dimension } = req.body;

      if (!avatarId || !script) {
        return res.status(400).json({ message: "Avatar ID and script are required" });
      }

      // Get user's HeyGen API key
      const apiKey = await storage.getUserApiKey(userId, 'heygen');
      if (!apiKey) {
        return res.status(400).json({ 
          message: "No HeyGen API key configured. Please add your API key in Settings." 
        });
      }

      console.log(`[HeyGen] Generating video for user ${userId}, avatar ${avatarId}`);
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
      res.status(500).json({ message: error.message || "Failed to generate video" });
    }
  });

  app.get("/api/heygen/status/:videoId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const { id } = req.params;
      const steps = await storage.getProjectSteps(id);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching project steps:", error);
      res.status(500).json({ message: "Failed to fetch project steps" });
    }
  });

  app.post("/api/projects/:id/steps", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
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
      const userId = req.user.claims.sub;
      const { shotInstructions, sceneText } = req.body;

      if (!shotInstructions) {
        return res.status(400).json({ message: "Shot instructions required" });
      }

      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Anthropic API key not configured. Please add it in Settings." 
        });
      }

      console.log(`[B-Roll] Generating AI prompt for scene...`);
      const aiPrompt = await generateAiPrompt(apiKey.encryptedKey, shotInstructions, sceneText);
      
      res.json({ aiPrompt });
    } catch (error: any) {
      console.error("Error generating AI prompt:", error);
      res.status(500).json({ message: error.message || "Failed to generate AI prompt" });
    }
  });

  app.post("/api/projects/:id/broll/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { sceneId, aiPrompt } = req.body;

      if (!aiPrompt) {
        return res.status(400).json({ message: "AI prompt required" });
      }

      const apiKey = await storage.getUserApiKey(userId, 'kieai');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Kie.ai API key not configured. Please add it in Settings." 
        });
      }

      console.log(`[B-Roll] Generating video for scene ${sceneId}...`);
      const taskId = await generateKieVideo(apiKey.encryptedKey, {
        prompt: aiPrompt,
        model: 'veo3_fast',
        aspectRatio: '9:16',
        requestId: `${id}-${sceneId}`
      });
      
      res.json({ taskId });
    } catch (error: any) {
      console.error("Error generating B-Roll:", error);
      res.status(500).json({ message: error.message || "Failed to generate B-Roll" });
    }
  });

  app.get("/api/projects/:id/broll/status/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId } = req.params;

      const apiKey = await storage.getUserApiKey(userId, 'kieai');
      if (!apiKey) {
        return res.status(404).json({ 
          message: "Kie.ai API key not configured" 
        });
      }

      console.log(`[B-Roll] Checking status for task ${taskId}`);
      const status = await getKieVideoStatus(apiKey.encryptedKey, taskId);
      
      res.json(status);
    } catch (error: any) {
      console.error("Error checking B-Roll status:", error);
      res.status(500).json({ message: error.message || "Failed to check video status" });
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

  const httpServer = createServer(app);
  return httpServer;
}
