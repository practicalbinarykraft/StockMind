// ============================================================================
// VIDEO RENDERING QUEUE PROCESSOR
// ============================================================================
// Обработка очереди рендеринга

import { logger } from "../../lib/logger";
import { sceneLayersService } from "../scene-layers/scene-layers.service";
import { renderQueue } from "./render-queue";
import { renderJobsStorage } from "./video-rendering.storage";
import { renderProcessor } from "./video-rendering.processor";
import { convertSceneWithLayersToEnhanced } from "./video-rendering.helpers";
import type { RenderVideoRequest } from "./video-rendering.types";

export const queueProcessor = {
  /**
   * Запустить рендеринг задачи (устанавливает блокировку)
   */
  async startRenderJob(
    jobId: string,
    scenes: any[],
    request: RenderVideoRequest
  ): Promise<void> {
    renderJobsStorage.setRendering(true);
    
    try {
      await renderProcessor.processRenderJob(jobId, scenes, request);
    } finally {
      renderJobsStorage.setRendering(false);
      
      // Обработать следующую задачу в очереди
      await this.processNextInQueue();
    }
  },

  /**
   * Обработать следующую задачу из очереди
   */
  async processNextInQueue(): Promise<void> {
    const nextJobId = renderQueue.dequeue();
    if (!nextJobId) return;

    const nextJob = renderJobsStorage.getJob(nextJobId);
    if (!nextJob) return;

    logger.info(`Starting queued job ${nextJobId}`);
    
    try {
      // Получаем данные для следующей задачи
      const scriptWithLayers = await sceneLayersService.getScriptWithLayers(
        nextJob.scriptId,
        nextJob.userId
      );
      
      const enhancedScenes = scriptWithLayers.scenes.map((scene: any, index: number) =>
        convertSceneWithLayersToEnhanced(scene, index)
      );
      
      const nextRequest: RenderVideoRequest = {
        scriptId: nextJob.scriptId,
        userId: nextJob.userId,
        width: nextJob.metadata?.width,
        height: nextJob.metadata?.height,
        fps: nextJob.metadata?.fps,
        format: nextJob.metadata?.format as 'mp4' | 'webm',
      };
      
      await this.startRenderJob(nextJobId, enhancedScenes, nextRequest);
    } catch (error: any) {
      logger.error("Queued render job failed", { jobId: nextJobId, error: error.message });
      const failedJob = renderJobsStorage.getJob(nextJobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errorMessage = error.message;
        failedJob.completedAt = new Date();
        renderJobsStorage.setJob(nextJobId, failedJob);
      }
      renderJobsStorage.setRendering(false);
    }
  },
};
