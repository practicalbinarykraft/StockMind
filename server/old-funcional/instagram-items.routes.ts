import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { scoreInstagramReel } from "../ai-services";
import { transcribeInstagramItemBackground } from "./helpers/background-tasks";
import { logger } from "../lib/logger";

/**
 * Instagram Items routes
 * Handles operations for Instagram Reel items:
 * - Fetching items (list and by ID)
 * - Updating item actions (selected, dismissed, seen)
 * - Transcribing video content
 * - AI scoring of transcribed content
 */
export function registerInstagramItemsRoutes(app: Express) {
  // GET /api/instagram/items - Get all Instagram items for current user
  app.get("/api/instagram/items", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { sourceId } = req.query;

      const items = await storage.getInstagramItems(userId, sourceId);

      res.json(items);
    } catch (error: any) {
      logger.error("Error fetching Instagram items", { error: error.message });
      res.status(500).json({ message: "Failed to fetch Instagram items" });
    }
  });

  // GET /api/instagram/items/:id - Get specific Instagram item by ID
  app.get("/api/instagram/items/:id", requireAuth, async (req: any, res) => {
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
      logger.error("Error fetching Instagram item", { error: error.message });
      res.status(500).json({ message: "Failed to fetch Instagram item" });
    }
  });

  // PATCH /api/instagram/items/:id/action - Update item action (selected, dismissed, seen)
  app.patch("/api/instagram/items/:id/action", requireAuth, async (req: any, res) => {
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
      logger.error("Error updating Instagram item action", { error: error.message });
      res.status(500).json({ message: "Failed to update Instagram item" });
    }
  });

  // POST /api/instagram/items/:id/transcribe - Start video transcription
  app.post("/api/instagram/items/:id/transcribe", requireAuth, async (req: any, res) => {
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
      logger.error("Error starting transcription", { error: error.message });
      res.status(500).json({ message: "Failed to start transcription" });
    }
  });

  // POST /api/instagram/items/:id/score - Score Instagram Reel with AI
  app.post("/api/instagram/items/:id/score", requireAuth, async (req: any, res) => {
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

      const apiKey = apiKeyRecord.decryptedKey; // Decrypted value from storage

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
      logger.error("Error scoring Instagram item", { error: error.message });
      res.status(500).json({ message: "Failed to score Instagram item" });
    }
  });

  // GET /api/instagram/proxy-image - Proxy Instagram images to avoid CORS
  app.get("/api/instagram/proxy-image", requireAuth, async (req: any, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL parameter is required" });
      }
      
      // Validate that URL is from Instagram CDN
      if (!url.includes('cdninstagram.com')) {
        return res.status(400).json({ message: "Invalid URL - must be from Instagram CDN" });
      }
      
      // Fetch the image from Instagram
      const response = await fetch(url);
      
      if (!response.ok) {
        logger.error("Failed to fetch Instagram image", { url, status: response.status });
        return res.status(response.status).json({ message: "Failed to fetch image" });
      }
      
      // Get the image buffer
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
      
      // Send the image
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      logger.error("Error proxying Instagram image", { error: error.message });
      res.status(500).json({ message: "Failed to proxy image" });
    }
  });
}
