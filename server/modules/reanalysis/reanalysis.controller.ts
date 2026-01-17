import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { reanalysisService } from "./reanalysis.service";
import { ProjectsService } from "../projects/projects.service";
import {
  ProjectIdParamDto,
  StartReanalysisDto,
  CheckStatusQueryDto,
} from "./reanalysis.dto";
import {
  NoCurrentVersionError,
  NoApiKeyConfiguredError,
  ReanalysisAlreadyRunningError,
  JobNotFoundError,
} from "./reanalysis.errors";

const projectsService = new ProjectsService();

/**
 * Controller for Reanalysis
 * Handles req/res, validation, HTTP status codes
 */
export const reanalysisController = {
  /**
   * POST /api/projects/:id/reanalyze/start
   * Start async reanalysis job
   */
  async startReanalysis(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);
      const { idempotencyKey } = StartReanalysisDto.parse(req.body);

      // Validate project exists
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const result = await reanalysisService.startReanalysis(
        projectId,
        userId,
        idempotencyKey
      );

      // Return immediately with 202
      res.status(202);
      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof NoCurrentVersionError) {
        return apiResponse.badRequest(res, error.message);
      }

      if (error instanceof NoApiKeyConfiguredError) {
        return apiResponse.notFound(res, error.message);
      }

      if (error instanceof ReanalysisAlreadyRunningError) {
        return res.status(409).json({
          success: false,
          error: error.message,
          jobId: error.jobId,
          status: error.status,
          retryAfter: 5,
        });
      }

      logger.error("[Reanalyze Start] Error:", { error });
      return apiResponse.serverError(
        res,
        error.message || "Failed to start reanalysis"
      );
    }
  },

  /**
   * GET /api/projects/:id/reanalyze/status
   * Check job status
   */
  async getJobStatus(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = ProjectIdParamDto.parse(req.params);
      const { jobId } = CheckStatusQueryDto.parse(req.query);

      // Validate project access
      const project = await projectsService.getProjectByIdAndUserId(projectId, userId);
      if (!project) {
        return apiResponse.notFound(res, "Project not found");
      }

      const status = await reanalysisService.getJobStatus(projectId, jobId);

      return apiResponse.ok(res, status);
    } catch (error: any) {
      if (error instanceof JobNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      logger.error("[Reanalyze Status] Error:", error);
      return apiResponse.serverError(res, error.message);
    }
  },
};
