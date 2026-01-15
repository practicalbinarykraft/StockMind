import path from "path";
import fs from "fs";

/**
 * Audio Repository
 * Работа с файловой системой для хранения аудио файлов
 */
export class AudioRepo {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "uploads", "audio");
    this.ensureUploadDirExists();
  }

  /**
   * Создать директорию для загрузки, если не существует
   */
  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Получить путь к директории загрузки
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * Сохранить метаинформацию о загруженном файле
   */
  saveAudioMetadata(fileInfo: {
    filename: string;
    size: number;
    mimetype: string;
  }): { audioUrl: string; filename: string; size: number; mimetype: string } {
    const audioUrl = `/uploads/audio/${fileInfo.filename}`;
    return {
      audioUrl,
      filename: fileInfo.filename,
      size: fileInfo.size,
      mimetype: fileInfo.mimetype,
    };
  }
}
