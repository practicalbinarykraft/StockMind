/**
 * Storage Module Types
 * TypeScript типы для работы с облачным хранилищем R2
 */

/**
 * Результат загрузки файла в R2
 */
export interface UploadResult {
  /** Публичный или presigned URL файла */
  url: string;
  /** Ключ (путь) файла в bucket */
  key: string;
  /** Размер файла в байтах */
  size: number;
}

/**
 * Параметры для генерации presigned URL
 */
export interface PresignedUrlOptions {
  /** Время жизни URL в секундах (по умолчанию 3600) */
  expiresIn?: number;
}

/**
 * Метаданные файла для загрузки
 */
export interface UploadFileParams {
  /** Буфер с данными файла */
  buffer: Buffer;
  /** Имя файла */
  filename: string;
  /** MIME-тип файла */
  contentType: string;
  /** ID пользователя (для организации структуры папок) */
  userId: string;
}

/**
 * Тип файла для организации структуры хранилища
 */
export enum FileType {
  AUDIO = "audio",
  IMAGE = "images",
  VIDEO = "video",
}
