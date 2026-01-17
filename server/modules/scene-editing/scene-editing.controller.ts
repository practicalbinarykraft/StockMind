import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { sceneEditingService } from "./scene-editing.service";
import { ProjectsService } from "../projects/projects.service";
import {
  ProjectIdParamDto,
  ApplySceneRecommendationDto,
  ApplyAllRecommendationsDto,
  EditSceneDto,
  RevertToVersionDto,
  RunAnalysisDto,
} from "./scene-editing.dto";
import {
  ScriptVersionNotFoundError,
  RecommendationNotFoundError,
  SceneNotFoundError,
  NoApiKeyConfiguredError,
  ProjectNotFoundError,
} from "./scene-editing.errors";

const projectsService = new ProjectsService();

/**
 * Controller for Scene Editing
 * Handles req/res, validation, HTTP status codes
 */
export const sceneEditingController = {
  /**
   * GET /api/projects/:id/scene-recommendations
   * Get scene recommendations for current version
   */
  async getSceneRecommendations(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);

      // Check project access
      const project = await projectsService.getProjectByIdAndUserId(id, userId);
      if (!project) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const recommendations = await sceneEditingService.getSceneRecommendations(id);

      return res.json(recommendations);
    } catch (error: any) {
      logger.error("[Scene Recommendations] Error:", error.message);
      return res.status(500).json({ message: "Failed to load recommendations" });
    }
  },

  /**
   * POST /api/projects/:id/apply-scene-recommendation
   * Apply recommendation to single scene
   */
  async applySceneRecommendation(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);
      const { recommendationId } = ApplySceneRecommendationDto.parse(req.body);

      // Check project access
      const project = await projectsService.getProjectByIdAndUserId(id, userId);
      if (!project) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = await sceneEditingService.applySceneRecommendation(
        id,
        recommendationId,
        userId
      );

      return res.json(result);
    } catch (error: any) {
      if (error instanceof ScriptVersionNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof RecommendationNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      if (error instanceof SceneNotFoundError) {
        return res.status(404).json({ message: error.message });
      }

      logger.error("[Apply Scene Recommendation] Error:", error.message);
      return res.status(500).json({ message: "Failed to apply recommendation" });
    }
  },

  /**
   * POST /api/projects/:id/apply-all-recommendations
   * Apply all (or specific) recommendations
   */
  async applyAllRecommendations(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);
      const { recommendationIds } = ApplyAllRecommendationsDto.parse(req.body);

      // Check project access
      const project = await projectsService.getProjectByIdAndUserId(id, userId);
      if (!project) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = await sceneEditingService.applyAllRecommendations(
        id,
        userId,
        recommendationIds
      );

      return apiResponse.ok(res, result);
    } catch (error: any) {
      logger.error("[Apply All Recommendations] Error:", error);
      return apiResponse.serverError(res, error.message, error);
    }
  },

  /**
   * POST /api/projects/:id/edit-scene
   * Manual edit scene
   */
  async editScene(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);
      const { sceneId, newText } = EditSceneDto.parse(req.body);

      // Check project access
      const project = await projectsService.getProjectByIdAndUserId(id, userId);
      if (!project) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = await sceneEditingService.editScene(id, sceneId, newText, userId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      logger.error("[Edit Scene] Error:", error);
      const statusCode = (error as any).statusCode || 500;
      return res.status(statusCode).json({ message: error.message });
    }
  },

  /**
   * POST /api/projects/:id/revert-to-version
   * Revert to previous version
   */
  async revertToVersion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);
      const { versionId } = RevertToVersionDto.parse(req.body);

      // Check project access
      const project = await projectsService.getProjectByIdAndUserId(id, userId);
      if (!project) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = await sceneEditingService.revertToVersion(id, versionId, userId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      logger.error("[Revert Version] Error:", error);
      const statusCode = (error as any).statusCode || 500;
      return res.status(statusCode).json({ message: error.message });
    }
  },

  /**
   * POST /api/projects/:id/analysis/run
   * Analyze script scenes and generate recommendations
   */
  async runAnalysis(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);
      const { scenes } = RunAnalysisDto.parse(req.body);

      // Check project access
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await sceneEditingService.runAnalysis(projectId, scenes, userId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof NoApiKeyConfiguredError) {
        return apiResponse.badRequest(
          res,
          "Anthropic API key not configured. Please add it in Settings."
        );
      }

      logger.error("[Analysis Run] Error:", {
        error: error.message,
        stack: error.stack,
        projectId: req.params.id,
      });
      return apiResponse.serverError(
        res,
        error.message || "Failed to analyze script",
        error
      );
    }
  },
};
