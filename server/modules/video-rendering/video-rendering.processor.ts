// ============================================================================
// VIDEO RENDERING PROCESSOR
// ============================================================================
// Обработка и выполнение задач рендеринга

import { logger } from "../../lib/logger";
import { StorageRepo } from "../storage/storage.repo";
import { scriptsLibraryService } from "../scripts-library/scripts-library.service";
import type { EnhancedScene } from "../scene-layers/scene-layers.dto";
import type { RenderVideoRequest } from "./video-rendering.types";
import { renderJobsStorage } from "./video-rendering.storage";
import { getProjectIdFromScript } from "./video-rendering.helpers";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execPromise = promisify(exec);
const storageRepo = new StorageRepo();

export const renderProcessor = {
  /**
   * Обработка задачи рендеринга через Remotion CLI
   */
  async processRenderJob(
    jobId: string,
    scenes: EnhancedScene[],
    request: RenderVideoRequest
  ): Promise<void> {
    const job = renderJobsStorage.getJob(jobId);
    if (!job) return;

    let tempOutputPath: string | null = null;

    try {
      // Обновляем статус на processing
      job.status = 'processing';
      job.progress = 5;
      renderJobsStorage.setJob(jobId, job);

      logger.info("Processing render job with Remotion CLI", { 
        jobId, 
        scenesCount: scenes.length 
      });

      // Подготовка данных для Remotion
      const inputProps = {
        scenes,
        backgroundColor: request.backgroundColor ?? '#000000',
      };

      // Создаем временную директорию
      const tempDir = process.env.REMOTION_TEMP_DIR || './temp/remotion';
      await fs.mkdir(tempDir, { recursive: true });

      // Путь к выходному файлу
      const timestamp = Date.now();
      tempOutputPath = path.join(tempDir, `video-${request.scriptId}-${timestamp}.mp4`);

      job.progress = 10;
      renderJobsStorage.setJob(jobId, job);

      const projectRoot = process.cwd();
      const remotionEntry = path.resolve(projectRoot, 'client/src/features/conveyor/remotion/entry.ts');
      
      // Формируем команду Remotion CLI
      const crfValue = request.quality === 'high' ? 18 : request.quality === 'medium' ? 23 : 28;
      
      const remotionCommand = [
        'npx remotion render',
        remotionEntry,
        'VideoEditor',
        `"${tempOutputPath}"`,
        `--props='${JSON.stringify(inputProps)}'`,
        `--width=${request.width ?? 1920}`,
        `--height=${request.height ?? 1080}`,
        `--fps=${request.fps ?? 30}`,
        '--codec=h264',
        `--crf=${crfValue}`,
        '--overwrite',
      ].join(' ');

      logger.info("Executing Remotion CLI", { 
        jobId, 
        command: remotionCommand.substring(0, 200) + '...' 
      });

      job.progress = 15;
      renderJobsStorage.setJob(jobId, job);

      // Запускаем Remotion CLI с увеличенным timeout
      const timeout = parseInt(process.env.REMOTION_TIMEOUT || '1800000', 10); // 30 минут
      
      try {
        const { stdout, stderr } = await execPromise(remotionCommand, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout,
          cwd: projectRoot,
        });

        logger.info("Remotion render output", { jobId, stdout: stdout.substring(0, 500) });
        
        if (stderr) {
          logger.warn("Remotion render stderr", { jobId, stderr: stderr.substring(0, 500) });
        }
      } catch (execError: any) {
        logger.error("Remotion CLI execution error", { 
          jobId, 
          error: execError.message,
          stdout: execError.stdout?.substring(0, 500),
          stderr: execError.stderr?.substring(0, 500),
        });
        throw new Error(`Remotion render failed: ${execError.message}`);
      }

      job.progress = 80;
      renderJobsStorage.setJob(jobId, job);

      // Проверяем что файл создан
      try {
        await fs.access(tempOutputPath);
      } catch {
        throw new Error(`Rendered video file not found at ${tempOutputPath}`);
      }

      logger.info("Video rendered successfully, uploading to R2", { jobId });

      job.progress = 85;
      renderJobsStorage.setJob(jobId, job);

      // Загружаем видео в R2
      const videoBuffer = await fs.readFile(tempOutputPath);
      const script = await scriptsLibraryService.getScriptById(request.scriptId, request.userId);
      const projectId = getProjectIdFromScript(script);
      
      const r2Path = `users/${request.userId}/projects/${projectId}/rendered/video-${request.scriptId}-${timestamp}.mp4`;
      
      const videoUrl = await storageRepo.uploadWithPath(
        videoBuffer,
        r2Path,
        'video/mp4'
      );

      logger.info("Video uploaded to R2", { jobId, videoUrl });

      job.progress = 95;
      renderJobsStorage.setJob(jobId, job);

      // Очистка временного файла
      try {
        await fs.unlink(tempOutputPath);
        logger.info("Temporary file cleaned up", { jobId, path: tempOutputPath });
      } catch (cleanupError: any) {
        logger.warn("Failed to cleanup temporary file", { 
          jobId, 
          path: tempOutputPath,
          error: cleanupError.message 
        });
      }

      // Обновляем задачу
      job.status = 'completed';
      job.progress = 100;
      job.videoUrl = videoUrl;
      job.completedAt = new Date();
      renderJobsStorage.setJob(jobId, job);

      const duration = job.completedAt.getTime() - job.startedAt.getTime();
      logger.info("Render job completed", {
        jobId,
        videoUrl,
        durationMs: duration,
        durationMin: Math.round(duration / 60000),
      });
    } catch (error: any) {
      logger.error("Render job processing failed", {
        jobId,
        error: error.message,
        stack: error.stack,
      });

      // Очистка временного файла при ошибке
      if (tempOutputPath) {
        try {
          await fs.unlink(tempOutputPath);
        } catch {}
      }

      job.status = 'failed';
      job.errorMessage = error.message;
      job.completedAt = new Date();
      renderJobsStorage.setJob(jobId, job);

      throw error;
    }
  },
};
