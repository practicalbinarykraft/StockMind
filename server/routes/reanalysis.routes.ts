import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { requireAuth } from "../middleware/jwt-auth";
import { getUserId } from "../utils/route-helpers";
import { scriptVersions, sceneRecommendations } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { scoreCustomScriptAdvanced } from "../ai-services";
import { apiResponse } from "../lib/api-response";
import { jobManager } from "../lib/reanalysis-job-manager";

/**
 * Reanalysis routes
 * Handles background reanalysis jobs and version comparison workflow
 */
export function registerReanalysisRoutes(app: Express) {
  /**
   * POST /api/projects/:id/reanalyze/start
   * Start async reanalysis job
   * Creates a candidate version with fresh analysis
   */
  app.post("/api/projects/:id/reanalyze/start", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = req.params;
      const { idempotencyKey } = req.body;

      // Validate project exists
      const project = await storage.getProject(projectId, userId);
      if (!project) return apiResponse.notFound(res, "Project not found");

      // Get current version
      const currentVersion = await storage.getCurrentScriptVersion(projectId);
      if (!currentVersion) {
        return apiResponse.badRequest(res, "No current version found");
      }

      // Check for API key
      const apiKey = await storage.getUserApiKey(userId, 'anthropic');
      if (!apiKey) {
        return apiResponse.notFound(res, "Anthropic API key not configured");
      }

      // Create job (throws ALREADY_RUNNING if job exists)
      let job;
      try {
        job = jobManager.createJob(projectId, idempotencyKey);
      } catch (err: any) {
        if (err.code === 'ALREADY_RUNNING') {
          return res.status(409).json({
            success: false,
            error: "Reanalysis already in progress",
            jobId: err.existingJob.jobId,
            status: err.existingJob.status,
            retryAfter: 5
          });
        }
        throw err;
      }

      console.log(`[reanalyze.start]`, {
        jobId: job.jobId,
        projectId,
        idempotencyKey: idempotencyKey || null,
        timestamp: new Date().toISOString()
      });

      // Start async processing
      setImmediate(async () => {
        try {
          jobManager.updateJobStatus(job.jobId, 'running');
          jobManager.updateJobProgress(job.jobId, 'hook', 0);

          const scenes = currentVersion.scenes as any || [];
          console.log(`[Reanalyze] Job ${job.jobId} running - analyzing ${scenes.length} scenes`);

          // Run advanced analysis with retry logic
          jobManager.updateJobProgress(job.jobId, 'structure', 20);
          const analysisResult = await jobManager.retryWithBackoff(async () => {
            return await scoreCustomScriptAdvanced(
              apiKey.encryptedKey,
              currentVersion.fullScript,
              'short-form'
            );
          });

          // Per-scene analysis with progress reporting
          jobManager.updateJobProgress(job.jobId, 'emotional', 50);
          const perSceneScores = scenes && Array.isArray(scenes)
            ? await Promise.all(
                scenes.map(async (scene: any, index: number) => {
                  try {
                    const sceneAnalysis = await jobManager.retryWithBackoff(async () => {
                      return await scoreCustomScriptAdvanced(
                        apiKey.encryptedKey,
                        scene.text,
                        'short-form'
                      );
                    });

                    const sceneProgress = 50 + Math.floor((index + 1) / scenes.length * 20);
                    jobManager.updateJobProgress(job.jobId, 'emotional', sceneProgress);

                    return {
                      sceneNumber: scene.sceneNumber,
                      score: sceneAnalysis.overallScore
                    };
                  } catch (err) {
                    console.error(`[Job ${job.jobId}] Scene ${scene.sceneNumber} analysis failed:`, err);
                    return {
                      sceneNumber: scene.sceneNumber,
                      score: 0
                    };
                  }
                })
              )
            : [];

          jobManager.updateJobProgress(job.jobId, 'cta', 70);

          // Build metrics
          jobManager.updateJobProgress(job.jobId, 'synthesis', 80);
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
              viralProbability: (predicted as any).viralProbability || "low"
            },
            perScene: perSceneScores
          };

          const review = `Общая оценка: ${analysisResult.overallScore}/100 (${analysisResult.verdict})

Сильные стороны:
${analysisResult.strengths?.map((s: string) => `• ${s}`).join('\n') || '• Не указано'}

Слабые стороны:
${analysisResult.weaknesses?.map((w: string) => `• ${w}`).join('\n') || '• Не указано'}

Прогноз:
• Удержание: ${metrics.predicted.retention}
• Сохранения: ${metrics.predicted.saves}
• Репосты: ${metrics.predicted.shares}`;

          // Create candidate version
          jobManager.updateJobProgress(job.jobId, 'saving', 90);
          const candidateVersion = await db.transaction(async (tx) => {
            // Remove existing candidate
            const existing = await tx
              .select()
              .from(scriptVersions)
              .where(and(
                eq(scriptVersions.projectId, projectId),
                eq(scriptVersions.isCandidate, true)
              ))
              .limit(1);

            if (existing.length > 0) {
              await tx.delete(scriptVersions).where(eq(scriptVersions.id, existing[0].id));
              await tx.delete(sceneRecommendations).where(eq(sceneRecommendations.scriptVersionId, existing[0].id));
            }

            // Get next version number
            const maxResult = await tx
              .select({ max: sql<number>`COALESCE(MAX(${scriptVersions.versionNumber}), 0)` })
              .from(scriptVersions)
              .where(eq(scriptVersions.projectId, projectId));

            const nextVersion = (maxResult[0]?.max || 0) + 1;

            // Create candidate
            const [candidate] = await tx.insert(scriptVersions).values({
              projectId,
              versionNumber: nextVersion,
              createdBy: 'ai',
              fullScript: currentVersion.fullScript,
              scenes: currentVersion.scenes,
              isCandidate: true,
              isCurrent: false,
              baseVersionId: currentVersion.id,
              parentVersionId: currentVersion.id,
              metrics,
              review,
              analysisResult,
              analysisScore: analysisResult.overallScore
            }).returning();

            return candidate;
          });

          jobManager.updateJobProgress(job.jobId, 'saving', 100);
          jobManager.updateJobStatus(job.jobId, 'done', candidateVersion.id);

          const durationMs = Date.now() - job.startedAt.getTime();
          console.log(`[reanalyze.done]`, {
            jobId: job.jobId,
            projectId,
            candidateVersionId: candidateVersion.id,
            durationMs,
            timestamp: new Date().toISOString()
          });

        } catch (error: any) {
          const errorStatus = error?.status || error?.response?.status;
          const isRateLimit = errorStatus === 429;
          const isServerError = errorStatus >= 500 && errorStatus < 600;

          console.error(`[Reanalyze] Job ${job.jobId} failed:`, {
            errorMessage: error.message,
            errorStatus,
            isRateLimit,
            isServerError,
            errorType: error.constructor?.name
          });

          let userMessage = error.message || 'Ошибка пересчёта';
          if (isRateLimit || isServerError) {
            userMessage = 'Временная ошибка сервиса. Повторите позже или отмените черновик.';
          }

          jobManager.updateJobStatus(job.jobId, 'error', undefined, userMessage);

          const durationMs = Date.now() - job.startedAt.getTime();
          console.log(`[reanalyze.failed]`, {
            jobId: job.jobId,
            projectId,
            errorCode: errorStatus || 'unknown',
            errorMessage: error.message,
            userMessage,
            durationMs,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Return immediately with 202
      res.status(202);
      return apiResponse.ok(res, {
        jobId: job.jobId,
        message: "Reanalysis started"
      });

    } catch (error: any) {
      console.error("[Reanalyze Start] Error:", error);
      return apiResponse.serverError(res, error.message || "Failed to start reanalysis");
    }
  });

  /**
   * GET /api/projects/:id/reanalyze/status
   * Check job status
   */
  app.get("/api/projects/:id/reanalyze/status", requireAuth, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return apiResponse.unauthorized(res);

      const { id: projectId } = req.params;
      const { jobId } = req.query;

      if (!jobId || typeof jobId !== 'string') {
        return apiResponse.badRequest(res, "jobId required");
      }

      // Validate project access
      const project = await storage.getProject(projectId, userId);
      if (!project) return apiResponse.notFound(res, "Project not found");

      const job = jobManager.getJob(jobId);
      if (!job || job.projectId !== projectId) {
        return apiResponse.notFound(res, "Job not found");
      }

      if (job.status === 'done') {
        return apiResponse.ok(res, {
          status: 'done',
          candidateVersionId: job.candidateVersionId
        });
      } else if (job.status === 'error') {
        return apiResponse.ok(res, {
          status: 'error',
          error: job.error || 'Unknown error'
        });
      } else {
        return apiResponse.ok(res, {
          status: job.status // 'pending' | 'running'
        });
      }

    } catch (error: any) {
      console.error("[Reanalyze Status] Error:", error);
      return apiResponse.serverError(res, error.message);
    }
  });
}
