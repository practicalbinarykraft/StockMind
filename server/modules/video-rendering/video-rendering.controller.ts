// ============================================================================
// VIDEO RENDERING CONTROLLER
// ============================================================================
// REST API эндпоинты для управления рендерингом видео

import type { Request, Response } from "express";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { videoRenderingService } from "./video-rendering.service";
import { logger } from "../../lib/logger";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const RenderVideoParamsDto = z.object({
  scriptId: z.string().min(1),
});

const RenderVideoBodyDto = z.object({
  width: z.number().int().min(100).max(7680).optional(),
  height: z.number().int().min(100).max(4320).optional(),
  fps: z.number().int().min(1).max(120).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  format: z.enum(['mp4', 'webm']).optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
});

const RenderStatusParamsDto = z.object({
  scriptId: z.string().min(1),
  jobId: z.string().min(1),
});

const CancelRenderParamsDto = z.object({
  jobId: z.string().min(1),
});

// ============================================================================
// CONTROLLER
// ============================================================================

export const videoRenderingController = {
  /**
   * POST /api/scripts/:scriptId/render
   * Запустить рендеринг видео для скрипта
   */
  async renderVideo(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { scriptId } = RenderVideoParamsDto.parse(req.params);
      const body = RenderVideoBodyDto.parse(req.body);

      logger.info("Starting video render request", { scriptId, userId });

      const result = await videoRenderingService.renderVideo({
        scriptId,
        userId,
        ...body,
      });

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("video-rendering renderVideo", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /**
   * GET /api/scripts/:scriptId/render/:jobId/status
   * Получить статус задачи рендеринга
   */
  async getRenderStatus(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { jobId } = RenderStatusParamsDto.parse(req.params);

      const result = await videoRenderingService.getRenderStatus(jobId);

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("video-rendering getRenderStatus", { error: e.message });
      
      if (e.message.includes('not found')) {
        return apiResponse.notFound(res, e.message);
      }
      
      return apiResponse.serverError(res, e.message);
    }
  },

  /**
   * GET /api/render/jobs
   * Получить все задачи рендеринга текущего пользователя
   */
  async getUserRenderJobs(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const result = await videoRenderingService.getUserRenderJobs(userId);

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("video-rendering getUserRenderJobs", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /**
   * DELETE /api/render/jobs/:jobId
   * Отменить задачу рендеринга
   */
  async cancelRenderJob(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { jobId } = CancelRenderParamsDto.parse(req.params);

      const result = await videoRenderingService.cancelRenderJob(jobId, userId);

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("video-rendering cancelRenderJob", { error: e.message });

      if (e.message.includes('not found')) {
        return apiResponse.notFound(res, e.message);
      }

      if (e.message.includes('Unauthorized')) {
        return apiResponse.unauthorized(res);
      }

      if (e.message.includes('Cannot cancel')) {
        return apiResponse.badRequest(res, e.message);
      }

      return apiResponse.serverError(res, e.message);
    }
  },

  /**
   * GET /api/scripts/:scriptId/render/:jobId/download
   * Получить download URL для готового видео
   */
  async getDownloadUrl(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { jobId } = RenderStatusParamsDto.parse(req.params);

      const result = await videoRenderingService.getDownloadUrl(jobId, userId);

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("video-rendering getDownloadUrl", { error: e.message });

      if (e.message.includes('not found')) {
        return apiResponse.notFound(res, e.message);
      }

      if (e.message.includes('Unauthorized')) {
        return apiResponse.unauthorized(res);
      }

      if (e.message.includes('not completed')) {
        return apiResponse.badRequest(res, e.message);
      }

      return apiResponse.serverError(res, e.message);
    }
  },

  /**
   * GET /api/scripts/:scriptId/render/:jobId/preview
   * Получить preview URL для просмотра видео
   */
  async getPreviewUrl(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { jobId } = RenderStatusParamsDto.parse(req.params);

      const result = await videoRenderingService.getPreviewUrl(jobId, userId);

      return apiResponse.ok(res, result);
    } catch (e: any) {
      logger.error("video-rendering getPreviewUrl", { error: e.message });

      if (e.message.includes('not found')) {
        return apiResponse.notFound(res, e.message);
      }

      if (e.message.includes('Unauthorized')) {
        return apiResponse.unauthorized(res);
      }

      if (e.message.includes('not completed')) {
        return apiResponse.badRequest(res, e.message);
      }

      return apiResponse.serverError(res, e.message);
    }
  },
};
