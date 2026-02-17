// ============================================================================
// VIDEO RENDERING SERVICE
// ============================================================================
// Основной сервис для управления рендерингом видео через Remotion

import { logger } from "../../lib/logger";
import { sceneLayersService } from "../scene-layers/scene-layers.service";
import type { EnhancedScene } from "../scene-layers/scene-layers.dto";
import { renderQueue } from "./render-queue";
import { renderJobsStorage } from "./video-rendering.storage";
import { videoUrlHandlers } from "./video-rendering.url-handlers";
import { queueProcessor } from "./video-rendering.queue-processor";
import { convertSceneWithLayersToEnhanced } from "./video-rendering.helpers";
import type {
  RenderVideoRequest,
  RenderVideoResponse,
  RenderJob,
} from "./video-rendering.types";

export const videoRenderingService = {
  /**
   * Запустить рендеринг видео для скрипта
   * Использует Remotion CLI для рендеринга на собственном сервере
   */
  async renderVideo(request: RenderVideoRequest): Promise<RenderVideoResponse> {
    const {
      scriptId,
      userId,
      width = 1920,
      height = 1080,
      fps = 30,
      backgroundColor = '#000000',
      format = 'mp4',
      quality = 'high',
    } = request;

    logger.info("Starting video render", {
      scriptId,
      userId,
      width,
      height,
      fps,
      format,
      quality,
    });

    // Получаем скрипт со всеми сценами и слоями
    const scriptWithLayers = await sceneLayersService.getScriptWithLayers(scriptId, userId);

    if (!scriptWithLayers.scenes || scriptWithLayers.scenes.length === 0) {
      throw new Error("No scenes found for rendering");
    }

    // Преобразуем SceneWithLayers в EnhancedScene для Remotion
    const enhancedScenes: EnhancedScene[] = scriptWithLayers.scenes.map((scene, index) =>
      convertSceneWithLayersToEnhanced(scene, index)
    );

    // Вычисляем общую длительность
    const totalDurationFrames = enhancedScenes.reduce(
      (sum, scene) => sum + scene.durationInFrames,
      0
    );

    // Создаем задачу рендеринга
    const jobId = `render-${scriptId}-${Date.now()}`;

    const job: RenderJob = {
      id: jobId,
      scriptId,
      userId,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      metadata: {
        width,
        height,
        fps,
        format,
        totalScenes: enhancedScenes.length,
        totalDurationFrames,
      },
    };

    renderJobsStorage.setJob(jobId, job);

    // Проверяем, идет ли сейчас рендеринг
    if (renderJobsStorage.isRendering() || renderQueue.isCurrentlyProcessing()) {
      // Добавляем в очередь
      const position = renderQueue.enqueue(jobId);
      logger.info(`Job ${jobId} added to queue at position ${position}`);
      
      job.status = 'pending';
      renderJobsStorage.setJob(jobId, job);
    } else {
      // Запускаем сразу
      queueProcessor.startRenderJob(jobId, enhancedScenes, request).catch((error) => {
        logger.error("Render job failed", { jobId, error: error.message });
        const failedJob = renderJobsStorage.getJob(jobId);
        if (failedJob) {
          failedJob.status = 'failed';
          failedJob.errorMessage = error.message;
          failedJob.completedAt = new Date();
          renderJobsStorage.setJob(jobId, failedJob);
        }
        renderJobsStorage.setRendering(false);
      });
    }

    return {
      jobId,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
    };
  },

  /**
   * Получить статус задачи рендеринга
   */
  async getRenderStatus(jobId: string): Promise<RenderVideoResponse> {
    const job = renderJobsStorage.getJob(jobId);

    if (!job) {
      throw new Error(`Render job ${jobId} not found`);
    }

    return {
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl,
      errorMessage: job.errorMessage,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  },

  /**
   * Получить все задачи рендеринга для пользователя
   */
  async getUserRenderJobs(userId: string): Promise<RenderVideoResponse[]> {
    return renderJobsStorage.getUserJobs(userId);
  },

  /**
   * Отменить задачу рендеринга
   */
  async cancelRenderJob(jobId: string, userId: string): Promise<{ success: boolean }> {
    const job = renderJobsStorage.getJob(jobId);

    if (!job) {
      throw new Error(`Render job ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new Error("Unauthorized to cancel this render job");
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error("Cannot cancel completed or failed render job");
    }

    // Если задача в очереди - удаляем из очереди
    if (job.status === 'pending') {
      const cancelled = renderQueue.cancel(jobId);
      if (cancelled) {
        job.status = 'failed';
        job.errorMessage = 'Cancelled by user';
        job.completedAt = new Date();
        renderJobsStorage.setJob(jobId, job);
        logger.info("Render job cancelled from queue", { jobId, userId });
        return { success: true };
      }
    }

    // Если задача обрабатывается - помечаем как отмененную
    job.status = 'failed';
    job.errorMessage = 'Cancelled by user';
    job.completedAt = new Date();
    renderJobsStorage.setJob(jobId, job);

    logger.info("Render job cancelled", { jobId, userId });

    return { success: true };
  },

  /**
   * Получить download URL для готового видео
   */
  async getDownloadUrl(jobId: string, userId: string): Promise<{ downloadUrl: string }> {
    return videoUrlHandlers.getDownloadUrl(jobId, userId);
  },

  /**
   * Получить preview URL для просмотра видео (presigned URL на 24 часа)
   */
  async getPreviewUrl(jobId: string, userId: string): Promise<{ previewUrl: string; expiresIn: number }> {
    return videoUrlHandlers.getPreviewUrl(jobId, userId);
  },
};
