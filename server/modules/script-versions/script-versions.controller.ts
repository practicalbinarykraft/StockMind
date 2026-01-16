import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { scriptVersionsService } from "./script-versions.service";
import { storage } from "../../storage";
import {
  ProjectIdParamDto,
  ProjectVersionParamsDto,
  CreateInitialVersionDto,
} from "./script-versions.dto";
import {
  ScriptVersionNotFoundError,
  CannotDeleteCurrentVersionError,
  CanOnlyAcceptCandidateVersionsError,
  ProjectNotFoundError,
} from "./script-versions.errors";

/**
 * Controller for Script Versions
 * Handles req/res, validation, HTTP status codes
 */
export const scriptVersionsController = {
  /**
   * GET /api/projects/:id/script-history
   * Get script version history and recommendations for a project
   */
  async getScriptHistory(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);

      // Check project access
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const data = await scriptVersionsService.getScriptHistory(id);

      return apiResponse.ok(res, data);
    } catch (error: any) {
      logger.error("Script History error", { error: error.message });
      return apiResponse.serverError(res, error.message, error);
    }
  },

  /**
   * GET /api/projects/:id/script-versions
   * Get all script versions for frontend
   */
  async getVersionsList(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);

      // Check project access
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const versions = await scriptVersionsService.getVersionsList(id);
      return res.json({ versions });
    } catch (error: any) {
      logger.error("[Script Versions] Error fetching versions", {
        error: error.message,
        projectId: req.params.id,
      });
      return res
        .status(500)
        .json({ message: "Failed to fetch script versions" });
    }
  },

  /**
   * GET /api/projects/:id/versions/:versionId
   * Get a specific version by ID
   */
  async getVersionById(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId, versionId } = ProjectVersionParamsDto.parse(
        req.params
      );

      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const version = await scriptVersionsService.getVersionById(
        versionId,
        projectId
      );

      return apiResponse.ok(res, { version });
    } catch (error: any) {
      if (error instanceof ScriptVersionNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("Get Version error", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/projects/:id/create-initial-version
   * Create initial script version from analysis
   */
  async createInitialVersion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id } = ProjectIdParamDto.parse(req.params);
      const { scenes, analysisResult, analysisScore } =
        CreateInitialVersionDto.parse(req.body);

      // Check project access
      const project = await storage.getProjectById(id);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const result = await scriptVersionsService.createInitialVersion(
        id,
        scenes,
        analysisResult,
        analysisScore
      );

      if (result.alreadyExists) {
        return apiResponse.ok(res, {
          version: result.version,
          message: "Version already exists",
        });
      }

      return apiResponse.ok(res, {
        version: result.version,
        recommendationsCount: result.recommendationsCount,
      });
    } catch (error: any) {
      logger.error("Create Initial Version error", { error: error.message });
      return apiResponse.serverError(res, error.message, error);
    }
  },

  /**
   * PUT /api/projects/:id/versions/:versionId/accept
   * Accept candidate version and make it current
   */
  async acceptVersion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId, versionId } = ProjectVersionParamsDto.parse(
        req.params
      );

      // Check project access
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await scriptVersionsService.acceptVersion(
        projectId,
        versionId
      );

      return apiResponse.ok(res, {
        ...result,
        message: "Version accepted successfully",
      });
    } catch (error: any) {
      if (error instanceof ScriptVersionNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      if (error instanceof CanOnlyAcceptCandidateVersionsError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Accept Version error", { error: error.message });
      return apiResponse.serverError(res, "Failed to accept version");
    }
  },

  /**
   * DELETE /api/projects/:id/versions/:versionId
   * Delete/reject candidate version
   */
  async deleteVersion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId, versionId } = ProjectVersionParamsDto.parse(
        req.params
      );

      // Check project access
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      } // service

      const result = await scriptVersionsService.deleteVersion(
        projectId,
        versionId
      );

      return apiResponse.ok(res, {
        ...result,
        message: "Version deleted successfully",
      });
    } catch (error: any) {
      if (error instanceof ScriptVersionNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      if (error instanceof CannotDeleteCurrentVersionError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Delete Version error", { error: error.message });
      return apiResponse.serverError(res, "Failed to delete version");
    }
  },
};
