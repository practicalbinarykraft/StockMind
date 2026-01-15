import { logger } from "../../lib/logger";
import { AudioRepo } from "./audio.repo";
import { NoAudioFileError, AudioUploadError } from "./audio.errors";

/**
 * Audio Service
 * Бизнес-логика для загрузки аудио файлов
 */
export class AudioService {
  private repo: AudioRepo;

  constructor() {
    this.repo = new AudioRepo();
  }

  /**
   * Обработать загруженный аудио файл
   */
  async processUploadedAudio(file: Express.Multer.File | undefined): Promise<{
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
      const metadata = this.repo.saveAudioMetadata({
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      });

      logger.info("Audio file uploaded successfully", {
        filename: file.filename,
        size: file.size,
      });

      return {
        success: true,
        ...metadata,
      };
    } catch (error: any) {
      logger.error("Error processing audio upload", { error: error.message });
      throw new AudioUploadError(error.message);
    }
  }

  /**
   * Получить путь к директории загрузки
   */
  getUploadDir(): string {
    return this.repo.getUploadDir();
  }
}

export const audioService = new AudioService();
