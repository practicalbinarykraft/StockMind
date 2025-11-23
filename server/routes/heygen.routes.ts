import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replit-auth";
import { getUserId } from "../utils/route-helpers";
import { fetchHeyGenAvatars, generateHeyGenVideo, getHeyGenVideoStatus } from "../heygen-service";

/**
 * HeyGen Avatar Video Generation routes
 * Handles avatar listing, video generation, and status checking using HeyGen API
 */
export function registerHeygenRoutes(app: Express) {
  /**
   * GET /api/heygen/avatars
   * Fetches available avatars from HeyGen
   * Requires: HeyGen API key
   */
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

  /**
   * POST /api/heygen/generate
   * Generates an avatar video using HeyGen
   * Requires: HeyGen API key
   * Body: { avatarId, script, audioUrl?, voiceId?, dimension? }
   * Note: Requires either audioUrl (audio mode) or voiceId (text mode)
   */
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

  /**
   * GET /api/heygen/status/:videoId
   * Checks the status of a HeyGen video generation
   * Requires: HeyGen API key
   * Returns: Video status and URL when completed
   */
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
}
