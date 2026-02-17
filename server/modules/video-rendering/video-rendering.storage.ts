// ============================================================================
// VIDEO RENDERING STORAGE
// ============================================================================
// In-memory хранилище задач рендеринга

import type { RenderJob, RenderVideoResponse } from "./video-rendering.types";

// ВНИМАНИЕ: Текущая реализация использует Map для хранения задач в памяти.
// Для production необходимо переместить в БД (см. README.md раздел "Хранение задач")
// 
// Преимущества БД:
// - Постоянство данных при перезапуске сервера
// - Работа в кластере (несколько инстансов сервера)
// - Возможность построения аналитики
// - История всех рендеров
//
// Схема таблицы video_render_jobs описана в README.md

const renderJobs = new Map<string, RenderJob>();

// Блокировка для последовательного рендеринга
let isRenderingInProgress = false;

export const renderJobsStorage = {
  /**
   * Получить задачу по ID
   */
  getJob(jobId: string): RenderJob | undefined {
    return renderJobs.get(jobId);
  },

  /**
   * Сохранить задачу
   */
  setJob(jobId: string, job: RenderJob): void {
    renderJobs.set(jobId, job);
  },

  /**
   * Получить все задачи пользователя
   */
  getUserJobs(userId: string): RenderVideoResponse[] {
    const userJobs = Array.from(renderJobs.values()).filter(
      (job) => job.userId === userId
    );

    return userJobs.map((job) => ({
      jobId: job.id,
      status: job.status,
      videoUrl: job.videoUrl,
      errorMessage: job.errorMessage,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    }));
  },

  /**
   * Проверить, идет ли рендеринг
   */
  isRendering(): boolean {
    return isRenderingInProgress;
  },

  /**
   * Установить флаг рендеринга
   */
  setRendering(value: boolean): void {
    isRenderingInProgress = value;
  },
};
