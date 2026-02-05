import { ScriptsMediaRepo } from "./scripts-media.repo";
import { logger } from "../../lib/logger";
import { ScriptMediaNotFoundError, ScriptMediaValidationError } from "./scripts-media.errors";

const repo = new ScriptsMediaRepo();

/**
 * Scripts Media Service
 * Бизнес-логика для управления медиа сценариев
 */
export const scriptsMediaService = {
  /**
   * Получить медиа по scriptId
   */
  async findByScriptId(scriptId: string) {
    if (!scriptId) {
      throw new ScriptMediaValidationError("scriptId is required");
    }

    const media = await repo.getByScriptId(scriptId);
    return media;
  },

  /**
   * Upsert медиа (создать или обновить)
   */
  async upsert(scriptId: string, data: any) {
    if (!scriptId) {
      throw new ScriptMediaValidationError("scriptId is required");
    }

    const media = await repo.upsert(scriptId, data);

    logger.info("Script media upserted", {
      scriptId,
      hasAudio: !!media.audioUrl,
      hasVideo: !!media.videoUrl,
    });

    return media;
  },

  /**
   * Обновить только аудио
   */
  async updateAudio(scriptId: string, data: any) {
    if (!scriptId) {
      throw new ScriptMediaValidationError("scriptId is required");
    }

    const media = await repo.upsert(scriptId, data);

    logger.info("Audio updated", {
      scriptId,
      audioMode: data.audioMode,
      hasUrl: !!data.audioUrl,
    });

    return media;
  },

  /**
   * Обновить только видео
   */
  async updateVideo(scriptId: string, data: any) {
    if (!scriptId) {
      throw new ScriptMediaValidationError("scriptId is required");
    }

    const media = await repo.upsert(scriptId, data);

    logger.info("Video updated", {
      scriptId,
      videoStatus: data.videoStatus,
      hasUrl: !!data.videoUrl,
    });

    return media;
  },

  /**
   * Получить статус медиа (краткая версия)
   */
  async getStatus(scriptId: string) {
    const media = await repo.getByScriptId(scriptId);

    if (!media) {
      return {
        hasAudio: false,
        hasVideo: false,
        videoStatus: null,
      };
    }

    return {
      hasAudio: !!media.audioUrl,
      hasVideo: !!media.videoUrl,
      videoStatus: media.videoStatus || null,
      audioMode: media.audioMode || null,
      videoGeneratedAt: media.videoGeneratedAt || null,
      audioGeneratedAt: media.audioGeneratedAt || null,
    };
  },

  /**
   * Удалить медиа
   */
  async delete(scriptId: string) {
    if (!scriptId) {
      throw new ScriptMediaValidationError("scriptId is required");
    }

    const deleted = await repo.delete(scriptId);

    if (!deleted) {
      throw new ScriptMediaNotFoundError();
    }

    logger.info("Script media deleted", { scriptId });

    return { success: true, message: "Media deleted" };
  },
};
