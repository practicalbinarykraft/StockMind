import { StorageRepo } from "./storage.repo";
import { logger } from "../../lib/logger";
import type { UploadResult, UploadFileParams, PresignedUrlOptions } from "./storage.types";
import { FileType } from "./storage.types";

/**
 * Storage Service
 * Бизнес-логика для работы с облачным хранилищем
 */
export class StorageService {
  private repo: StorageRepo;

  constructor() {
    this.repo = new StorageRepo();
  }

  /**
   * Сгенерировать уникальный ключ для файла
   * @param fileType - Тип файла (audio, images, video)
   * @param userId - ID пользователя
   * @param filename - Имя файла
   * @returns Путь к файлу в bucket
   */
  private generateKey(fileType: FileType, userId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${fileType}/${userId}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Определить MIME-тип изображения по расширению файла
   */
  private getImageContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const types: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    return types[ext || ""] || "image/jpeg";
  }

  /**
   * Загрузить аудио файл в R2
   * @param buffer - Буфер с данными файла
   * @param filename - Имя файла
   * @param userId - ID пользователя
   * @returns Результат загрузки с URL и ключом
   */
  async uploadAudio(
    buffer: Buffer,
    filename: string,
    userId: string
  ): Promise<UploadResult> {
    const key = this.generateKey(FileType.AUDIO, userId, filename);

    logger.info("Uploading audio to R2", {
      key,
      size: buffer.length,
      userId,
    });

    const url = await this.repo.uploadFile(buffer, key, "audio/mpeg");

    return {
      url,
      key,
      size: buffer.length,
    };
  }

  /**
   * Загрузить изображение в R2
   * @param buffer - Буфер с данными файла
   * @param filename - Имя файла
   * @param userId - ID пользователя
   * @returns Результат загрузки с URL и ключом
   */
  async uploadImage(
    buffer: Buffer,
    filename: string,
    userId: string
  ): Promise<UploadResult> {
    const key = this.generateKey(FileType.IMAGE, userId, filename);
    const contentType = this.getImageContentType(filename);

    logger.info("Uploading image to R2", {
      key,
      size: buffer.length,
      contentType,
      userId,
    });

    const url = await this.repo.uploadFile(buffer, key, contentType);

    return {
      url,
      key,
      size: buffer.length,
    };
  }

  /**
   * Загрузить видео в R2
   * @param buffer - Буфер с данными файла
   * @param filename - Имя файла
   * @param userId - ID пользователя
   * @returns Результат загрузки с URL и ключом
   */
  async uploadVideo(
    buffer: Buffer,
    filename: string,
    userId: string
  ): Promise<UploadResult> {
    const key = this.generateKey(FileType.VIDEO, userId, filename);

    logger.info("Uploading video to R2", {
      key,
      size: buffer.length,
      userId,
    });

    const url = await this.repo.uploadFile(buffer, key, "video/mp4");

    return {
      url,
      key,
      size: buffer.length,
    };
  }

  /**
   * Удалить файл из R2
   * @param key - Путь к файлу в bucket
   */
  async deleteFile(key: string): Promise<void> {
    logger.info("Deleting file from R2", { key });
    await this.repo.deleteFile(key);
  }

  /**
   * Получить временный URL для воспроизведения (для воспроизведения)
   * @param key - Путь к файлу в bucket
   * @param options - Опции для генерации URL
   * @returns Presigned URL
   */
  async getPresignedUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    return await this.repo.getPresignedUrl(key, options);
  }

  /**
   * Получить временный URL для скачивания файла
   * @param key - Путь к файлу в bucket
   * @param filename - Имя файла для скачивания
   * @param options - Опции для генерации URL
   * @returns Presigned URL для скачивания
   */
  async getDownloadUrl(
    key: string,
    filename: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    return await this.repo.getDownloadUrl(key, filename, options);
  }

  /**
   * Получить файл как Buffer (для прокси)
   * @param key - Путь к файлу в bucket
   * @returns Buffer файла
   */
  async getFileBuffer(key: string): Promise<Buffer> {
    logger.info("Getting file buffer from R2", { key });
    return await this.repo.getFileBuffer(key);
  }

  /**
   * Извлечь ключ (key) из presigned URL или обычного URL
   * @param url - URL файла
   * @returns Ключ файла в bucket
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      // Если это presigned URL от R2
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Убираем начальный слеш
      const key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      
      logger.debug("Extracted key from URL", { url, key });
      return key;
    } catch (error) {
      logger.error("Error extracting key from URL", { url, error });
      return null;
    }
  }
}

export const storageService = new StorageService();
