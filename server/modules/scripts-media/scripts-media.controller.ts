import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { getUserId } from "../../utils/route-helpers";
import { apiResponse } from "../../lib/api-response";
import { scriptsMediaService } from "./scripts-media.service";
import { ScriptIdParamDto } from "./dto/script-id-param.dto";
import { UpdateScriptMediaDto } from "./dto/update-script-media.dto";
import { UpdateAudioDto } from "./dto/update-audio.dto";
import { UpdateVideoDto } from "./dto/update-video.dto";
import {
  ScriptMediaNotFoundError,
  ScriptMediaValidationError,
} from "./scripts-media.errors";

/**
 * Controller для Scripts Media
 * Обработка req/res, валидация, HTTP статусы
 */
export const scriptsMediaController = {
  /**
   * GET /api/scripts/:scriptId/media
   * Получить медиа для скрипта
   */
  async getMedia(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // requireAuth middleware гарантирует наличие userId

      const { scriptId } = ScriptIdParamDto.parse(req.params);
      const media = await scriptsMediaService.findByScriptId(scriptId);

      return apiResponse.ok(res, media);
    } catch (error: any) {
      logger.error("Error fetching script media", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * PUT /api/scripts/:scriptId/media
   * Upsert медиа
   */
  async upsertMedia(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // requireAuth middleware гарантирует наличие userId

      const { scriptId } = ScriptIdParamDto.parse(req.params);
      const data = UpdateScriptMediaDto.parse(req.body);

      const media = await scriptsMediaService.upsert(scriptId, data);

      return apiResponse.ok(res, media);
    } catch (error: any) {
      if (error instanceof ScriptMediaValidationError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error upserting script media", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * PATCH /api/scripts/:scriptId/media/audio
   * Обновить аудио
   */
  async updateAudio(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // requireAuth middleware гарантирует наличие userId

      const { scriptId } = ScriptIdParamDto.parse(req.params);
      const data = UpdateAudioDto.parse(req.body);

      const media = await scriptsMediaService.updateAudio(scriptId, data);

      return apiResponse.ok(res, media);
    } catch (error: any) {
      if (error instanceof ScriptMediaValidationError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error updating audio", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * PATCH /api/scripts/:scriptId/media/video
   * Обновить видео
   */
  async updateVideo(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // requireAuth middleware гарантирует наличие userId

      const { scriptId } = ScriptIdParamDto.parse(req.params);
      const data = UpdateVideoDto.parse(req.body);

      const media = await scriptsMediaService.updateVideo(scriptId, data);

      return apiResponse.ok(res, media);
    } catch (error: any) {
      if (error instanceof ScriptMediaValidationError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error updating video", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * GET /api/scripts/:scriptId/media/status
   * Получить статус медиа
   */
  async getStatus(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // requireAuth middleware гарантирует наличие userId

      const { scriptId } = ScriptIdParamDto.parse(req.params);
      const status = await scriptsMediaService.getStatus(scriptId);

      return apiResponse.ok(res, status);
    } catch (error: any) {
      logger.error("Error fetching media status", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },

  /**
   * DELETE /api/scripts/:scriptId/media
   * Удалить медиа
   */
  async deleteMedia(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // requireAuth middleware гарантирует наличие userId

      const { scriptId } = ScriptIdParamDto.parse(req.params);
      const result = await scriptsMediaService.delete(scriptId);

      return apiResponse.ok(res, result);
    } catch (error: any) {
      if (error instanceof ScriptMediaNotFoundError) {
        return apiResponse.notFound(res, error.message);
      }

      if (error instanceof ScriptMediaValidationError) {
        return apiResponse.badRequest(res, error.message);
      }

      logger.error("Error deleting media", { error: error.message });
      return apiResponse.serverError(res, error.message);
    }
  },
};
