import { logger } from "../../lib/logger";
import { NoAudioFileError, AudioUploadError } from "./audio.errors";
import { storageService } from "../storage/storage.service";

/**
 * Audio Service
 * Бизнес-логика для загрузки аудио файлов
 */
export class AudioService {
  /**
   * Обработать загруженный аудио файл и загрузить в R2
   */
  async processUploadedAudio(
    file: Express.Multer.File | undefined,
    userId: string
  ): Promise<{
    success: boolean;
    filename: string;
    audioUrl: string;
    size: number;
    mimetype: string;
  }> {
    if (!file) {
      throw new NoAudioFileError();
    }

    try {
      // Загружаем файл в R2 из буфера памяти
      const { url, key, size } = await storageService.uploadAudio(
        file.buffer,
        file.originalname,
        userId
      );

      logger.info("Audio file uploaded to R2 successfully", {
        filename: file.originalname,
        key,
        size,
        userId,
      });

      return {
        success: true,
        filename: file.originalname,
        audioUrl: url,
        size,
        mimetype: file.mimetype,
      };
    } catch (error: any) {
      logger.error("Error processing audio upload", { error: error.message });
      throw new AudioUploadError(error.message);
    }
  }
}

export const audioService = new AudioService();
