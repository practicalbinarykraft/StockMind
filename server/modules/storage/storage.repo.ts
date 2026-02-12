import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../../lib/logger";
import {
  StorageUploadError,
  StorageDeleteError,
  StorageConfigError,
  StoragePresignedUrlError,
} from "./storage.errors";
import type { PresignedUrlOptions } from "./storage.types";

/**
 * Storage Repository
 * Работа с Cloudflare R2 через AWS S3 SDK
 */
export class StorageRepo {
  private client: S3Client;
  private bucketName: string;
  private endpoint: string;

  constructor() {
    this.validateConfig();

    this.bucketName = process.env.R2_BUCKET_NAME!;
    this.endpoint = process.env.R2_ENDPOINT!;

    this.client = new S3Client({
      region: "auto",
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    logger.info("Storage repository initialized", {
      bucket: this.bucketName,
    });
  }

  /**
   * Проверить наличие всех необходимых переменных окружения
   */
  private validateConfig(): void {
    const requiredEnvVars = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
      "R2_ENDPOINT",
    ];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new StorageConfigError(
        `Отсутствуют необходимые переменные окружения: ${missingVars.join(", ")}`
      );
    }
  }

  /**
   * Загрузить файл в R2
   * @param buffer - Данные файла
   * @param key - Путь к файлу в bucket
   * @param contentType - MIME-тип файла
   * @returns Promise с URL файла
   */
  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);

      logger.debug("File uploaded to R2", {
        key,
        size: buffer.length,
        contentType,
      });

      // Возвращаем presigned URL для приватного bucket
      return await this.getPresignedUrl(key);
    } catch (error: any) {
      logger.error("Error uploading file to R2", {
        error: error.message,
        key,
      });
      throw new StorageUploadError(error.message);
    }
  }

  /**
   * Получить временный URL для доступа к файлу
   * @param key - Путь к файлу в bucket
   * @param options - Опции для генерации URL
   * @returns Promise с presigned URL
   */
  async getPresignedUrl(
    key: string,
    options: PresignedUrlOptions = {}
  ): Promise<string> {
    try {
      const { expiresIn = 86400 } = options; // 24 часа по умолчанию

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      logger.debug("Generated presigned URL", {
        key,
        expiresIn,
      });

      return url;
    } catch (error: any) {
      logger.error("Error generating presigned URL", {
        error: error.message,
        key,
      });
      throw new StoragePresignedUrlError(error.message);
    }
  }

  /**
   * Удалить файл из R2
   * @param key - Путь к файлу в bucket
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      logger.info("File deleted from R2", { key });
    } catch (error: any) {
      logger.error("Error deleting file from R2", {
        error: error.message,
        key,
      });
      throw new StorageDeleteError(error.message);
    }
  }
}
