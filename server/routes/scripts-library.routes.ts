import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { apiResponse } from "../lib/api-response";
import { analyzeScriptAdvanced } from "../ai-services/advanced";
import { logger } from "../lib/logger";

/**
 * Scripts Library routes
 * Handles CRUD operations for user's script library
 */
export function registerScriptsLibraryRoutes(app: Express) {
  /**
   * GET /api/scripts
   * Get all scripts for current user with optional filters
   */
  app.get("/api/scripts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { status, sourceType, search } = req.query;

      const scripts = await storage.getScripts(userId, {
        status: status as string,
        sourceType: sourceType as string,
        search: search as string,
      });

      return apiResponse.ok(res, scripts);
    } catch (error: any) {
      logger.error("Error fetching scripts", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * GET /api/scripts/:id
   * Get a single script by ID
   */
  app.get("/api/scripts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = req.params;
      const script = await storage.getScript(id, userId);

      if (!script) {
        return apiResponse.notFound(res, "Script not found");
      }

      return apiResponse.ok(res, script);
    } catch (error: any) {
      logger.error("Error fetching script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * POST /api/scripts
   * Create a new script
   */
  app.post("/api/scripts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const {
        title,
        scenes,
        fullText,
        format,
        durationSeconds,
        wordCount,
        sourceType,
        sourceId,
        sourceTitle,
        sourceUrl,
        status = 'draft',
      } = req.body;

      if (!title || !scenes || !Array.isArray(scenes)) {
        return apiResponse.badRequest(res, "Title and scenes are required");
      }

      const script = await storage.createScript(userId, {
        title,
        scenes,
        fullText,
        format,
        durationSeconds,
        wordCount,
        sourceType,
        sourceId,
        sourceTitle,
        sourceUrl,
        status,
      });

      return apiResponse.ok(res, script);
    } catch (error: any) {
      logger.error("Error creating script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * PATCH /api/scripts/:id
   * Update a script
   */
  app.patch("/api/scripts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = req.params;
      const updateData = req.body;

      const script = await storage.updateScript(id, userId, updateData);

      if (!script) {
        return apiResponse.notFound(res, "Script not found");
      }

      return apiResponse.ok(res, script);
    } catch (error: any) {
      logger.error("Error updating script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * DELETE /api/scripts/:id
   * Delete a script
   */
  app.delete("/api/scripts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = req.params;
      await storage.deleteScript(id, userId);

      return apiResponse.ok(res, { message: "Script deleted" });
    } catch (error: any) {
      logger.error("Error deleting script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * POST /api/scripts/:id/analyze
   * Analyze a script using AI
   */
  app.post("/api/scripts/:id/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = req.params;
      const script = await storage.getScript(id, userId);

      if (!script) {
        return apiResponse.notFound(res, "Script not found");
      }

      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "No Anthropic API key configured");
      }

      // Analyze script
      // Convert scenes to text for analysis
      const scriptText = Array.isArray(script.scenes) 
        ? script.scenes.map((s: any) => s.text || s).join('\n')
        : '';
      
      const analysis = await analyzeScriptAdvanced(
        apiKey.decryptedKey,
        scriptText,
        script.sourceType === 'rss' ? 'news' : 'custom_script'
      );

      // Update script with analysis
      const updated = await storage.updateScript(id, userId, {
        aiAnalysis: analysis,
        aiScore: analysis.overallScore,
        analyzedAt: new Date(),
        status: script.status === 'draft' ? 'analyzed' : script.status,
      });

      return apiResponse.ok(res, updated);
    } catch (error: any) {
      logger.error("Error analyzing script", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * POST /api/scripts/:id/start-production
   * Start production from script (create project starting at Stage 4)
   */
  app.post("/api/scripts/:id/start-production", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = req.params;
      const { skipToStage = 4 } = req.body;

      const script = await storage.getScript(id, userId);

      if (!script) {
        return apiResponse.notFound(res, "Script not found");
      }

      // Import project service
      const { ProjectService } = await import("../services/project-service");
      const projectService = new ProjectService(storage);
      
      // Create project starting at specified stage
      const project = await projectService.createProjectFromScript(userId, script, skipToStage);

      // Link script to project
      await storage.updateScriptProject(id, project.id);

      return apiResponse.ok(res, project);
    } catch (error: any) {
      logger.error("Error starting production", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * POST /api/articles/:id/generate-script
   * Generate script from article and save to library
   */
  app.post("/api/articles/:id/generate-script", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: articleId } = req.params;
      const { format, saveToLibrary = true } = req.body;

      // Get article
      const items = await storage.getRssItems(userId);
      const item = items.find(i => i.id === articleId);

      if (!item) {
        return apiResponse.notFound(res, "Article not found");
      }

      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "No Anthropic API key configured");
      }

      // Import script generation function
      const { analyzeScript } = await import("../ai-services/analyze-script");
      
      // Prepare content for script generation
      const content = item.content || item.title || '';
      const formatName = format === 'news_update' ? 'News Update' : 
                        format === 'explainer' ? 'Explainer' :
                        format === 'hook_story' ? 'Hook & Story' : 'News Update';

      // Generate script
      const scriptResult = await analyzeScript(
        apiKey.decryptedKey,
        formatName,
        content
      );

      if (!saveToLibrary) {
        return apiResponse.ok(res, scriptResult);
      }

      // Convert scenes to proper format
      const scenes = scriptResult.scenes.map((s: any, index: number) => ({
        sceneNumber: s.sceneNumber || (index + 1),
        text: s.text || s.current || '',
        start: s.start || 0,
        end: s.end || (s.duration || 5),
        duration: s.duration || 5,
      }));

      // Save to library
      const script = await storage.createScript(userId, {
        title: item.title,
        scenes,
        fullText: scenes.map((s: any) => s.text).join('\n'),
        format: format || 'news_update',
        durationSeconds: scenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0),
        wordCount: scenes.reduce((sum: number, s: any) => sum + (s.text?.split(/\s+/).length || 0), 0),
        sourceType: 'rss',
        sourceId: item.id,
        sourceTitle: item.title,
        sourceUrl: item.url,
        status: 'ready',
        aiScore: scriptResult.overallScore,
      });

      return apiResponse.ok(res, { script, generated: scriptResult });
    } catch (error: any) {
      logger.error("Error generating script from article", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });

  /**
   * POST /api/scripts/generate-variants
   * Generate script variants from source text using AI
   */
  app.post("/api/scripts/generate-variants", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { sourceText, prompt, format } = req.body;

      if (!sourceText || !format) {
        return apiResponse.badRequest(res, "sourceText and format are required");
      }

      // Get user's Anthropic API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.badRequest(res, "No Anthropic API key configured");
      }

      // Import analyzeScript function
      const { analyzeScript } = await import("../ai-services/analyze-script");
      
      // Generate script with variants
      const analysis = await analyzeScript(
        apiKey.decryptedKey,
        format,
        sourceText
      );

      // Transform to frontend format
      const scenes = analysis.scenes.map((scene: any, index: number) => ({
        id: String(index + 1),
        type: index === 0 ? 'hook' : (index === analysis.scenes.length - 1 ? 'cta' : 'body'),
        text: scene.text || scene.current || '',
      }));

      const variants: Record<number, Array<{ id: string; text: string; score?: number }>> = {};
      
      analysis.scenes.forEach((scene: any, index: number) => {
        // Get variants from scene.variants array
        const sceneVariants = scene.variants || []
        
        variants[index] = sceneVariants.map((variant: string, vIndex: number) => ({
          id: `v${index}-${String.fromCharCode(65 + vIndex)}`,
          text: variant,
          score: scene.score,
        }));
        
        // If no variants, use main text as first variant and create 2 more from recommendations
        if (variants[index].length === 0) {
          variants[index] = [
            { id: `v${index}-A`, text: scene.text || scene.current || '', score: scene.score },
          ];
          
          // Add recommendations as variants if available
          const sceneRecommendations = analysis.recommendations?.filter((r: any) => r.sceneNumber === (index + 1)) || []
          sceneRecommendations.slice(0, 2).forEach((rec: any, rIndex: number) => {
            if (rec.suggested && rec.suggested !== scene.text) {
              variants[index].push({
                id: `v${index}-${String.fromCharCode(66 + rIndex)}`,
                text: rec.suggested,
                score: (scene.score || 50) + (parseInt(rec.expectedImpact?.replace(/[^0-9]/g, '') || '10')),
              })
            }
          })
        }
      });

      return apiResponse.ok(res, {
        scenes,
        variants,
      });
    } catch (error: any) {
      logger.error("Error generating script variants", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  });
}

