import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { generateAiPrompt } from "../ai-services";
import { generateKieVideo, getKieVideoStatus } from "../kie-service";
import { logger } from "../lib/logger";

/**
 * B-Roll Video Generation routes (Stage 7)
 * Handles AI prompt generation and B-roll video creation using Kie.ai
 */
export function registerBrollRoutes(app: Express) {
  /**
   * POST /api/projects/:id/broll/generate-prompt
   * Generates an AI prompt for B-roll video creation
   * Requires: Anthropic API key
   * Body: { shotInstructions, sceneText? }
   * Returns: Generated AI prompt optimized for video generation
   */
  app.post("/api/projects/:id/broll/generate-prompt", requireAuth, async (req: Request, res: Response) => {
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

      logger.info(`[B-Roll] Generating AI prompt for project ${id}...`);
      const aiPrompt = await generateAiPrompt(apiKey.decryptedKey, shotInstructions, sceneText);

      res.json({ aiPrompt });
    } catch (error: any) {
      logger.error("Error generating AI prompt:", { error });
      res.status(500).json({ message: error.message || "Failed to generate AI prompt" });
    }
  });

  /**
   * POST /api/projects/:id/broll/generate
   * Generates B-roll video using Kie.ai
   * Requires: Kie.ai API key
   * Body: { sceneId, aiPrompt, model?, aspectRatio? }
   * Returns: Task ID for tracking generation status
   */
  app.post("/api/projects/:id/broll/generate", requireAuth, async (req: Request, res: Response) => {
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
      const { generateIdempotencyKey } = await import('../lib/idempotency');
      const idempotencyKey = generateIdempotencyKey({
        projectId: id,
        sceneId,
        prompt: aiPrompt,
        model: finalModel,
        aspectRatio: finalAspectRatio,
      });

      logger.info(`[B-Roll] Generating video for project ${id}, scene ${sceneId} (requestId: ${idempotencyKey})...`);
      const taskId = await generateKieVideo(apiKey.decryptedKey, {
        prompt: aiPrompt,
        model: finalModel,
        aspectRatio: finalAspectRatio,
        requestId: idempotencyKey,
      });

      res.json({ taskId, reused: false });
    } catch (error: any) {
      logger.error("Error generating B-Roll:", { error });

      // Proper error handling: pass through provider status codes and messages
      const kieError = error as any;
      const status = kieError.statusCode || kieError.response?.status || 500;
      return res.status(status > 0 ? status : 500).json({
        message: error instanceof Error ? error.message : "Failed to generate B-Roll video",
        error: kieError.apiMessage || (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });

  /**
   * GET /api/projects/:id/broll/status/:taskId
   * Checks the status of B-roll video generation
   * Requires: Kie.ai API key
   * Returns: Generation status, progress, and video URL when completed
   */
  app.get("/api/projects/:id/broll/status/:taskId", requireAuth, async (req: Request, res: Response) => {
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

      logger.info(`[B-Roll] Checking status for task ${taskId} (project ${id})`);
      const status = await getKieVideoStatus(apiKey.decryptedKey, taskId);

      res.json(status);
    } catch (error: any) {
      logger.error("Error checking B-Roll status:", { error });

      // Proper error handling: pass through provider status codes
      const kieError = error as any;
      const status = kieError.statusCode || kieError.response?.status || 500;
      return res.status(status > 0 ? status : 500).json({
        message: error instanceof Error ? error.message : "Failed to check video status",
        error: kieError.apiMessage || (error instanceof Error ? error.message : "Unknown error")
      });
    }
  });
}
