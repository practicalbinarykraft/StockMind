import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { scoreNewsItem, scoreInstagramReel } from "../ai-services";
import { scoreNewsAdvanced, scoreReelAdvanced, scoreCustomScriptAdvanced } from "../ai-services";
import { apiResponse } from "../lib/api-response";
import { logger } from "../lib/logger";

/**
 * Advanced Analysis routes
 * Test endpoints for advanced multi-agent analysis system and comparison with legacy system
 */
export function registerAdvancedAnalysisRoutes(app: Express) {
  /**
   * POST /api/analyze/advanced/news
   * Test advanced news analysis with multi-agent system
   */
  app.post("/api/analyze/advanced/news", requireAuth, async (req: any, res) => {
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

      logger.debug("Analyzing news with multi-agent system");
      logger.warn("Using deprecated scoreNewsAdvanced(). Consider using analyzeArticlePotential() for articles.");
      const startTime = Date.now();

      // TODO: Migrate to analyzeArticlePotential() for articles
      const result = await scoreNewsAdvanced(apiKey.decryptedKey, title, content);

      const duration = Date.now() - startTime;
      logger.debug("Advanced AI analysis completed", { durationMs: duration });

      res.json({
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error("Error in advanced news analysis", { error: error.message });
      res.status(500).json({
        message: "Failed to analyze news content"
      });
    }
  });

  /**
   * POST /api/analyze/advanced/reel
   * Test advanced Instagram Reel analysis with multi-agent system
   */
  app.post("/api/analyze/advanced/reel", requireAuth, async (req: any, res) => {
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

      logger.debug("Analyzing Instagram Reel with multi-agent system");
      const startTime = Date.now();

      const result = await scoreReelAdvanced(apiKey.decryptedKey, transcription, caption || null);

      const duration = Date.now() - startTime;
      logger.debug("Reel analysis completed", { durationMs: duration });

      res.json({
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error("Error in advanced reel analysis", { error: error.message });
      res.status(500).json({
        message: "Failed to analyze reel content"
      });
    }
  });

  /**
   * POST /api/analyze/advanced/script
   * Test advanced custom script analysis with multi-agent system
   */
  app.post("/api/analyze/advanced/script", requireAuth, async (req: any, res) => {
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

      logger.debug("Analyzing custom script with multi-agent system");
      const startTime = Date.now();

      const result = await scoreCustomScriptAdvanced(
        apiKey.decryptedKey,
        text,
        format || 'short-form',
        scenes
      );

      const duration = Date.now() - startTime;
      logger.debug("Script analysis completed", { durationMs: duration });

      res.json({
        ...result,
        metadata: {
          analysisTime: duration,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logger.error("Error in advanced script analysis", { error: error.message });
      res.status(500).json({
        message: "Failed to analyze script"
      });
    }
  });

  /**
   * POST /api/analyze/compare
   * Compare old vs new analysis systems
   * Useful for testing and validating the new multi-agent system
   */
  app.post("/api/analyze/compare", requireAuth, async (req: any, res) => {
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

      logger.debug("Running comparison between old and new analysis systems");

      let oldResult: any;
      let newResult: any;
      const startOld = Date.now();
      const startNew = Date.now();

      if (type === 'news') {
        if (!title || !content) {
          return res.status(400).json({ message: "Title and content required for news" });
        }

        oldResult = await scoreNewsItem(apiKey.decryptedKey, title, content);
        const oldDuration = Date.now() - startOld;

        // TODO: Migrate to analyzeArticlePotential() for articles
        newResult = await scoreNewsAdvanced(apiKey.decryptedKey, title, content);
        const newDuration = Date.now() - startNew;

        return apiResponse.ok(res, {
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

        oldResult = await scoreInstagramReel(apiKey.decryptedKey, transcription, caption || null);
        const oldDuration = Date.now() - startOld;

        newResult = await scoreReelAdvanced(apiKey.decryptedKey, transcription, caption || null);
        const newDuration = Date.now() - startNew;

        return apiResponse.ok(res, {
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
        return apiResponse.badRequest(res, "Type must be 'news' or 'reel'");
      }
    } catch (error: any) {
      logger.error("Error in comparison", { error: error.message });
      return apiResponse.serverError(res, "Failed to compare analysis systems", error);
    }
  });
}
