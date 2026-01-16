import { ReanalysisRepo } from "./reanalysis.repo";
import { apiKeysService } from "../api-keys/api-keys.service";
import { logger } from "../../lib/logger";
import { scoreCustomScriptAdvanced } from "../../ai-services";
import { jobManager } from "../../lib/reanalysis-job-manager";
import {
  NoCurrentVersionError,
  NoApiKeyConfiguredError,
  ReanalysisAlreadyRunningError,
  JobNotFoundError,
} from "./reanalysis.errors";

const repo = new ReanalysisRepo();

/**
 * Reanalysis Service
 * Business logic for background reanalysis jobs
 */
export const reanalysisService = {
  /**
   * Start async reanalysis job
   */
  async startReanalysis(
    projectId: string,
    userId: string,
    idempotencyKey?: string
  ) {
    // Get current version
    const currentVersion = await repo.getCurrentVersion(projectId);
    if (!currentVersion) {
      throw new NoCurrentVersionError();
    }

    // Check for API key
    const apiKey = await apiKeysService.getUserApiKey(userId, "anthropic");
    if (!apiKey) {
      throw new NoApiKeyConfiguredError("Anthropic");
    }

    // Create job (throws ALREADY_RUNNING if job exists)
    let job;
    try {
      job = jobManager.createJob(projectId, idempotencyKey);
    } catch (err: any) {
      if (err.code === "ALREADY_RUNNING") {
        throw new ReanalysisAlreadyRunningError(
          err.existingJob.jobId,
          err.existingJob.status
        );
      }
      throw err;
    }

    logger.info("Reanalysis job started", {
      jobId: job.jobId,
      projectId,
      idempotencyKey: idempotencyKey || null,
    });

    // Start async processing
    setImmediate(async () => {
      try {
        jobManager.updateJobStatus(job.jobId, "running");
        jobManager.updateJobProgress(job.jobId, "hook", 0);

        const scenes = (currentVersion.scenes as any) || [];
        logger.debug("Reanalysis job running", {
          jobId: job.jobId,
          sceneCount: scenes.length,
        });

        // Run advanced analysis with retry logic
        jobManager.updateJobProgress(job.jobId, "structure", 20);
        const analysisResult = await jobManager.retryWithBackoff(async () => {
          return await scoreCustomScriptAdvanced(
            apiKey.decryptedKey,
            currentVersion.fullScript,
            "short-form"
          );
        });

        // Per-scene analysis with progress reporting
        jobManager.updateJobProgress(job.jobId, "emotional", 50);
        const perSceneScores =
          scenes && Array.isArray(scenes)
            ? await Promise.all(
                scenes.map(async (scene: any, index: number) => {
                  try {
                    const sceneAnalysis = await jobManager.retryWithBackoff(
                      async () => {
                        return await scoreCustomScriptAdvanced(
                          apiKey.decryptedKey,
                          scene.text,
                          "short-form"
                        );
                      }
                    );

                    const sceneProgress =
                      50 + Math.floor(((index + 1) / scenes.length) * 20);
                    jobManager.updateJobProgress(
                      job.jobId,
                      "emotional",
                      sceneProgress
                    );

                    return {
                      sceneNumber: scene.sceneNumber,
                      score: sceneAnalysis.overallScore,
                    };
                  } catch (err: any) {
                    logger.error("Scene analysis failed", {
                      jobId: job.jobId,
                      sceneNumber: scene.sceneNumber,
                      error: err.message,
                    });
                    return {
                      sceneNumber: scene.sceneNumber,
                      score: 0,
                    };
                  }
                })
              )
            : [];

        jobManager.updateJobProgress(job.jobId, "cta", 70);

        // Build metrics
        jobManager.updateJobProgress(job.jobId, "synthesis", 80);
        const predicted = analysisResult.predictedMetrics || {};
        const metrics = {
          overallScore: analysisResult.overallScore,
          hookScore: analysisResult.hookScore || 0,
          structureScore: analysisResult.structureScore || 0,
          emotionalScore: analysisResult.emotionalScore || 0,
          ctaScore: analysisResult.ctaScore || 0,
          predicted: {
            retention: (predicted as any).estimatedRetention || "н/д",
            saves: (predicted as any).estimatedSaves || "н/д",
            shares: (predicted as any).estimatedShares || "н/д",
            viralProbability: (predicted as any).viralProbability || "low",
          },
          perScene: perSceneScores,
        };

        const review = `Общая оценка: ${analysisResult.overallScore}/100 (${analysisResult.verdict})

Сильные стороны:
${analysisResult.strengths?.map((s: string) => `• ${s}`).join("\n") || "• Не указано"}

Слабые стороны:
${analysisResult.weaknesses?.map((w: string) => `• ${w}`).join("\n") || "• Не указано"}

Прогноз:
• Удержание: ${metrics.predicted.retention}
• Сохранения: ${metrics.predicted.saves}
• Репосты: ${metrics.predicted.shares}`;

        // Create candidate version
        jobManager.updateJobProgress(job.jobId, "saving", 90);

        // Remove existing candidate
        const existingCandidates = await repo.getExistingCandidates(projectId);
        for (const candidate of existingCandidates) {
          await repo.deleteCandidateWithRecommendations(candidate.id);
        }

        // Get next version number
        const nextVersion = await repo.getNextVersionNumber(projectId);

        // Create candidate
        const candidateVersion = await repo.createCandidateVersion({
          projectId,
          versionNumber: nextVersion,
          createdBy: "ai",
          fullScript: currentVersion.fullScript,
          scenes: currentVersion.scenes,
          isCandidate: true,
          isCurrent: false,
          baseVersionId: currentVersion.id,
          parentVersionId: currentVersion.id,
          metrics,
          review,
          analysisResult,
          analysisScore: analysisResult.overallScore,
        });

        jobManager.updateJobProgress(job.jobId, "saving", 100);
        jobManager.updateJobStatus(job.jobId, "done", candidateVersion.id);

        const durationMs = Date.now() - job.startedAt.getTime();
        logger.info(`[reanalyze.done]`, {
          jobId: job.jobId,
          projectId,
          candidateVersionId: candidateVersion.id,
          durationMs,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        const errorStatus = error?.status || error?.response?.status;
        const isRateLimit = errorStatus === 429;
        const isServerError = errorStatus >= 500 && errorStatus < 600;

        logger.error(`[Reanalyze] Job ${job.jobId} failed:`, {
          errorMessage: error.message,
          errorStatus,
          isRateLimit,
          isServerError,
          errorType: error.constructor?.name,
        });

        let userMessage = error.message || "Ошибка пересчёта";
        if (isRateLimit || isServerError) {
          userMessage =
            "Временная ошибка сервиса. Повторите позже или отмените черновик.";
        }

        jobManager.updateJobStatus(job.jobId, "error", undefined, userMessage);

        const durationMs = Date.now() - job.startedAt.getTime();
        logger.error(`[reanalyze.failed]`, {
          jobId: job.jobId,
          projectId,
          errorCode: errorStatus || "unknown",
          errorMessage: error.message,
          userMessage,
          durationMs,
          timestamp: new Date().toISOString(),
        });
      }
    });// упростить

    return {
      jobId: job.jobId,
      message: "Reanalysis started",
    };
  },

  /**
   * Check job status
   */
  async getJobStatus(projectId: string, jobId: string) {
    const job = jobManager.getJob(jobId);
    if (!job || job.projectId !== projectId) {
      throw new JobNotFoundError();
    }

    if (job.status === "done") {
      return {
        status: "done",
        candidateVersionId: job.candidateVersionId,
      };
    } else if (job.status === "error") {
      return {
        status: "error",
        error: job.error || "Unknown error",
      };
    } else {
      return {
        status: job.status,
      };
    }
  },
};
