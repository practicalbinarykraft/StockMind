import { Request, Response } from "express";
import { logger } from "../../lib/logger";
import { audioService } from "./audio.service";
import { NoAudioFileError, AudioUploadError } from "./audio.errors";

/**
 * Audio Controller
 * Обработка HTTP запросов для загрузки аудио
 */
export const audioController = {
  /**
   * POST /api/audio/upload
   * Загрузка аудио файла
   */
  async uploadAudio(req: Request, res: Response) {
    try {
      const result = await audioService.processUploadedAudio(req.file);
      res.json(result);
    } catch (error: any) {
      logger.error("Error uploading audio", {
        errorType: error.constructor?.name,
        userId: (req as any).userId,
      });

      if (error instanceof NoAudioFileError) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof AudioUploadError) {
        return res.status(500).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to upload audio" });
    }
  },
};
