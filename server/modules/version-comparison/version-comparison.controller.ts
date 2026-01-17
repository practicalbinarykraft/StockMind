import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { versionComparisonService } from "./version-comparison.service";
import { ProjectsService } from "../projects/projects.service";
import {
  ProjectIdParamDto,
  CompareVersionsQueryDto,
  ChooseVersionDto,
} from "./version-comparison.dto";
import {
  VersionNotFoundError,
  MissingCurrentVersionError,
  MissingCandidateVersionError,
  NoCandidateVersionError,
} from "./version-comparison.errors";

const projectsService = new ProjectsService();

/**
 * Controller for Version Comparison
 * Handles req/res, validation, HTTP status codes
 */
export const versionComparisonController = {
  /**
   * GET /api/projects/:id/compare
   * Compare two specific versions by ID
   */
  async compareVersions(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);
      const { baseVersionId, targetVersionId } = CompareVersionsQueryDto.parse(
        req.query
      );

      // Validate project
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await versionComparisonService.compareVersions(
        projectId,
        baseVersionId,
        targetVersionId
      );

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof VersionNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("Compare Versions error", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * GET /api/projects/:id/reanalyze/compare/latest
   * Get comparison data for current vs candidate version
   */
  async compareLatest(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);

      // Validate project
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await versionComparisonService.compareLatest(projectId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof MissingCurrentVersionError) {
        return apiResponse.badRequest(res, error.message);
      }

      if (error instanceof MissingCandidateVersionError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Compare Latest error", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * POST /api/projects/:id/reanalyze/compare/choose
   * Choose which version to keep (base or candidate)
   */
  async chooseVersion(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);
      const { keep } = ChooseVersionDto.parse(req.body);

      // Validate project
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await versionComparisonService.chooseVersion(projectId, keep);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      logger.error("Compare Choose error", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * DELETE /api/projects/:id/reanalyze/candidate
   * Cancel/reject candidate draft
   */
  async cancelCandidate(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);

      // Validate project
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await versionComparisonService.cancelCandidate(projectId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof NoCandidateVersionError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Cancel Candidate error", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },
};
