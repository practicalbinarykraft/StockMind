/**
 * Storage Module Errors
 * Кастомные ошибки для модуля хранилища
 */

/**
 * Ошибка при загрузке файла в R2
 */
export class StorageUploadError extends Error {
  constructor(message: string) {
    super(`Ошибка загрузки файла: ${message}`);
    this.name = "StorageUploadError";
  }
}

/**
 * Ошибка при удалении файла из R2
 */
export class StorageDeleteError extends Error {
  constructor(message: string) {
    super(`Ошибка удаления файла: ${message}`);
    this.name = "StorageDeleteError";
  }
}

/**
 * Ошибка конфигурации хранилища
 */
export class StorageConfigError extends Error {
  constructor(message: string) {
    super(`Ошибка конфигурации хранилища: ${message}`);
    this.name = "StorageConfigError";
  }
}

/**
 * Ошибка при генерации presigned URL
 */
export class StoragePresignedUrlError extends Error {
  constructor(message: string) {
    super(`Ошибка генерации presigned URL: ${message}`);
    this.name = "StoragePresignedUrlError";
  }
}
