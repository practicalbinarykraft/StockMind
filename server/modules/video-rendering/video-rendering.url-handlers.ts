// ============================================================================
// VIDEO RENDERING URL HANDLERS
// ============================================================================
// Методы для работы с download и preview URL

import { logger } from "../../lib/logger";
import { StorageRepo } from "../storage/storage.repo";
import { renderJobsStorage } from "./video-rendering.storage";

const storageRepo = new StorageRepo();

export const videoUrlHandlers = {
  /**
   * Получить download URL для готового видео
   */
  async getDownloadUrl(jobId: string, userId: string): Promise<{ downloadUrl: string }> {
    const job = renderJobsStorage.getJob(jobId);

    if (!job) {
      throw new Error(`Render job ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new Error("Unauthorized to access this render job");
    }

    if (job.status !== 'completed') {
      throw new Error("Render job is not completed yet");
    }

    if (!job.videoUrl) {
      throw new Error("Video URL not available");
    }

    return {
      downloadUrl: job.videoUrl,
    };
  },

  /**
   * Получить preview URL для просмотра видео (presigned URL на 24 часа)
   */
  async getPreviewUrl(jobId: string, userId: string): Promise<{ previewUrl: string; expiresIn: number }> {
    const job = renderJobsStorage.getJob(jobId);

    if (!job) {
      throw new Error(`Render job ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new Error("Unauthorized to access this render job");
    }

    if (job.status !== 'completed') {
      throw new Error("Render job is not completed yet");
    }

    if (!job.videoUrl) {
      throw new Error("Video URL not available");
    }

    // Генерируем presigned URL на 24 часа для безопасного просмотра
    const expiresIn = 24 * 60 * 60; // 24 часа в секундах
    
    try {
      // Извлекаем путь из videoUrl
      const urlObj = new URL(job.videoUrl);
      const filePath = urlObj.pathname.substring(1); // убираем ведущий слэш
      
      const presignedUrl = await storageRepo.getPresignedUrl(filePath, { expiresIn });
      
      return {
        previewUrl: presignedUrl,
        expiresIn,
      };
    } catch (error: any) {
      logger.error("Failed to generate presigned URL", { jobId, error: error.message });
      
      // Fallback на прямую ссылку
      return {
        previewUrl: job.videoUrl,
        expiresIn: 0,
      };
    }
  },
};
