import type { Express } from "express";
import axios from "axios";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { fetchHeyGenAvatars, generateHeyGenVideo, getHeyGenVideoStatus } from "../heygen-service";
import { apiResponse } from "../lib/api-response";
import { logger } from "../lib/logger";

// Allowed domains for media proxying (security measure)
const ALLOWED_HEYGEN_DOMAINS = [
  'files.heygen.ai',
  'files2.heygen.ai',
  'resource.heygen.ai',
  'api.heygen.com'
];

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
  app.get("/api/heygen/avatars", requireAuth, async (req: any, res) => {
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

      logger.debug("Fetching HeyGen avatars", { userId });
      const avatars = await fetchHeyGenAvatars(apiKey.decryptedKey);

      res.json(avatars);
    } catch (error: any) {
      logger.error("Error fetching HeyGen avatars", { error: error.message });
      res.status(500).json({ message: "Failed to fetch avatars" });
    }
  });

  /**
   * POST /api/heygen/generate
   * Generates an avatar video using HeyGen
   * Requires: HeyGen API key
   * Body: { avatarId, script, audioUrl?, voiceId?, dimension? }
   * Note: Requires either audioUrl (audio mode) or voiceId (text mode)
   */
  app.post("/api/heygen/generate", requireAuth, async (req: any, res) => {
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

      logger.info("Generating HeyGen video", { userId, avatarId, mode: audioUrl ? 'audio' : 'text' });
      const videoId = await generateHeyGenVideo(apiKey.decryptedKey, {
        avatar_id: avatarId,
        script,
        audio_url: audioUrl,
        voice_id: voiceId,
        dimension
      });

      res.json({ videoId });
    } catch (error: any) {
      logger.error("Error generating HeyGen video", { error: error.message });

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
  app.get("/api/heygen/status/:videoId", requireAuth, async (req: any, res) => {
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

      logger.debug("Checking HeyGen video status", { videoId });
      const status = await getHeyGenVideoStatus(apiKey.decryptedKey, videoId);

      // Use apiResponse for consistent JSON format
      return apiResponse.ok(res, status);
    } catch (error: any) {
      logger.error("Error checking HeyGen video status", { error: error.message, videoId: req.params.videoId });
      return apiResponse.serverError(res, "Failed to check video status", error);
    }
  });

  /**
   * GET /api/heygen/image-proxy
   * Proxies HeyGen avatar images to avoid CORS and hotlinking issues
   * Query: url - The HeyGen image URL to proxy
   */
  app.get("/api/heygen/image-proxy", requireAuth, async (req: any, res) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "Image URL is required" });
      }

      // Validate URL is from allowed HeyGen domains
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      if (!ALLOWED_HEYGEN_DOMAINS.includes(parsedUrl.hostname)) {
        logger.warn("Blocked image proxy attempt to disallowed domain", { 
          hostname: parsedUrl.hostname,
          url 
        });
        return res.status(403).json({ message: "Domain not allowed for proxying" });
      }

      logger.debug("Proxying HeyGen image", { url: url.substring(0, 100) });

      // Fetch the image from HeyGen
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000, // 15 second timeout
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'StockMind/1.0'
        }
      });

      // Set appropriate headers for the response
      const contentType = response.headers['content-type'] || 'image/webp';
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'X-Content-Type-Options': 'nosniff'
      });

      res.send(Buffer.from(response.data));
    } catch (error: any) {
      // Handle specific axios errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logger.error("Image proxy timeout", { url: req.query.url });
          return res.status(504).json({ message: "Image fetch timeout" });
        }
        if (error.response?.status === 404) {
          return res.status(404).json({ message: "Image not found" });
        }
      }
      
      logger.error("Error proxying HeyGen image", { 
        error: error.message, 
        url: req.query.url 
      });
      return res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  /**
   * GET /api/heygen/video-proxy
   * Proxies HeyGen video files for playback and download
   * Supports Range requests for video seeking
   * Query: url - The HeyGen video URL to proxy
   * Query: download - If "true", sets Content-Disposition for download
   */
  app.get("/api/heygen/video-proxy", requireAuth, async (req: any, res) => {
    try {
      const { url, download } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "Video URL is required" });
      }

      // Validate URL is from allowed HeyGen domains
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      if (!ALLOWED_HEYGEN_DOMAINS.includes(parsedUrl.hostname)) {
        logger.warn("Blocked video proxy attempt to disallowed domain", { 
          hostname: parsedUrl.hostname,
          url 
        });
        return res.status(403).json({ message: "Domain not allowed for proxying" });
      }

      logger.debug("Proxying HeyGen video", { url: url.substring(0, 100), download: !!download });

      // Prepare headers for the request
      const requestHeaders: Record<string, string> = {
        'User-Agent': 'StockMind/1.0'
      };

      // Forward Range header for video seeking
      if (req.headers.range) {
        requestHeaders['Range'] = req.headers.range;
      }

      // Fetch the video from HeyGen
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 120000, // 2 minute timeout for video
        headers: requestHeaders,
        // Don't throw on 206 Partial Content
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Set response headers
      const contentType = response.headers['content-type'] || 'video/mp4';
      const contentLength = response.headers['content-length'];
      const contentRange = response.headers['content-range'];
      const acceptRanges = response.headers['accept-ranges'];

      const responseHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff'
      };

      if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
      }

      if (contentRange) {
        responseHeaders['Content-Range'] = contentRange;
      }

      if (acceptRanges) {
        responseHeaders['Accept-Ranges'] = acceptRanges;
      } else {
        responseHeaders['Accept-Ranges'] = 'bytes';
      }

      // Set download headers if requested
      if (download === 'true') {
        // Extract filename from URL or use default
        const urlPath = parsedUrl.pathname;
        const filename = urlPath.split('/').pop() || 'heygen-video.mp4';
        responseHeaders['Content-Disposition'] = `attachment; filename="${filename}"`;
      }

      res.set(responseHeaders);
      res.status(response.status); // 200 or 206

      // Stream the video to the client
      response.data.pipe(res);

    } catch (error: any) {
      // Handle specific axios errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logger.error("Video proxy timeout", { url: req.query.url });
          return res.status(504).json({ message: "Video fetch timeout" });
        }
        if (error.response?.status === 404) {
          return res.status(404).json({ message: "Video not found" });
        }
        if (error.response?.status === 416) {
          return res.status(416).json({ message: "Range not satisfiable" });
        }
      }
      
      logger.error("Error proxying HeyGen video", { 
        error: error.message, 
        url: req.query.url 
      });
      return res.status(500).json({ message: "Failed to fetch video" });
    }
  });
}
