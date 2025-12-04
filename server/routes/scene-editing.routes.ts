import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { ScriptVersionService } from "../services/script-version-service";
import { apiResponse } from "../lib/api-response";
import { analyzeScriptAdvanced } from "../ai-services/advanced";
import { generateSceneRecommendations } from "../ai-services/scene-recommendations";
import { logger } from "../lib/logger";

const scriptVersionService = new ScriptVersionService(storage);

/**
 * Scene Editing routes
 * Handles scene recommendations and manual editing
 */
export function registerSceneEditingRoutes(app: Express) {
  /**
   * GET /api/projects/:id/scene-recommendations
   * Get scene recommendations for current version
   */
  app.get("/api/projects/:id/scene-recommendations", requireAuth, async (req: any, res) => {
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

  /**
   * POST /api/projects/:id/apply-scene-recommendation
   * Apply recommendation to single scene
   */
  app.post("/api/projects/:id/apply-scene-recommendation", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { recommendationId } = req.body;
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

      // Get sceneId from recommendation
      // NOTE: recommendation.sceneId is the scene NUMBER (1-indexed), not database ID
      const sceneNumber = recommendation.sceneId;

      // Clone current scenes and apply recommendation
      const scenes = JSON.parse(JSON.stringify(currentVersion.scenes));
      const targetScene = scenes.find((s: any) => s.sceneNumber === sceneNumber);

      if (!targetScene) {
        return res.status(404).json({ message: 'Scene not found' });
      }

      const oldText = targetScene.text;
      targetScene.text = recommendation.suggestedText;
      targetScene.recommendationApplied = true;
      targetScene.lastModified = new Date().toISOString();

      // Create new version with provenance
      const newVersion = await scriptVersionService.createVersion({
        projectId: id,
        scenes,
        createdBy: 'ai',
        changes: {
          type: 'scene_recommendation',
          affectedScenes: [sceneNumber],
          sceneId: sceneNumber,
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

      // Copy all unapplied recommendations to new version
      const unappliedRecs = recommendations.filter(r => r.id !== recommendationId && !r.appliedAt);
      if (unappliedRecs.length > 0) {
        const newRecs = unappliedRecs.map(r => ({
          scriptVersionId: newVersion.id,
          sceneId: r.sceneId,
          priority: r.priority,
          area: r.area,
          currentText: r.currentText,
          suggestedText: r.suggestedText,
          reasoning: r.reasoning,
          expectedImpact: r.expectedImpact,
          scoreDelta: r.scoreDelta,
          confidence: r.confidence,
          sourceAgent: r.sourceAgent,
        }));
        await storage.createSceneRecommendations(newRecs);
      }

      return res.json({
        success: true,
        data: {
          affectedScene: {
            sceneNumber: sceneNumber,
            text: targetScene.text,
          },
          needsReanalysis: true,
        },
      });
    } catch (error: any) {
      console.error('[Apply Scene Recommendation] Error:', error);
      return res.status(500).json({ message: error.message });
    }
  });

  /**
   * POST /api/projects/:id/apply-all-recommendations
   * Apply all (or specific) recommendations
   */
  app.post("/api/projects/:id/apply-all-recommendations", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { recommendationIds } = req.body; // Optional: array of UUIDs to apply
      const userId = getUserId(req);

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const result = await scriptVersionService.applyAllRecommendations({
        projectId: id,
        userId,
        recommendationIds,
      });

      return apiResponse.ok(res, result);
    } catch (error: any) {
      console.error('[Apply All Recommendations] Error:', error);
      return apiResponse.serverError(res, error.message, error);
    }
  });

  /**
   * POST /api/projects/:id/edit-scene
   * Manual edit scene
   */
  app.post("/api/projects/:id/edit-scene", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { sceneId, newText } = req.body;
      const userId = getUserId(req);

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const result = await scriptVersionService.applySceneEdit({
        projectId: id,
        sceneId,
        newText,
        userId,
      });

      return apiResponse.ok(res, result);
    } catch (error: any) {
      console.error('[Edit Scene] Error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ message: error.message });
    }
  });

  /**
   * POST /api/projects/:id/revert-to-version
   * Revert to previous version
   */
  app.post("/api/projects/:id/revert-to-version", requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { versionId } = req.body;
      const userId = getUserId(req);

      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const result = await scriptVersionService.revertToVersion({
        projectId: id,
        versionId,
        userId,
      });

      return apiResponse.ok(res, result);
    } catch (error: any) {
      console.error('[Revert Version] Error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ message: error.message });
    }
  });

  /**
   * POST /api/projects/:id/analysis/run
   * Analyze script scenes and generate recommendations
   * Used by SceneEditor when user clicks "Анализ сценария"
   */
  app.post("/api/projects/:id/analysis/run", requireAuth, async (req: any, res) => {
    try {
      const { id: projectId } = req.params;
      const { scenes } = req.body;
      const userId = getUserId(req);

      if (!userId) return apiResponse.unauthorized(res);

      if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
        return apiResponse.badRequest(res, "Scenes array is required");
      }

      // Validate project
      const project = await storage.getProject(projectId, userId);
      if (!project) return apiResponse.notFound(res, "Project not found");

      // Get API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "Anthropic API key not configured. Please add it in Settings.");
      }

      logger.info(`[Analysis Run] Analyzing ${scenes.length} scenes for project ${projectId}`);

      // Combine scenes into full script text
      const fullScript = scenes
        .sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0))
        .map(s => s.text)
        .join('\n\n');

      // Run advanced analysis
      const startTime = Date.now();
      const analysis = await analyzeScriptAdvanced(
        apiKey.decryptedKey,
        fullScript,
        'custom_script'
      );
      const analysisTime = Date.now() - startTime;

      logger.info(`[Analysis Run] Analysis completed in ${analysisTime}ms`, {
        overallScore: analysis.overallScore,
        projectId,
      });

      // Generate scene recommendations
      const recommendations = await generateSceneRecommendations(
        apiKey.decryptedKey,
        scenes.map(s => ({
          sceneNumber: s.sceneNumber || 0,
          text: s.text,
        })),
        {
          format: project.sourceType === 'news' ? 'news_update' : 'short-form',
          language: 'ru',
        }
      );

      logger.info(`[Analysis Run] Generated ${recommendations.length} recommendations`);

      // Get current version to check cache
      const currentVersion = await storage.getCurrentScriptVersion(projectId);
      const cached = currentVersion?.metrics && 
        (currentVersion.metrics as any).overallScore === analysis.overallScore;

      // Map recommendations to match client interface
      // generateSceneRecommendations returns: sceneNumber, current, suggested
      // Client expects: sceneId, currentText, suggestedText
      const mappedRecommendations = recommendations.map((r, index) => ({
        id: index + 1, // Temporary ID for fresh recommendations
        sceneId: r.sceneNumber, // sceneId is the scene number (1-indexed)
        priority: r.priority as 'critical' | 'high' | 'medium' | 'low',
        area: r.area,
        currentText: r.current,
        suggestedText: r.suggested,
        reasoning: r.reasoning,
        expectedImpact: r.expectedImpact,
        scoreDelta: r.delta,
        confidence: undefined, // Not provided by generateSceneRecommendations
      }));

      return apiResponse.ok(res, {
        analysis: {
          overallScore: analysis.overallScore,
          verdict: analysis.verdict,
          confidence: analysis.confidence,
          hookScore: analysis.hookScore,
          structureScore: analysis.structureScore,
          emotionalScore: analysis.emotionalScore,
          ctaScore: analysis.ctaScore,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          recommendations: analysis.recommendations,
        },
        recommendations: mappedRecommendations,
        cached,
        metadata: {
          analysisTime,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('[Analysis Run] Error:', {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
      });
      return apiResponse.serverError(res, error.message || "Failed to analyze script", error);
    }
  });
}
