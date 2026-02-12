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
import { storageService } from "../storage/storage.service";

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

  /**
   * GET /api/scripts/:scriptId/media/audio/stream
   * Прокси для воспроизведения аудио
   */
  async streamAudio(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { scriptId } = ScriptIdParamDto.parse(req.params);

      // Получаем медиа из БД
      const media = await scriptsMediaService.findByScriptId(scriptId);

      if (!media?.audioUrl) {
        logger.warn("Audio not found for script", { scriptId });
        return res.status(404).json({ message: "Аудио не найдено" });
      }

      // Извлекаем key из URL
      const key = storageService.extractKeyFromUrl(media.audioUrl);
      if (!key) {
        logger.error("Failed to extract key from audioUrl", { audioUrl: media.audioUrl });
        return res.status(500).json({ message: "Ошибка обработки URL" });
      }

      // Загружаем файл из R2
      const buffer = await storageService.getFileBuffer(key);

      // Отдаем файл с правильными заголовками
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000", // Кэшируем на год
      });

      return res.send(buffer);
    } catch (error: any) {
      logger.error("Error streaming audio", { error: error.message, scriptId: req.params.scriptId });
      return res.status(500).json({ message: "Ошибка загрузки аудио" });
    }
  },

  /**
   * GET /api/scripts/:scriptId/media/audio/download
   * Прокси для скачивания аудио
   */
  async downloadAudio(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { scriptId } = ScriptIdParamDto.parse(req.params);

      // Получаем медиа из БД
      const media = await scriptsMediaService.findByScriptId(scriptId);

      if (!media?.audioUrl) {
        logger.warn("Audio not found for script", { scriptId });
        return res.status(404).json({ message: "Аудио не найдено" });
      }

      // Извлекаем key из URL
      const key = storageService.extractKeyFromUrl(media.audioUrl);
      if (!key) {
        logger.error("Failed to extract key from audioUrl", { audioUrl: media.audioUrl });
        return res.status(500).json({ message: "Ошибка обработки URL" });
      }

      // Загружаем файл из R2
      const buffer = await storageService.getFileBuffer(key);

      // Генерируем имя файла
      const filename = `audio-${scriptId}-${Date.now()}.mp3`;

      // Отдаем файл с заголовком для скачивания
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000",
      });

      return res.send(buffer);
    } catch (error: any) {
      logger.error("Error downloading audio", { error: error.message, scriptId: req.params.scriptId });
      return res.status(500).json({ message: "Ошибка скачивания аудио" });
    }
  },

  /**
   * GET /api/scripts/:scriptId/media/image/stream
   * Прокси для отображения изображения
   * TODO: Добавить imageUrl в scriptsMedia схему когда потребуется
   */
  async streamImage(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { scriptId } = ScriptIdParamDto.parse(req.params);

      // Получаем медиа из БД
      const media = await scriptsMediaService.findByScriptId(scriptId);

      // Временно: поле imageUrl еще не добавлено в схему
      const imageUrl = (media as any)?.imageUrl;
      
      if (!imageUrl) {
        logger.warn("Image not found for script", { scriptId });
        return res.status(404).json({ message: "Изображение не найдено" });
      }

      // Извлекаем key из URL
      const key = storageService.extractKeyFromUrl(imageUrl);
      if (!key) {
        logger.error("Failed to extract key from imageUrl", { imageUrl });
        return res.status(500).json({ message: "Ошибка обработки URL" });
      }

      // Загружаем файл из R2
      const buffer = await storageService.getFileBuffer(key);

      // Определяем Content-Type по расширению
      const ext = key.split(".").pop()?.toLowerCase();
      const contentTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
      };
      const contentType = contentTypeMap[ext || ""] || "image/jpeg";

      // Отдаем файл с правильными заголовками
      res.set({
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      });

      return res.send(buffer);
    } catch (error: any) {
      logger.error("Error streaming image", { error: error.message, scriptId: req.params.scriptId });
      return res.status(500).json({ message: "Ошибка загрузки изображения" });
    }
  },
};
