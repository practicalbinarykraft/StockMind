import type { Request, Response } from "express";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { kieAiService } from "./kie-ai.service";
import { logger } from "../../lib/logger";
import { z } from "zod";

const TextToImageBodyDto = z.object({
  prompt: z.string().min(1),
  model: z.enum(["flux-pro", "nano-banana-pro", "recraft-v3", "flux-schnell"]),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
  numImages: z.number().int().min(1).max(4).optional(),
});

const TextToVideoBodyDto = z.object({
  prompt: z.string().min(1),
  model: z.literal("kling-ai-video"),
  duration: z.number().min(1).max(30).optional(),
  aspectRatio: z.enum(["16:9", "9:16"]).optional(),
});

const ImageToVideoBodyDto = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().optional(),
  model: z.literal("kling-ai-i2v"),
  duration: z.number().min(1).max(30).optional(),
});

const JobIdParamDto = z.object({ jobId: z.string().min(1) });

export const kieAiController = {
  /** POST /api/kie-ai/generate-image */
  async generateImage(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const body = TextToImageBodyDto.parse(req.body);
      const job = await kieAiService.generateImage({
        prompt: body.prompt,
        model: body.model,
        aspectRatio: body.aspectRatio,
        numImages: body.numImages,
      });
      return apiResponse.created(res, job);
    } catch (e: any) {
      logger.error("kie-ai generateImage", { error: e.message });
      return apiResponse.badRequest(res, e.message);
    }
  },

  /** POST /api/kie-ai/generate-video */
  async generateVideo(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const body = TextToVideoBodyDto.parse(req.body);
      const job = await kieAiService.generateVideo({
        prompt: body.prompt,
        model: body.model,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
      });
      return apiResponse.created(res, job);
    } catch (e: any) {
      logger.error("kie-ai generateVideo", { error: e.message });
      return apiResponse.badRequest(res, e.message);
    }
  },

  /** POST /api/kie-ai/image-to-video */
  async imageToVideo(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const body = ImageToVideoBodyDto.parse(req.body);
      const job = await kieAiService.imageToVideo({
        imageUrl: body.imageUrl,
        prompt: body.prompt,
        model: body.model,
        duration: body.duration,
      });
      return apiResponse.created(res, job);
    } catch (e: any) {
      logger.error("kie-ai imageToVideo", { error: e.message });
      return apiResponse.badRequest(res, e.message);
    }
  },

  /** GET /api/kie-ai/jobs/:jobId/status */
  async getJobStatus(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { jobId } = JobIdParamDto.parse(req.params);
      const job = await kieAiService.checkJobStatus(jobId);
      return apiResponse.ok(res, job);
    } catch (e: any) {
      logger.error("kie-ai getJobStatus", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },

  /** POST /api/kie-ai/webhook - для асинхронных уведомлений от Kie.ai (если поддерживается) */
  async webhook(req: Request, res: Response) {
    try {
      const payload = req.body as { task_id?: string; status?: string; result?: { url?: string }; error_message?: string };
      logger.info("kie-ai webhook received", { taskId: payload.task_id, status: payload.status });
      return apiResponse.noContent(res);
    } catch (e: any) {
      logger.error("kie-ai webhook", { error: e.message });
      return apiResponse.serverError(res, e.message);
    }
  },
};
