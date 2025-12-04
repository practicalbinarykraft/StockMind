import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { analyzeScript, scoreText } from "../ai-services";

/**
 * AI Analysis routes
 * Handles script analysis and text scoring using AI services
 */
export function registerAiRoutes(app: Express) {
  /**
   * POST /api/ai/analyze-script
   * Analyzes a script using AI based on the specified format
   * Requires: Anthropic API key
   */
  app.post("/api/ai/analyze-script", requireAuth, async (req: any, res) => {
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
      const analysis = await analyzeScript(apiKey.decryptedKey, format, content);

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

  /**
   * POST /api/ai/score-text
   * Scores text content using AI analysis
   * Requires: Anthropic API key
   */
  app.post("/api/ai/score-text", requireAuth, async (req: any, res) => {
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
      const result = await scoreText(apiKey.decryptedKey, text);

      res.json(result);
    } catch (error: any) {
      console.error("Error scoring text:", error);
      res.status(500).json({ message: error.message || "Failed to score text" });
    }
  });
}
